/**
 * Notion API Client
 * HTTP client with authentication, error handling, rate limiting, and pagination support.
 * Provides a consistent interface for all Notion API operations.
 */

import { getCurrentUserId } from '@/lib/server/request-context'
import { resolveNotionKey } from './credentials'

/**
 * Notion API versioning and base configuration
 */
const NOTION_API_VERSION = '2025-09-03'
const NOTION_BASE_URL = 'https://api.notion.com/v1'

/**
 * Rate limiting configuration (3 requests/sec average, 10 requests/sec burst)
 */
interface RateLimitState {
  count: number
  windowStart: number
  lastRequest: number
}

const rateLimitStates = new Map<string, RateLimitState>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const state = rateLimitStates.get(userId) || { count: 0, windowStart: now, lastRequest: 0 }
  
  // Reset window every second
  if (now - state.windowStart >= 1000) {
    state.count = 0
    state.windowStart = now
  }
  
  // Check burst limit (10 requests/sec)
  if (state.count >= 10) {
    return false
  }
  
  // Check average limit (3 requests/sec over time)
  const timeSinceLastRequest = now - state.lastRequest
  if (timeSinceLastRequest < 333 && state.count >= 3) { // 333ms = 1000ms/3 requests
    return false
  }
  
  state.count++
  state.lastRequest = now
  rateLimitStates.set(userId, state)
  
  return true
}

/**
 * Notion API response types
 */
export interface NotionApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  has_more?: boolean
  next_cursor?: string | null
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  start_cursor?: string
  page_size?: number // max 100
}

/**
 * Notion API Client Class
 */
export class NotionClient {
  private apiKey: string
  private userId?: string

  constructor(apiKey: string, userId?: string) {
    this.apiKey = apiKey
    this.userId = userId
  }

  /**
   * Static factory method to create client with user context
   */
  static async createForUser(userId?: string): Promise<NotionClient | null> {
    const apiKey = await resolveNotionKey(userId)
    if (!apiKey) return null
    return new NotionClient(apiKey, userId)
  }

  /**
   * Static factory method to create client for current request user
   */
  static async createForCurrentUser(): Promise<NotionClient | null> {
    const userId = getCurrentUserId()
    return this.createForUser(userId)
  }

  /**
   * Make authenticated request to Notion API
   */
  private async makeRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any,
    options?: { pagination?: boolean }
  ): Promise<NotionApiResponse<T>> {
    const userId = this.userId || 'anonymous'
    
    // Check rate limiting
    if (!checkRateLimit(userId)) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait before making more requests.'
      }
    }

    const url = `${NOTION_BASE_URL}${endpoint}`
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json'
    }

    const config: RequestInit = {
      method,
      headers
    }

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        let errorMessage = `Notion API error: ${response.status} ${response.statusText}`
        
        try {
          const errorData = await response.json()
          if (errorData.message) {
            errorMessage = errorData.message
          }
        } catch {
          // If we can't parse error response, use status text
        }
        
        return {
          success: false,
          error: errorMessage
        }
      }

      const data = await response.json()
      
      // Handle paginated responses
      if (options?.pagination && data.has_more !== undefined) {
        return {
          success: true,
          data: data.results || data,
          has_more: data.has_more,
          next_cursor: data.next_cursor
        }
      }
      
      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }

  /**
   * Generic paginated request handler
   */
  async makePaginatedRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    options?: PaginationOptions
  ): Promise<NotionApiResponse<T[]>> {
    const requestBody = {
      ...body,
      start_cursor: options?.start_cursor,
      page_size: Math.min(options?.page_size || 100, 100)
    }

    const response = await this.makeRequest<any>(
      endpoint,
      method,
      method === 'GET' ? undefined : requestBody,
      { pagination: true }
    )

    if (!response.success) {
      return response
    }

    return {
      success: true,
      data: response.data,
      has_more: response.has_more,
      next_cursor: response.next_cursor
    }
  }

  // =============================================================================
  // USER METHODS
  // =============================================================================

  async getCurrentUser() {
    return this.makeRequest('/users/me')
  }

  async listUsers(pagination?: PaginationOptions) {
    return this.makePaginatedRequest('/users', 'GET', undefined, pagination)
  }

  async getUser(userId: string) {
    return this.makeRequest(`/users/${userId}`)
  }

  // =============================================================================
  // PAGE METHODS
  // =============================================================================

  async getPage(pageId: string) {
    return this.makeRequest(`/pages/${pageId}`)
  }

  async createPage(pageData: any) {
    return this.makeRequest('/pages', 'POST', pageData)
  }

  async updatePage(pageId: string, updates: any) {
    // Accept full update payload (properties, archived, icon, cover, etc.)
    return this.makeRequest(`/pages/${pageId}`, 'PATCH', updates)
  }

  async getPageProperty(pageId: string, propertyId: string, pagination?: PaginationOptions) {
    const endpoint = `/pages/${pageId}/properties/${propertyId}`
    if (pagination) {
      return this.makePaginatedRequest(endpoint, 'GET', undefined, pagination)
    }
    return this.makeRequest(endpoint)
  }

  // =============================================================================
  // DATABASE METHODS
  // =============================================================================

  async getDatabase(databaseId: string) {
    return this.makeRequest(`/databases/${databaseId}`)
  }

  async createDatabase(databaseData: any) {
    return this.makeRequest('/databases', 'POST', databaseData)
  }

  async updateDatabase(databaseId: string, updates: any) {
    return this.makeRequest(`/databases/${databaseId}`, 'PATCH', updates)
  }

  async queryDatabase(databaseId: string, query: any = {}, pagination?: PaginationOptions) {
    const body = {
      ...query,
      start_cursor: pagination?.start_cursor,
      page_size: Math.min(pagination?.page_size || 100, 100)
    }
    return this.makePaginatedRequest(`/databases/${databaseId}/query`, 'POST', body)
  }

  // =============================================================================
  // BLOCK METHODS
  // =============================================================================

  async getBlockChildren(blockId: string, pagination?: PaginationOptions) {
    return this.makePaginatedRequest(`/blocks/${blockId}/children`, 'GET', undefined, pagination)
  }

  async appendBlockChildren(blockId: string, children: any[]) {
    return this.makeRequest(`/blocks/${blockId}/children`, 'PATCH', { children })
  }

  async getBlock(blockId: string) {
    return this.makeRequest(`/blocks/${blockId}`)
  }

  async updateBlock(blockId: string, blockData: any) {
    return this.makeRequest(`/blocks/${blockId}`, 'PATCH', blockData)
  }

  async deleteBlock(blockId: string) {
    return this.makeRequest(`/blocks/${blockId}`, 'DELETE')
  }

  // =============================================================================
  // SEARCH METHODS
  // =============================================================================

  async search(query: any = {}, pagination?: PaginationOptions) {
    const body = {
      ...query,
      start_cursor: pagination?.start_cursor,
      page_size: Math.min(pagination?.page_size || 100, 100)
    }
    return this.makePaginatedRequest('/search', 'POST', body)
  }

  // =============================================================================
  // COMMENT METHODS
  // =============================================================================

  async createComment(pageOrBlockId: string, richText: any[]) {
    return this.makeRequest('/comments', 'POST', {
      parent: { page_id: pageOrBlockId },
      rich_text: richText
    })
  }

  async getComments(pageOrBlockId: string, pagination?: PaginationOptions) {
    const body = {
      parent: { page_id: pageOrBlockId },
      start_cursor: pagination?.start_cursor,
      page_size: Math.min(pagination?.page_size || 100, 100)
    }
    return this.makePaginatedRequest('/comments', 'GET', body)
  }
}

/**
 * Notion Search and User Management Tools
 * Tools for searching content and managing users in Notion workspace
 */

import { tool } from 'ai'
import { z } from 'zod'
import { NotionClient } from '../client'
import { getCurrentUserId } from '@/lib/server/request-context'
import { resolveNotionKey } from '../credentials'

// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

const SearchSchema = z.object({
  query: z.string().min(1).describe('Search query string'),
  filter: z.object({
    value: z.enum(['page', 'database']).describe('Type of object to search for'),
    property: z.literal('object').default('object')
  }).optional().describe('Filter results by object type'),
  sort: z.object({
    direction: z.enum(['ascending', 'descending']).default('descending'),
    timestamp: z.enum(['last_edited_time']).default('last_edited_time')
  }).optional().describe('Sort results by timestamp'),
  start_cursor: z.string().optional().describe('Pagination cursor'),
  page_size: z.number().min(1).max(100).default(100).describe('Number of results per page')
})

const UserIdSchema = z.object({
  user_id: z.string().min(1).describe('Notion user ID')
})

const ListUsersSchema = z.object({
  start_cursor: z.string().optional().describe('Pagination cursor'),
  page_size: z.number().min(1).max(100).default(100).describe('Number of users per page')
})

// =============================================================================
// SEARCH TOOLS
// =============================================================================

/**
 * Tool: Search Notion Workspace
 * Search for pages and databases across the workspace
 */
export const searchNotionWorkspaceTool = tool({
  description: 'Search for pages and databases across the Notion workspace with filtering and sorting options',
  inputSchema: SearchSchema,
  execute: async (params) => {
    try {
      // Use pattern like SerpAPI tools: get userId without strict validation
      const userId = getCurrentUserId()
      const apiKey = await resolveNotionKey(userId)
      if (!apiKey) {
        return {
          success: false,
          error: 'No Notion API key configured. Please add your API key first.'
        }
      }

      const client = new NotionClient(apiKey, userId)

      // Normalize filter: if provided value but missing property, default to 'object'
      const normalizedFilter = params.filter
        ? { property: 'object' as const, value: params.filter.value }
        : undefined

      const searchParams = {
        query: params.query,
        filter: normalizedFilter,
        sort: params.sort,
        start_cursor: params.start_cursor,
        page_size: params.page_size
      }

      const response = await client.search(searchParams)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to search workspace'
        }
      }

      const results = response.data || []
      
      // Organize results by type
      const pages = results.filter((item: any) => item.object === 'page')
      const databases = results.filter((item: any) => item.object === 'database')
      
      // Extract key information for each result
      const processedResults = results.map((item: any) => {
        const baseInfo = {
          id: item.id,
          object: item.object,
          created_time: item.created_time,
          last_edited_time: item.last_edited_time,
          url: item.url
        }

        if (item.object === 'page') {
          return {
            ...baseInfo,
            title: item.properties?.title?.title?.[0]?.plain_text || 'Untitled',
            parent: item.parent,
            archived: item.archived
          }
        } else if (item.object === 'database') {
          return {
            ...baseInfo,
            title: item.title?.[0]?.plain_text || 'Untitled Database',
            description: item.description?.[0]?.plain_text || '',
            properties: Object.keys(item.properties || {}),
            property_count: Object.keys(item.properties || {}).length
          }
        }

        return baseInfo
      })

      return {
        success: true,
        results: processedResults,
        summary: {
          total_results: results.length,
          pages_found: pages.length,
          databases_found: databases.length,
          has_more_pages: response.has_more
        },
        query: params.query,
        filters_applied: params.filter ? [params.filter] : [],
        has_more: response.has_more,
        next_cursor: response.next_cursor
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})

/**
 * Tool: Search Notion Pages Only
 * Search specifically for pages in the workspace
 */
export const searchNotionPagesTool = tool({
  description: 'Search specifically for pages in the Notion workspace',
  inputSchema: z.object({
    query: z.string().min(1).describe('Search query string'),
    start_cursor: z.string().optional().describe('Pagination cursor'),
    page_size: z.number().min(1).max(100).default(50).describe('Number of results per page')
  }),
  execute: async (params) => {
    try {
      // Use pattern like SerpAPI tools: get userId without strict validation
      const userId = getCurrentUserId()
      const apiKey = await resolveNotionKey(userId)
      if (!apiKey) {
        return {
          success: false,
          error: 'No Notion API key configured. Please add your API key first.'
        }
      }

      const client = new NotionClient(apiKey, userId)

      const searchParams = {
        query: params.query,
        filter: {
          value: 'page' as const,
          property: 'object' as const
        },
        start_cursor: params.start_cursor,
        page_size: params.page_size
      }

      const response = await client.search(searchParams)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to search pages'
        }
      }

      const pages = response.data || []
      
      const processedPages = pages.map((page: any) => ({
        id: page.id,
        title: page.properties?.title?.title?.[0]?.plain_text || 'Untitled',
        url: page.url,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
        parent: page.parent,
        archived: page.archived,
        cover: page.cover,
        icon: page.icon
      }))

      return {
        success: true,
        pages: processedPages,
        total_pages: pages.length,
        query: params.query,
        has_more: response.has_more,
        next_cursor: response.next_cursor
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})

/**
 * Tool: Search Notion Databases Only
 * Search specifically for databases in the workspace
 */
export const searchNotionDatabasesTool = tool({
  description: 'Search specifically for databases in the Notion workspace',
  inputSchema: z.object({
    query: z.string().min(1).describe('Search query string'),
    start_cursor: z.string().optional().describe('Pagination cursor'),
    page_size: z.number().min(1).max(100).default(50).describe('Number of results per page')
  }),
  execute: async (params) => {
    try {
      // Use pattern like SerpAPI tools: get userId without strict validation
      const userId = getCurrentUserId()
      const apiKey = await resolveNotionKey(userId)
      if (!apiKey) {
        return {
          success: false,
          error: 'No Notion API key configured. Please add your API key first.'
        }
      }

      const client = new NotionClient(apiKey, userId)

      const searchParams = {
        query: params.query,
        filter: {
          value: 'database' as const,
          property: 'object' as const
        },
        start_cursor: params.start_cursor,
        page_size: params.page_size
      }

      const response = await client.search(searchParams)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to search databases'
        }
      }

      const databases = response.data || []
      
      const processedDatabases = databases.map((db: any) => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled Database',
        description: db.description?.[0]?.plain_text || '',
        url: db.url,
        created_time: db.created_time,
        last_edited_time: db.last_edited_time,
        parent: db.parent,
        archived: db.archived,
        cover: db.cover,
        icon: db.icon,
        properties: Object.keys(db.properties || {}),
        property_count: Object.keys(db.properties || {}).length
      }))

      return {
        success: true,
        databases: processedDatabases,
        total_databases: databases.length,
        query: params.query,
        has_more: response.has_more,
        next_cursor: response.next_cursor
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})

// =============================================================================
// USER MANAGEMENT TOOLS
// =============================================================================

/**
 * Tool: List Workspace Users
 * List all users in the Notion workspace
 */
export const listNotionUsersTool = tool({
  description: 'List all users in the Notion workspace with pagination support',
  inputSchema: ListUsersSchema,
  execute: async (params) => {
    try {
      // Use pattern like SerpAPI tools: get userId without strict validation
      const userId = getCurrentUserId()
      const apiKey = await resolveNotionKey(userId)
      if (!apiKey) {
        return {
          success: false,
          error: 'No Notion API key configured. Please add your API key first.'
        }
      }

      const client = new NotionClient(apiKey, userId)

      const response = await client.listUsers({
        start_cursor: params.start_cursor,
        page_size: params.page_size
      })
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to list users'
        }
      }

      const users = response.data || []
      
      // Process user information
      const processedUsers = users.map((user: any) => {
        const baseInfo = {
          id: user.id,
          type: user.type,
          object: user.object
        }

        if (user.type === 'person') {
          return {
            ...baseInfo,
            name: user.name,
            avatar_url: user.avatar_url,
            email: user.person?.email,
            workspace_member: true
          }
        } else if (user.type === 'bot') {
          return {
            ...baseInfo,
            name: user.name,
            avatar_url: user.avatar_url,
            bot_owner: user.bot?.owner,
            workspace_name: user.bot?.workspace_name
          }
        }

        return baseInfo
      })

      // Group users by type
      const personUsers = processedUsers.filter((user: any) => user.type === 'person')
      const botUsers = processedUsers.filter((user: any) => user.type === 'bot')

      return {
        success: true,
        users: processedUsers,
        summary: {
          total_users: users.length,
          person_users: personUsers.length,
          bot_users: botUsers.length,
          has_more: response.has_more
        },
        has_more: response.has_more,
        next_cursor: response.next_cursor
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})

/**
 * Tool: Get User Information
 * Get detailed information about a specific user
 */
export const getNotionUserTool = tool({
  description: 'Get detailed information about a specific Notion workspace user',
  inputSchema: UserIdSchema,
  execute: async (params) => {
    try {
      // Use pattern like SerpAPI tools: get userId without strict validation
      const userId = getCurrentUserId()
      const apiKey = await resolveNotionKey(userId)
      if (!apiKey) {
        return {
          success: false,
          error: 'No Notion API key configured. Please add your API key first.'
        }
      }

      const client = new NotionClient(apiKey, userId)

      const response = await client.getUser(params.user_id)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to get user information'
        }
      }

      const user = response.data
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      let processedUser: any = {
        id: user.id,
        type: user.type,
        object: user.object,
        name: user.name,
        avatar_url: user.avatar_url
      }

      if (user.type === 'person') {
        processedUser = {
          ...processedUser,
          email: user.person?.email,
          workspace_member: true
        }
      } else if (user.type === 'bot') {
        processedUser = {
          ...processedUser,
          bot_owner: user.bot?.owner,
          workspace_name: user.bot?.workspace_name
        }
      }

      return {
        success: true,
        user: processedUser,
        user_type: user.type
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})

/**
 * Tool: Get Current User (Me)
 * Get information about the current authenticated user
 */
export const getNotionCurrentUserTool = tool({
  description: 'Get information about the current authenticated Notion user',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // Use pattern like SerpAPI tools: get userId without strict validation
      const userId = getCurrentUserId()
      const apiKey = await resolveNotionKey(userId)
      if (!apiKey) {
        return {
          success: false,
          error: 'No Notion API key configured. Please add your API key first.'
        }
      }

      const client = new NotionClient(apiKey, userId)

      const response = await client.getCurrentUser()
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to get current user information'
        }
      }

      const user = response.data
      
      if (!user) {
        return {
          success: false,
          error: 'Current user information not found'
        }
      }

      let processedUser: any = {
        id: user.id,
        type: user.type,
        object: user.object,
        name: user.name,
        avatar_url: user.avatar_url
      }

      if (user.type === 'person') {
        processedUser = {
          ...processedUser,
          email: user.person?.email,
          workspace_member: true
        }
      } else if (user.type === 'bot') {
        processedUser = {
          ...processedUser,
          bot_owner: user.bot?.owner,
          workspace_name: user.bot?.workspace_name
        }
      }

      return {
        success: true,
        user: processedUser,
        user_type: user.type,
        is_current_user: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})

// Export all search and user tools
export const notionSearchAndUserTools = [
  searchNotionWorkspaceTool,
  searchNotionPagesTool,
  searchNotionDatabasesTool,
  listNotionUsersTool,
  getNotionUserTool,
  getNotionCurrentUserTool
]

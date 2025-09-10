/**
 * Notion Page Management Tools
 * Comprehensive tools for creating, reading, updating, and managing Notion pages
 */

import { tool } from 'ai'
import { z } from 'zod'
import { NotionClient } from '../client'
import { getCurrentUserId } from '@/lib/server/request-context'
import { resolveNotionKey } from '../credentials'

// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

const BlockSchema = z.object({
  type: z.string().describe('Block type (e.g., paragraph, heading_1)')
}).catchall(z.any())

const PageIdentifierSchema = z.object({
  page_id: z.string().min(1).describe('Notion page ID (UUID)')
})

const CreatePageSchema = z.object({
  parent_type: z.enum(['page_id', 'database_id']).describe('Parent type'),
  parent_id: z.string().min(1).describe('ID of parent page or database'),
  title: z.string().min(1).describe('Page title'),
  properties: z.record(z.any()).optional().describe('Page properties (for database pages)'),
  content: z.array(BlockSchema).optional().describe('Page content blocks'),
  icon: z.object({
    type: z.enum(['emoji', 'external']),
    emoji: z.string().optional(),
    external: z.object({ url: z.string() }).optional()
  }).optional().describe('Page icon'),
  cover: z.object({
    type: z.enum(['external']),
    external: z.object({ url: z.string() })
  }).optional().describe('Page cover image')
})

const UpdatePageSchema = z.object({
  page_id: z.string().min(1).describe('Page ID to update'),
  properties: z.record(z.any()).optional().describe('Properties to add or update'),
  archived: z.boolean().optional().describe('Whether to archive/unarchive the page'),
  icon: z.object({
    type: z.enum(['emoji', 'external']),
    emoji: z.string().optional(),
    external: z.object({ url: z.string() }).optional()
  }).optional().describe('New page icon'),
  cover: z.object({
    type: z.enum(['external']),
    external: z.object({ url: z.string() })
  }).optional().describe('New page cover image'),
  content: z.array(BlockSchema).optional().describe('New page content blocks to replace existing ones')
})

const PagePropertyIdentifierSchema = z.object({
  page_id: z.string().min(1).describe('Page ID'),
  property_id: z.string().min(1).describe('Property ID to retrieve'),
  start_cursor: z.string().optional().describe('Pagination cursor'),
  page_size: z.number().min(1).max(100).default(100).describe('Number of items per page')
})

// =============================================================================
// PAGE TOOLS
// =============================================================================

/**
 * Tool: Get Page
 * Retrieve a Notion page with all its properties and metadata
 */
export const getNotionPageTool = tool({
  description: 'Retrieve a Notion page with all its properties, metadata, and basic information',
  inputSchema: PageIdentifierSchema,
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
      const response = await client.getPage(params.page_id)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to retrieve page'
        }
      }

      return {
        success: true,
        page: response.data,
        summary: {
          title: response.data?.properties?.title?.title?.[0]?.plain_text || 'Untitled',
          url: response.data?.url,
          created_time: response.data?.created_time,
          last_edited_time: response.data?.last_edited_time,
          archived: response.data?.archived,
          parent_type: response.data?.parent?.type
        }
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
 * Tool: Create Page
 * Create a new Notion page in a parent page or database
 */
export const createNotionPageTool = tool({
  description: 'Create a new Notion page in a parent page or database with title, content, and properties',
  inputSchema: CreatePageSchema,
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

      const pageData: any = {
        parent: {
          [params.parent_type]: params.parent_id
        },
        properties: {
          title: {
            title: [{ text: { content: params.title } }]
          }
        }
      }

      // Add additional properties if provided (for database pages)
      if (params.properties) {
        pageData.properties = { ...pageData.properties, ...params.properties }
      }

      // Add icon if provided
      if (params.icon) {
        pageData.icon = params.icon
      }

      // Add cover if provided
      if (params.cover) {
        pageData.cover = params.cover
      }

      // Add content blocks if provided
      if (params.content && params.content.length > 0) {
        pageData.children = params.content
      }

      const response = await client.createPage(pageData)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to create page'
        }
      }

      return {
        success: true,
        page: response.data,
        page_id: response.data?.id,
        url: response.data?.url,
        message: 'Page created successfully'
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
 * Tool: Update Page
 * Update an existing Notion page's properties, icon, cover, or archive status
 */
export const updateNotionPageTool = tool({
  description: 'Update an existing Notion page properties, icon, cover, or archive status',
  inputSchema: UpdatePageSchema,
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

      // Build update data
      const updateData: any = {}

      // Update properties if provided
      if (params.properties) {
        updateData.properties = params.properties
      }

      // Update icon if provided
      if (params.icon) {
        updateData.icon = params.icon
      }

      // Update cover if provided
      if (params.cover) {
        updateData.cover = params.cover
      }

      // Update archived status if provided
      if (params.archived !== undefined) {
        updateData.archived = params.archived
      }

  // Send the full updateData, not just properties, so archived/icon/cover changes apply
  const response = await client.updatePage(params.page_id, updateData)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to update page'
        }
      }

      return {
        success: true,
        page: response.data,
        message: 'Page updated successfully',
  updated_properties: Object.keys(updateData.properties || {}),
  archived: updateData.archived,
  icon: updateData.icon ? true : undefined,
  cover: updateData.cover ? true : undefined
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
 * Tool: Get Page Property
 * Retrieve a specific property value from a Notion page (useful for large properties)
 */
export const getNotionPagePropertyTool = tool({
  description: 'Retrieve a specific property value from a Notion page, with pagination support for large properties',
  inputSchema: PagePropertyIdentifierSchema,
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

      const pagination = {
        start_cursor: params.start_cursor,
        page_size: params.page_size
      }

      const response = await client.getPageProperty(params.page_id, params.property_id, pagination)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to retrieve page property'
        }
      }

      return {
        success: true,
        property: response.data,
        message: 'Page property retrieved successfully'
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
// EXPORTS
// =============================================================================

export const notionPageTools = [
  getNotionPageTool,
  createNotionPageTool,
  updateNotionPageTool,
  getNotionPagePropertyTool
]
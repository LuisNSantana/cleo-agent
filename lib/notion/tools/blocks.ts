/**
 * Notion Block Management Tools
 * Comprehensive tools for managing page content blocks in Notion
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

const BlockIdentifierSchema = z.object({
  block_id: z.string().min(1).describe('Block ID to retrieve/update/delete')
})

const GetBlockChildrenSchema = z.object({
  block_id: z.string().min(1).describe('Parent block ID'),
  start_cursor: z.string().optional().describe('Pagination cursor'),
  page_size: z.number().min(1).max(100).default(100).describe('Number of children per page')
})

const AppendBlocksSchema = z.object({
  block_id: z.string().min(1).describe('Parent block ID'),
  children: z.array(BlockSchema).min(1).describe('Array of block objects to append')
})

const UpdateBlockSchema = z.object({
  block_id: z.string().min(1).describe('Block ID to update'),
  properties: z.record(z.any()).optional().describe('Block properties to update'),
  archived: z.boolean().optional().describe('Whether to archive the block')
})

const CreateBlockSchema = z.object({
  parent_id: z.string().min(1).describe('Parent page or block ID'),
  block_data: BlockSchema.describe('Block data to create')
})

const AddTextContentSchema = z.object({
  page_id: z.string().min(1).describe('Page ID to add content to'),
  content: z.string().min(1).describe('Text content to add'),
  block_type: z.enum(['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item']).default('paragraph').describe('Type of text block to create')
})

// =============================================================================
// BLOCK TOOLS
// =============================================================================

/**
 * Tool: Get Block Children
 * Retrieve all child blocks of a parent block or page
 */
export const getNotionBlockChildrenTool = tool({
  description: 'Retrieve all child blocks of a parent block or page with pagination support',
  inputSchema: GetBlockChildrenSchema,
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

      const response = await client.getBlockChildren(params.block_id, {
        start_cursor: params.start_cursor,
        page_size: params.page_size
      })
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to retrieve block children'
        }
      }

      return {
        success: true,
        blocks: (response.data as any)?.results || [],
        has_more: (response.data as any)?.has_more || false,
        next_cursor: (response.data as any)?.next_cursor,
        total_blocks: (response.data as any)?.results?.length || 0
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
 * Tool: Append Blocks
 * Append new blocks to a parent block or page
 */
export const appendNotionBlocksTool = tool({
  description: 'Append new blocks to a parent block or page',
  inputSchema: AppendBlocksSchema,
  execute: async (params) => {
    try {
      // Use direct pattern like Skyvern tools for consistent context access
      const userId = getCurrentUserId()
      if (!userId) {
        return {
          success: false,
          error: 'No user context available. Please ensure you are logged in.'
        }
      }

      const apiKey = await resolveNotionKey(userId)
      if (!apiKey) {
        return {
          success: false,
          error: 'No Notion API key configured. Please add your API key first.'
        }
      }

      const client = new NotionClient(apiKey, userId)

      const response = await client.appendBlockChildren(params.block_id, params.children)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to append blocks'
        }
      }

      return {
        success: true,
        blocks: (response.data as any)?.results || [],
        message: 'Blocks appended successfully',
        blocks_added: (response.data as any)?.results?.length || 0
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
 * Tool: Get Block
 * Retrieve a specific block by its ID
 */
export const getNotionBlockTool = tool({
  description: 'Retrieve a specific block by its ID with complete metadata',
  inputSchema: BlockIdentifierSchema,
  execute: async (params) => {
    try {
      // Use direct pattern like Skyvern tools for consistent context access
      const userId = getCurrentUserId()
      if (!userId) {
        return {
          success: false,
          error: 'No user context available. Please ensure you are logged in.'
        }
      }

      const apiKey = await resolveNotionKey(userId)
      if (!apiKey) {
        return {
          success: false,
          error: 'No Notion API key configured. Please add your API key first.'
        }
      }

      const client = new NotionClient(apiKey, userId)

      const response = await client.getBlock(params.block_id)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to retrieve block'
        }
      }

      return {
        success: true,
        block: response.data,
        block_type: response.data?.type,
        has_children: response.data?.has_children || false
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
 * Tool: Update Block
 * Update an existing block's properties or archive status
 */
export const updateNotionBlockTool = tool({
  description: 'Update an existing block properties or archive status',
  inputSchema: UpdateBlockSchema,
  execute: async (params) => {
    try {
      // Use direct pattern like Skyvern tools for consistent context access
      const userId = getCurrentUserId()
      if (!userId) {
        return {
          success: false,
          error: 'No user context available. Please ensure you are logged in.'
        }
      }

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
      
      if (params.properties) {
        Object.assign(updateData, params.properties)
      }
      
      if (params.archived !== undefined) {
        updateData.archived = params.archived
      }

      const response = await client.updateBlock(params.block_id, updateData)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to update block'
        }
      }

      return {
        success: true,
        block: response.data,
        message: 'Block updated successfully'
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
 * Tool: Delete Block
 * Delete (archive) a block
 */
export const deleteNotionBlockTool = tool({
  description: 'Delete (archive) a specific block',
  inputSchema: BlockIdentifierSchema,
  execute: async (params) => {
    try {
      // Use direct pattern like Skyvern tools for consistent context access
      const userId = getCurrentUserId()
      if (!userId) {
        return {
          success: false,
          error: 'No user context available. Please ensure you are logged in.'
        }
      }

      const apiKey = await resolveNotionKey(userId)
      if (!apiKey) {
        return {
          success: false,
          error: 'No Notion API key configured. Please add your API key first.'
        }
      }

      const client = new NotionClient(apiKey, userId)

      const response = await client.deleteBlock(params.block_id)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to delete block'
        }
      }

      return {
        success: true,
        block: response.data,
        message: 'Block deleted (archived) successfully'
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
 * Tool: Create Block
 * Create a new block in a parent page or block
 */
export const createNotionBlockTool = tool({
  description: 'Create a new block in a parent page or block',
  inputSchema: CreateBlockSchema,
  execute: async (params) => {
    try {
      // Use direct pattern like Skyvern tools for consistent context access
      const userId = getCurrentUserId()
      if (!userId) {
        return {
          success: false,
          error: 'No user context available. Please ensure you are logged in.'
        }
      }

      const apiKey = await resolveNotionKey(userId)
      if (!apiKey) {
        return {
          success: false,
          error: 'No Notion API key configured. Please add your API key first.'
        }
      }

      const client = new NotionClient(apiKey, userId)

      const response = await client.appendBlockChildren(params.parent_id, [params.block_data])
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to create block'
        }
      }

      const createdBlock = response.data?.results?.[0]

      return {
        success: true,
        block: createdBlock,
        block_id: createdBlock?.id,
        message: 'Block created successfully'
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
 * Tool: Add Text Content
 * Add simple text content to a page as a specific block type
 */
export const addNotionTextContentTool = tool({
  description: 'Add simple text content to a page as a paragraph, heading, or list item',
  inputSchema: AddTextContentSchema,
  execute: async (params) => {
    try {
      // Use direct pattern like Skyvern tools for consistent context access
      const userId = getCurrentUserId()
      if (!userId) {
        return {
          success: false,
          error: 'No user context available. Please ensure you are logged in.'
        }
      }

      const apiKey = await resolveNotionKey(userId)
      if (!apiKey) {
        return {
          success: false,
          error: 'No Notion API key configured. Please add your API key first.'
        }
      }

      const client = new NotionClient(apiKey, userId)

      // Create block data based on type
      const blockData: any = {
        type: params.block_type,
        [params.block_type as string]: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: params.content
              }
            }
          ]
        }
      }

      const response = await client.appendBlockChildren(params.page_id, [blockData])
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to add text content'
        }
      }

      const createdBlock = response.data?.results?.[0]

      return {
        success: true,
        block: createdBlock,
        block_id: createdBlock?.id,
        block_type: params.block_type,
        content: params.content,
        message: 'Text content added successfully'
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

export const notionBlockTools = [
  getNotionBlockChildrenTool,
  appendNotionBlocksTool,
  getNotionBlockTool,
  updateNotionBlockTool,
  deleteNotionBlockTool,
  createNotionBlockTool,
  addNotionTextContentTool
]
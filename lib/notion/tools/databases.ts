/**
 * Notion Database Management Tools
 * Comprehensive tools for querying, creating, and managing Notion databases
 */

import { tool } from 'ai'
import { z } from 'zod'
import { NotionClient } from '../client'
import { getCurrentUserId } from '@/lib/server/request-context'
import { resolveNotionKey } from '../credentials'

// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

const DatabaseIdentifierSchema = z.object({
  database_id: z.string().min(1).describe('Notion database ID (UUID)')
})

const SortSchema = z.object({
  property: z.string().describe('Property name to sort by'),
  direction: z.enum(['ascending', 'descending']).describe('Sort direction')
})

const BlockSchema = z.object({
  type: z.string().describe('Block type (e.g., paragraph, heading_1)')
}).catchall(z.any())

const QueryDatabaseSchema = z.object({
  database_id: z.string().min(1).describe('Notion database ID to query'),
  // Use a permissive object schema so JSON Schema includes type: 'object'
  // This avoids providers rejecting missing parameter types when tools are bound
  filter: z.object({}).passthrough().optional().describe('Filter object to narrow results'),
  sorts: z.array(SortSchema).optional().describe('Array of sort objects'),
  start_cursor: z.string().optional().describe('Pagination cursor'),
  page_size: z.number().min(1).max(100).default(100).describe('Number of items per page')
})

const CreateDatabaseSchema = z.object({
  parent_type: z.enum(['page_id']).describe('Parent type (databases must be created in pages)'),
  parent_id: z.string().min(1).describe('ID of parent page'),
  title: z.string().min(1).describe('Database title'),
  description: z.string().optional().describe('Database description'),
  properties: z.record(z.any()).describe('Database schema properties'),
  icon: z.object({
    type: z.enum(['emoji', 'external']),
    emoji: z.string().optional(),
    external: z.object({ url: z.string() }).optional()
  }).optional().describe('Database icon'),
  cover: z.object({
    type: z.enum(['external']),
    external: z.object({ url: z.string() })
  }).optional().describe('Database cover image'),
  is_inline: z.boolean().default(false).describe('Whether database appears inline or as full page')
})

const UpdateDatabaseSchema = z.object({
  database_id: z.string().min(1).describe('Database ID to update'),
  title: z.string().optional().describe('New database title'),
  description: z.string().optional().describe('New database description'),
  properties: z.record(z.any()).optional().describe('Properties to add or update'),
  icon: z.object({
    type: z.enum(['emoji', 'external']),
    emoji: z.string().optional(),
    external: z.object({ url: z.string() }).optional()
  }).optional().describe('New database icon'),
  cover: z.object({
    type: z.enum(['external']),
    external: z.object({ url: z.string() })
  }).optional().describe('New database cover image')
})

const CreateDatabaseEntrySchema = z.object({
  database_id: z.string().min(1).describe('Database ID to add entry to'),
  properties: z.record(z.any()).describe('Properties for the new database entry'),
  content: z.array(BlockSchema).optional().describe('Page content blocks for the entry'),
  icon: z.object({
    type: z.enum(['emoji', 'external']),
    emoji: z.string().optional(),
    external: z.object({ url: z.string() }).optional()
  }).optional().describe('Entry icon'),
  cover: z.object({
    type: z.enum(['external']),
    external: z.object({ url: z.string() })
  }).optional().describe('Entry cover image')
})

// =============================================================================
// DATABASE TOOLS
// =============================================================================

/**
 * Tool: Get Database
 * Retrieve database metadata, schema, and properties
 */
export const getNotionDatabaseTool = tool({
  description: 'Retrieve a Notion database with its metadata, schema, and property definitions',
  inputSchema: DatabaseIdentifierSchema,
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

      const response = await client.getDatabase(params.database_id)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to retrieve database'
        }
      }

      // Extract useful summary information
      const database = response.data
      const summary = {
        title: database?.title?.[0]?.plain_text || 'Untitled Database',
        url: database?.url,
        created_time: database?.created_time,
        last_edited_time: database?.last_edited_time,
        archived: database?.archived,
        is_inline: database?.is_inline,
        properties_count: Object.keys(database?.properties || {}).length,
        property_names: Object.keys(database?.properties || {})
      }

      return {
        success: true,
        database: response.data,
        summary,
        schema: database?.properties || {}
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
 * Tool: Query Database
 * Query a database with filters, sorting, and pagination
 */
export const queryNotionDatabaseTool = tool({
  description: 'Query a Notion database with filters, sorting, and pagination to retrieve matching entries',
  inputSchema: QueryDatabaseSchema,
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

      const queryParams: any = {}
      
      if (params.filter) {
        queryParams.filter = params.filter
      }
      
      if (params.sorts) {
        queryParams.sorts = params.sorts
      }

      const pagination = {
        start_cursor: params.start_cursor,
        page_size: params.page_size
      }

      const response = await client.queryDatabase(params.database_id, queryParams, pagination)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to query database'
        }
      }

      const results = response.data || []
      
      return {
        success: true,
        results,
        has_more: response.has_more,
        next_cursor: response.next_cursor,
        summary: {
          total_returned: results.length,
          has_more_pages: response.has_more,
          filter_applied: !!params.filter,
          sorts_applied: !!params.sorts && params.sorts.length > 0
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
 * Tool: Create Database
 * Create a new database with schema and properties
 */
export const createNotionDatabaseTool = tool({
  description: 'Create a new Notion database with custom schema, properties, and configuration',
  inputSchema: CreateDatabaseSchema,
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

      const databaseData: any = {
        parent: {
          [params.parent_type]: params.parent_id
        },
        title: [{ text: { content: params.title } }],
        properties: params.properties,
        is_inline: params.is_inline
      }

      if (params.description) {
        databaseData.description = [{ text: { content: params.description } }]
      }

      if (params.icon) {
        databaseData.icon = params.icon
      }

      if (params.cover) {
        databaseData.cover = params.cover
      }

      const response = await client.createDatabase(databaseData)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to create database'
        }
      }

      return {
        success: true,
        database: response.data,
        database_id: response.data?.id,
        url: response.data?.url,
        message: `Database "${params.title}" created successfully`,
        properties_created: Object.keys(params.properties)
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
 * Tool: Update Database
 * Update database title, description, properties, or styling
 */
export const updateNotionDatabaseTool = tool({
  description: 'Update an existing Notion database title, description, properties, or styling',
  inputSchema: UpdateDatabaseSchema,
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

      const updateData: any = {}

      if (params.title) {
        updateData.title = [{ text: { content: params.title } }]
      }

      if (params.description) {
        updateData.description = [{ text: { content: params.description } }]
      }

      if (params.properties) {
        updateData.properties = params.properties
      }

      if (params.icon) {
        updateData.icon = params.icon
      }

      if (params.cover) {
        updateData.cover = params.cover
      }

      const response = await client.updateDatabase(params.database_id, updateData)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to update database'
        }
      }

      return {
        success: true,
        database: response.data,
        message: 'Database updated successfully',
        updated_fields: Object.keys(updateData)
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
 * Tool: Create Database Entry
 * Create a new entry (page) in a database
 */
export const createNotionDatabaseEntryTool = tool({
  description: 'Create a new entry (page) in a Notion database with specified properties and content',
  inputSchema: CreateDatabaseEntrySchema,
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
          database_id: params.database_id
        },
        properties: params.properties
      }

      if (params.icon) {
        pageData.icon = params.icon
      }

      if (params.cover) {
        pageData.cover = params.cover
      }

      if (params.content && params.content.length > 0) {
        pageData.children = params.content
      }

      const response = await client.createPage(pageData)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to create database entry'
        }
      }

      return {
        success: true,
        entry: response.data,
        page_id: response.data?.id,
        url: response.data?.url,
        message: 'Database entry created successfully',
        properties_set: Object.keys(params.properties)
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
 * Tool: Get Database Schema
 * Get just the schema/properties of a database for reference
 */
export const getNotionDatabaseSchemaTool = tool({
  description: 'Get the schema and property definitions of a Notion database for reference',
  inputSchema: DatabaseIdentifierSchema,
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

      const response = await client.getDatabase(params.database_id)
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to retrieve database schema'
        }
      }

      const database = response.data
      const properties = database?.properties || {}
      
      // Format schema for easy understanding
      const schema = Object.entries(properties).map(([name, prop]: [string, any]) => ({
        name,
        type: prop.type,
        id: prop.id,
        required: false, // Notion doesn't have required fields
        options: prop.select?.options || prop.multi_select?.options || undefined,
        format: prop.number?.format || prop.date?.format || undefined
      }))

      return {
        success: true,
        schema,
        properties,
        summary: {
          database_title: database?.title?.[0]?.plain_text || 'Untitled Database',
          property_count: schema.length,
          property_types: schema.map(p => p.type)
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

// Export all database tools
export const notionDatabaseTools = [
  getNotionDatabaseTool,
  queryNotionDatabaseTool,
  createNotionDatabaseTool,
  updateNotionDatabaseTool,
  createNotionDatabaseEntryTool,
  getNotionDatabaseSchemaTool
]

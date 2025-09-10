/**
 * Notion Tools - Complete Integration
 * 
 * This module provides comprehensive Notion workspace management tools for Cleo Agent.
 * All tools require a valid Notion API key configured through the CredentialsManager.
 * 
 * Available Tool Categories:
 * - Page Management: Create, read, update, archive pages
 * - Database Management: Query, create, update databases and entries  
 * - Block Management: Manipulate page content blocks
 * - Search: Find pages and databases across workspace
 * - User Management: Manage workspace users and permissions
 * 
 * Usage: These tools are automatically registered in the agent system and can be
 * selected when configuring agents in the Agent Control Center.
 */

// Import all tool modules
import { notionPageTools } from './tools/pages'
import { notionDatabaseTools } from './tools/databases'
import { notionBlockTools } from './tools/blocks'
import { notionSearchAndUserTools } from './tools/search-users'

// =============================================================================
// TOOL EXPORTS
// =============================================================================

/**
 * All Notion Page Management Tools
 * Tools for creating, reading, updating, and managing Notion pages
 */
export {
  getNotionPageTool,
  createNotionPageTool,
  updateNotionPageTool,
  getNotionPagePropertyTool,
  notionPageTools
} from './tools/pages'

/**
 * All Notion Database Management Tools
 * Tools for querying, creating, and managing Notion databases
 */
export {
  getNotionDatabaseTool,
  queryNotionDatabaseTool,
  createNotionDatabaseTool,
  updateNotionDatabaseTool,
  getNotionDatabaseSchemaTool,
  createNotionDatabaseEntryTool,
  notionDatabaseTools
} from './tools/databases'

/**
 * All Notion Block Management Tools
 * Tools for manipulating page content blocks
 */
export {
  getNotionBlockChildrenTool,
  appendNotionBlocksTool,
  getNotionBlockTool,
  updateNotionBlockTool,
  deleteNotionBlockTool,
  createNotionBlockTool,
  addNotionTextContentTool,
  notionBlockTools
} from './tools/blocks'

/**
 * All Notion Search and User Management Tools
 * Tools for searching workspace content and managing users
 */
export {
  searchNotionWorkspaceTool,
  searchNotionPagesTool,
  searchNotionDatabasesTool,
  listNotionUsersTool,
  getNotionUserTool,
  getNotionCurrentUserTool,
  notionSearchAndUserTools
} from './tools/search-users'

/**
 * Notion Credential Management
 * Functions for managing Notion API credentials
 */
export {
  addNotionKey,
  listNotionKeys,
  deleteNotionKey,
  getActiveNotionKey,
  testNotionKey,
  resolveNotionKey
} from './credentials'

/**
 * Notion API Client
 * Direct access to the Notion API client class
 */
export { NotionClient } from './client'

// =============================================================================
// CONSOLIDATED TOOL ARRAYS
// =============================================================================

/**
 * All Page-related tools combined
 */
export const allNotionPageTools = notionPageTools

/**
 * All Database-related tools combined
 */
export const allNotionDatabaseTools = notionDatabaseTools

/**
 * All Block-related tools combined
 */
export const allNotionBlockTools = notionBlockTools

/**
 * All Search and User tools combined
 */
export const allNotionSearchUserTools = notionSearchAndUserTools

/**
 * Complete collection of all Notion tools
 * This is the main export for registering all tools at once
 */
export const allNotionTools = [
  ...notionPageTools,
  ...notionDatabaseTools,
  ...notionBlockTools,
  ...notionSearchAndUserTools
]

// =============================================================================
// TOOL METADATA
// =============================================================================

/**
 * Notion Tool Categories for UI organization
 */
export const NotionToolCategories = {
  PAGES: 'notion-pages',
  DATABASES: 'notion-databases', 
  BLOCKS: 'notion-blocks',
  SEARCH: 'notion-search',
  USERS: 'notion-users'
} as const

/**
 * Tool descriptions for agent configuration UI
 */
export const NotionToolDescriptions = {
  // Page Tools
  'get-notion-page': 'Retrieve detailed information about a Notion page including properties and content',
  'create-notion-page': 'Create a new page in Notion with custom properties and content',
  'update-notion-page': 'Update existing page properties and metadata', 
  'archive-notion-page': 'Archive a page (move to trash)',
  'get-notion-page-property': 'Get the value of a specific page property',

  // Database Tools  
  'get-notion-database': 'Retrieve database schema and metadata',
  'query-notion-database': 'Query database entries with advanced filtering and sorting',
  'create-notion-database': 'Create a new database with custom schema',
  'update-notion-database': 'Update database properties and schema',
  'get-notion-database-schema': 'Get the complete schema and property definitions',
  'create-notion-database-entry': 'Add a new entry (page) to a database',

  // Block Tools
  'get-notion-block-children': 'Retrieve all child blocks from a page or block',
  'append-notion-blocks': 'Add new content blocks to a page',
  'get-notion-block': 'Get details of a specific block',
  'update-notion-block': 'Update block content and properties',
  'delete-notion-block': 'Delete/archive a block',
  'create-notion-block': 'Create and append blocks with simplified interface',
  'add-notion-text-content': 'Quick way to add text content to pages',

  // Search Tools
  'search-notion-workspace': 'Search across all pages and databases in workspace',
  'search-notion-pages': 'Search specifically for pages',
  'search-notion-databases': 'Search specifically for databases',

  // User Tools
  'list-notion-users': 'List all users in the workspace',
  'get-notion-user': 'Get detailed information about a specific user',
  'get-notion-current-user': 'Get information about the current authenticated user'
} as const

/**
 * Tool use cases for agent configuration guidance
 */
export const NotionToolUseCases = {
  'Content Creation': [
    'create-notion-page',
    'create-notion-database',
    'append-notion-blocks',
    'add-notion-text-content'
  ],
  'Content Management': [
    'update-notion-page',
    'update-notion-database',
    'update-notion-block',
    'archive-notion-page'
  ],
  'Data Retrieval': [
    'get-notion-page',
    'get-notion-database',
    'query-notion-database',
    'get-notion-block-children'
  ],
  'Search & Discovery': [
    'search-notion-workspace',
    'search-notion-pages', 
    'search-notion-databases'
  ],
  'User Management': [
    'list-notion-users',
    'get-notion-user',
    'get-notion-current-user'
  ],
  'Content Structure': [
    'get-notion-database-schema',
    'get-notion-page-property',
    'create-notion-database-entry'
  ]
} as const

/**
 * Default tool suggestions for common agent types
 */
export const NotionAgentPresets = {
  'Content Writer': [
    'create-notion-page',
    'add-notion-text-content',
    'update-notion-page',
    'search-notion-pages'
  ],
  'Data Manager': [
    'query-notion-database', 
    'create-notion-database-entry',
    'update-notion-database',
    'get-notion-database-schema'
  ],
  'Knowledge Assistant': [
    'search-notion-workspace',
    'get-notion-page',
    'get-notion-block-children',
    'search-notion-databases'
  ],
  'Project Manager': [
    'create-notion-database',
    'create-notion-database-entry',
    'query-notion-database',
    'update-notion-page',
    'list-notion-users'
  ],
  'Content Organizer': [
    'get-notion-database-schema',
    'create-notion-database',
    'update-notion-database',
    'archive-notion-page',
    'append-notion-blocks'
  ]
} as const

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Union type of all tool category names
 */
export type NotionToolCategory = typeof NotionToolCategories[keyof typeof NotionToolCategories]

/**
 * Union type of all tool names
 */
export type NotionToolName = keyof typeof NotionToolDescriptions

/**
 * Union type of all use case categories
 */
export type NotionToolUseCase = keyof typeof NotionToolUseCases

/**
 * Union type of all agent preset names
 */
export type NotionAgentPreset = keyof typeof NotionAgentPresets

/**
 * Tool registration interface for the agent system
 */
export interface NotionToolRegistration {
  name: string
  description: string
  category: NotionToolCategory
  useCases: NotionToolUseCase[]
  tool: any // The actual tool function
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get all tools for a specific category
 */
export function getNotionToolsByCategory(category: NotionToolCategory) {
  switch (category) {
    case NotionToolCategories.PAGES:
      return notionPageTools
    case NotionToolCategories.DATABASES:
      return notionDatabaseTools
    case NotionToolCategories.BLOCKS:
      return notionBlockTools
    case NotionToolCategories.SEARCH:
      return notionSearchAndUserTools.slice(0, 3) // First 3 are search tools
    case NotionToolCategories.USERS:
      return notionSearchAndUserTools.slice(3) // Last 3 are user tools
    default:
      return []
  }
}

/**
 * Get recommended tools for an agent preset
 */
export function getNotionToolsForPreset(preset: NotionAgentPreset) {
  const toolNames = NotionAgentPresets[preset] || []
  // Note: Tool filtering by name would need to be implemented based on 
  // specific tool registry structure in the agent system
  return allNotionTools // Return all tools for now, filtering can be added later
}

/**
 * Get tools by use case
 */
export function getNotionToolsByUseCase(useCase: NotionToolUseCase) {
  const toolNames = NotionToolUseCases[useCase] || []
  // Note: Tool filtering by name would need to be implemented based on 
  // specific tool registry structure in the agent system
  return allNotionTools // Return all tools for now, filtering can be added later
}

/**
 * Check if Notion credentials are available
 */
export async function hasNotionCredentials(): Promise<boolean> {
  try {
    const { getActiveNotionKey } = await import('./credentials')
    const activeKey = await getActiveNotionKey('default')
    return !!activeKey
  } catch {
    return false
  }
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Default export provides the complete Notion integration
 */
export default {
  tools: allNotionTools,
  categories: NotionToolCategories,
  descriptions: NotionToolDescriptions,
  useCases: NotionToolUseCases,
  presets: NotionAgentPresets,
  hasCredentials: hasNotionCredentials
}

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent as SheetContent, DrawerHeader as SheetHeader, DrawerTitle as SheetTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  BrainIcon,
  RobotIcon,
  CopyIcon,
  XIcon
} from '@phosphor-icons/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AgentConfig, AgentRole } from '@/lib/agents/types'
import Image from 'next/image'
import { Markdown } from '@/components/prompt-kit/markdown'
import { useModel } from '@/lib/model-store/provider'
import { useClientAgentStore } from '@/lib/agents/client-store'

// Tool information for the agent details modal
interface ToolInfo {
  name: string
  description: string
  category: string
  useCases: string[]
  icon?: string
}

const TOOL_REGISTRY: Record<string, ToolInfo> = {
  // Web & Search Tools
  'webSearch': {
    name: 'Web Search',
    description: 'Search the internet for current information and resources',
    category: 'Web & Search',
    useCases: ['Market research', 'Latest news', 'Technical documentation', 'Industry trends'],
    icon: '/icons/internet.png'
  },
  'serpGeneralSearch': {
    name: 'SerpAPI General Search',
    description: 'Google search with structured results using SerpAPI',
    category: 'Web & Search',
    useCases: ['Comprehensive web research', 'Real-time information', 'Competitive analysis'],
    icon: '/img/google-icon.png'
  },
  'serpNewsSearch': {
    name: 'SerpAPI News Search',
    description: 'Google News search for recent articles and breaking news',
    category: 'Web & Search',
    useCases: ['Breaking news monitoring', 'Current events research', 'Media analysis'],
    icon: '/img/google-icon.png'
  },
  'serpScholarSearch': {
    name: 'SerpAPI Scholar Search',
    description: 'Google Scholar search for academic papers and citations',
    category: 'Web & Search',
    useCases: ['Academic research', 'Scientific literature review', 'Citation tracking'],
    icon: '/img/google-icon.png'
  },
  'serpAutocomplete': {
    name: 'SerpAPI Autocomplete',
    description: 'Google search autocomplete suggestions for query expansion',
    category: 'Web & Search',
    useCases: ['Query optimization', 'Search suggestion generation', 'Topic exploration'],
    icon: '/img/google-icon.png'
  },
  'serpLocationSearch': {
    name: 'SerpAPI Location Search',
    description: 'Google Maps location and local business search',
    category: 'Web & Search',
    useCases: ['Local business research', 'Geographic information', 'Location-based analysis'],
    icon: '/img/google-icon.png'
  },
  'serpRaw': {
    name: 'SerpAPI Raw Search',
    description: 'Raw SerpAPI search with custom parameters for advanced queries',
    category: 'Web & Search',
    useCases: ['Custom search configurations', 'Advanced query parameters', 'Specialized research'],
    icon: '/img/google-icon.png'
  },

  // Google Workspace Tools
  'listCalendarEvents': {
    name: 'Calendar Events',
    description: 'List and view Google Calendar events',
    category: 'Google Workspace',
  useCases: ['Schedule management', 'Meeting planning', 'Event tracking'],
  icon: '/icons/google-calendar.svg'
  },
  'createCalendarEvent': {
    name: 'Create Calendar Event',
    description: 'Create new events in Google Calendar',
    category: 'Google Workspace',
  useCases: ['Meeting scheduling', 'Reminder creation', 'Event planning'],
  icon: '/icons/google-calendar.svg'
  },
  'listDriveFiles': {
    name: 'Drive File List',
    description: 'List files and folders in Google Drive',
    category: 'Google Workspace',
  useCases: ['File organization', 'Document discovery', 'Asset management'],
  icon: '/icons/google-drive.svg'
  },
  'searchDriveFiles': {
    name: 'Drive File Search',
    description: 'Search for specific files in Google Drive',
    category: 'Google Workspace',
  useCases: ['Document retrieval', 'Content search', 'File location'],
  icon: '/icons/google-drive.svg'
  },
  'getDriveFileDetails': {
    name: 'Drive File Details',
    description: 'Get detailed information about Drive files',
    category: 'Google Workspace',
  useCases: ['File analysis', 'Metadata review', 'Version tracking'],
  icon: '/icons/google-drive.svg'
  },
  'createGoogleDoc': {
    name: 'Create Google Doc',
    description: 'Create new Google Documents with content and formatting',
    category: 'Google Workspace',
  useCases: ['Document creation', 'Report generation', 'Content writing', 'Collaborative documents'],
  icon: '/icons/google_docs.png'
  },
  'readGoogleDoc': {
    name: 'Read Google Doc',
    description: 'Extract content and metadata from Google Documents',
    category: 'Google Workspace',
  useCases: ['Content analysis', 'Document review', 'Text extraction', 'Information retrieval'],
  icon: '/icons/google_docs.png'
  },
  'updateGoogleDoc': {
    name: 'Update Google Doc',
    description: 'Edit and update existing Google Documents',
    category: 'Google Workspace',
  useCases: ['Document editing', 'Content updates', 'Collaborative writing', 'Report updates'],
  icon: '/icons/google_docs.png'
  },
  'createGoogleSheet': {
    name: 'Create Google Sheet',
    description: 'Create new Google Spreadsheets with data and formatting',
    category: 'Google Workspace',
  useCases: ['Data organization', 'Report creation', 'Financial tracking', 'Collaborative analysis'],
  icon: '/icons/sheets.png'
  },
  'readGoogleSheet': {
    name: 'Read Google Sheet',
    description: 'Extract data and metadata from Google Spreadsheets',
    category: 'Google Workspace',
  useCases: ['Data analysis', 'Report generation', 'Information retrieval', 'Spreadsheet review'],
  icon: '/icons/sheets.png'
  },
  'updateGoogleSheet': {
    name: 'Update Google Sheet',
    description: 'Edit and update existing Google Spreadsheets',
    category: 'Google Workspace',
  useCases: ['Data entry', 'Spreadsheet updates', 'Information management', 'Report updates'],
  icon: '/icons/sheets.png'
  },
  'appendGoogleSheet': {
    name: 'Append Google Sheet',
    description: 'Add new rows of data to Google Spreadsheets',
    category: 'Google Workspace',
  useCases: ['Data collection', 'Log management', 'Progressive data entry', 'Record keeping'],
  icon: '/icons/sheets.png'
  },
  'listGmailMessages': {
    name: 'Gmail Messages',
    description: 'List and filter Gmail messages',
    category: 'Google Workspace',
  useCases: ['Email management', 'Communication tracking', 'Inbox organization'],
  icon: '/icons/gmail-icon.svg'
  },
  'getGmailMessage': {
    name: 'Gmail Message Details',
    description: 'Get detailed Gmail message information',
    category: 'Google Workspace',
  useCases: ['Email analysis', 'Content review', 'Message tracking'],
  icon: '/icons/gmail-icon.svg'
  },
  'sendGmailMessage': {
    name: 'Send Gmail',
    description: 'Send email messages through Gmail',
    category: 'Google Workspace',
  useCases: ['Email communication', 'Automated responses', 'Notifications'],
  icon: '/icons/gmail-icon.svg'
  },

  // Google Slides Tools
  'createGoogleSlidesPresentation': {
    name: 'Create Google Slides',
    description: 'Create new Google Slides presentations with title and initial content',
    category: 'Google Workspace',
    useCases: ['Presentation creation', 'Report slides', 'Business presentations', 'Educational content'],
    icon: '/icons/slides.png'
  },
  'addGoogleSlide': {
    name: 'Add Slide',
    description: 'Add new slides to existing Google Slides presentations',
    category: 'Google Workspace',
    useCases: ['Presentation building', 'Content expansion', 'Slide templates', 'Layout creation'],
    icon: '/icons/slides.png'
  },
  'insertGoogleSlideTextBox': {
    name: 'Insert Text Box',
    description: 'Insert text boxes with content into Google Slides',
    category: 'Google Workspace',
    useCases: ['Content addition', 'Text formatting', 'Information display', 'Slide annotation'],
    icon: '/icons/slides.png'
  },
  'appendBulletedSlide': {
    name: 'Create Bulleted Slide',
    description: 'Create slides with bulleted lists and structured content',
    category: 'Google Workspace',
    useCases: ['Structured presentations', 'List creation', 'Summary slides', 'Key points display'],
    icon: '/icons/slides.png'
  },
  'readGoogleSlidesPresentation': {
    name: 'Read Slides Presentation',
    description: 'Get metadata and structure from Google Slides presentations',
    category: 'Google Workspace',
    useCases: ['Content analysis', 'Presentation review', 'Slide counting', 'Structure analysis'],
    icon: '/icons/slides.png'
  },
  'replaceGoogleSlidesText': {
    name: 'Replace Slides Text',
    description: 'Replace text content across Google Slides presentations',
    category: 'Google Workspace',
    useCases: ['Content updates', 'Bulk text changes', 'Template customization', 'Brand updates'],
    icon: '/icons/slides.png'
  },

  // Shopify E-commerce Tools
  'shopifyGetProducts': {
    name: 'Shopify Products',
    description: 'Retrieve product listings and details from Shopify stores',
    category: 'E-commerce',
  useCases: ['Inventory management', 'Product analysis', 'Catalog review', 'Price monitoring'],
  icon: '/icons/shopify.png'
  },
  'shopifyGetOrders': {
    name: 'Shopify Orders',
    description: 'Access order data and transaction history',
    category: 'E-commerce',
  useCases: ['Sales tracking', 'Order fulfillment', 'Revenue analysis', 'Customer orders'],
  icon: '/icons/shopify.png'
  },
  'shopifyGetAnalytics': {
    name: 'Shopify Analytics',
    description: 'Generate business insights and performance metrics',
    category: 'E-commerce',
  useCases: ['Sales reporting', 'Performance analysis', 'Business intelligence', 'Growth metrics'],
  icon: '/icons/shopify.png'
  },
  'shopifyGetCustomers': {
    name: 'Shopify Customers',
    description: 'Manage customer data and profiles',
    category: 'E-commerce',
  useCases: ['Customer management', 'CRM integration', 'User analytics', 'Support assistance'],
  icon: '/icons/shopify.png'
  },
  'shopifySearchProducts': {
    name: 'Product Search',
    description: 'Search and filter products within Shopify stores',
    category: 'E-commerce',
  useCases: ['Product discovery', 'Inventory search', 'Catalog filtering', 'Stock checking'],
  icon: '/icons/shopify.png'
  },

  // Emma's specialized tools
  'shopify_admin': {
    name: 'Shopify Admin',
    description: 'Complete Shopify store administration and management',
    category: 'E-commerce',
    useCases: ['Store configuration', 'Admin operations', 'Bulk operations', 'Store maintenance'],
    icon: '/icons/shopify.png'
  },
  'analytics_tracking': {
    name: 'Analytics Tracking',
    description: 'Track and analyze e-commerce metrics and performance',
    category: 'Analytics',
    useCases: ['Sales tracking', 'Performance monitoring', 'KPI analysis', 'Business intelligence'],
    icon: '/icons/metrics.png'
  },
  'inventory_management': {
    name: 'Inventory Management',
    description: 'Manage stock levels, inventory tracking, and product availability',
    category: 'E-commerce',
    useCases: ['Stock control', 'Inventory tracking', 'Reorder management', 'Supply chain'],
    icon: '/icons/shopify.png'
  },
  'customer_insights': {
    name: 'Customer Insights',
    description: 'Analyze customer behavior, preferences, and purchase patterns',
    category: 'Analytics',
    useCases: ['Customer analysis', 'Behavior tracking', 'Segmentation', 'Personalization'],
    icon: '/icons/metrics.png'
  },

  // Notion Workspace Tools
  'get-notion-page': {
    name: 'Get Notion Page',
    description: 'Retrieve detailed information about a Notion page including properties and content',
    category: 'Notion',
    useCases: ['Content retrieval', 'Page analysis', 'Data extraction', 'Information gathering'],
    icon: '/icons/notion.png'
  },
  'create-notion-page': {
    name: 'Create Notion Page',
    description: 'Create a new page in Notion with custom properties and content',
    category: 'Notion',
    useCases: ['Content creation', 'Documentation', 'Note taking', 'Project pages'],
    icon: '/icons/notion.png'
  },
  'update-notion-page': {
    name: 'Update Notion Page',
    description: 'Update existing page properties and metadata',
    category: 'Notion',
    useCases: ['Content editing', 'Property updates', 'Page maintenance', 'Status changes'],
    icon: '/icons/notion.png'
  },
  'archive-notion-page': {
    name: 'Archive Notion Page',
    description: 'Archive a page (move to trash)',
    category: 'Notion',
    useCases: ['Content management', 'Page cleanup', 'Archive organization', 'Workspace maintenance'],
    icon: '/icons/notion.png'
  },
  'get-notion-page-property': {
    name: 'Get Notion Page Property',
    description: 'Get the value of a specific page property',
    category: 'Notion',
    useCases: ['Property retrieval', 'Data extraction', 'Status checking', 'Field analysis'],
    icon: '/icons/notion.png'
  },
  'get-notion-database': {
    name: 'Get Notion Database',
    description: 'Retrieve database schema and metadata',
    category: 'Notion',
    useCases: ['Database analysis', 'Schema review', 'Structure understanding', 'Property mapping'],
    icon: '/icons/notion.png'
  },
  'query-notion-database': {
    name: 'Query Notion Database',
    description: 'Query database entries with advanced filtering and sorting',
    category: 'Notion',
    useCases: ['Data retrieval', 'Database queries', 'Filtered searches', 'Report generation'],
    icon: '/icons/notion.png'
  },
  'create-notion-database': {
    name: 'Create Notion Database',
    description: 'Create a new database with custom schema',
    category: 'Notion',
    useCases: ['Database creation', 'Data organization', 'Project tracking', 'CRM setup'],
    icon: '/icons/notion.png'
  },
  'update-notion-database': {
    name: 'Update Notion Database',
    description: 'Update database properties and schema',
    category: 'Notion',
    useCases: ['Schema updates', 'Property management', 'Database maintenance', 'Structure changes'],
    icon: '/icons/notion.png'
  },
  'get-notion-database-schema': {
    name: 'Get Notion Database Schema',
    description: 'Get the complete schema and property definitions',
    category: 'Notion',
    useCases: ['Schema analysis', 'Property review', 'Database understanding', 'Field mapping'],
    icon: '/icons/notion.png'
  },
  'create-notion-database-entry': {
    name: 'Create Notion Database Entry',
    description: 'Add a new entry (page) to a database',
    category: 'Notion',
    useCases: ['Data entry', 'Record creation', 'Database population', 'Content addition'],
    icon: '/icons/notion.png'
  },
  'get-notion-block-children': {
    name: 'Get Notion Block Children',
    description: 'Retrieve all child blocks from a page or block',
    category: 'Notion',
    useCases: ['Content analysis', 'Block retrieval', 'Page structure', 'Content extraction'],
    icon: '/icons/notion.png'
  },
  'append-notion-blocks': {
    name: 'Append Notion Blocks',
    description: 'Add new content blocks to a page',
    category: 'Notion',
    useCases: ['Content addition', 'Page building', 'Block insertion', 'Content expansion'],
    icon: '/icons/notion.png'
  },
  'get-notion-block': {
    name: 'Get Notion Block',
    description: 'Get details of a specific block',
    category: 'Notion',
    useCases: ['Block analysis', 'Content inspection', 'Block properties', 'Content review'],
    icon: '/icons/notion.png'
  },
  'update-notion-block': {
    name: 'Update Notion Block',
    description: 'Update block content and properties',
    category: 'Notion',
    useCases: ['Content editing', 'Block updates', 'Text changes', 'Content maintenance'],
    icon: '/icons/notion.png'
  },
  'delete-notion-block': {
    name: 'Delete Notion Block',
    description: 'Delete/archive a block',
    category: 'Notion',
    useCases: ['Content removal', 'Block cleanup', 'Content organization', 'Page maintenance'],
    icon: '/icons/notion.png'
  },
  'create-notion-block': {
    name: 'Create Notion Block',
    description: 'Create and append blocks with simplified interface',
    category: 'Notion',
    useCases: ['Content creation', 'Block addition', 'Page building', 'Content structuring'],
    icon: '/icons/notion.png'
  },
  'add-notion-text-content': {
    name: 'Add Notion Text Content',
    description: 'Quick way to add text content to pages',
    category: 'Notion',
    useCases: ['Text addition', 'Quick notes', 'Content writing', 'Simple editing'],
    icon: '/icons/notion.png'
  },
  'search-notion-workspace': {
    name: 'Search Notion Workspace',
    description: 'Search across all pages and databases in workspace',
    category: 'Notion',
    useCases: ['Content search', 'Information finding', 'Workspace exploration', 'Data discovery'],
    icon: '/icons/notion.png'
  },
  'search-notion-pages': {
    name: 'Search Notion Pages',
    description: 'Search specifically for pages',
    category: 'Notion',
    useCases: ['Page search', 'Document finding', 'Content discovery', 'Page exploration'],
    icon: '/icons/notion.png'
  },
  'search-notion-databases': {
    name: 'Search Notion Databases',
    description: 'Search specifically for databases',
    category: 'Notion',
    useCases: ['Database search', 'Data source finding', 'Database discovery', 'Schema exploration'],
    icon: '/icons/notion.png'
  },
  'list-notion-users': {
    name: 'List Notion Users',
    description: 'List all users in the workspace',
    category: 'Notion',
    useCases: ['User management', 'Team overview', 'Access control', 'Workspace administration'],
    icon: '/icons/notion.png'
  },
  'get-notion-user': {
    name: 'Get Notion User',
    description: 'Get detailed information about a specific user',
    category: 'Notion',
    useCases: ['User details', 'Profile information', 'User analysis', 'Contact information'],
    icon: '/icons/notion.png'
  },
  'get-notion-current-user': {
    name: 'Get Notion Current User',
    description: 'Get information about the current authenticated user',
    category: 'Notion',
    useCases: ['Profile check', 'Authentication status', 'User verification', 'Account information'],
    icon: '/icons/notion.png'
  },

  // Document & Content Tools
  'createDocument': {
    name: 'Create Document',
    description: 'Generate new documents and content',
    category: 'Content Creation',
  useCases: ['Report generation', 'Content creation', 'Documentation', 'Template building'],
  icon: '/icons/docs.png'
  },
  'openDocument': {
    name: 'Open Document',
    description: 'Access and read existing documents',
    category: 'Content Management',
  useCases: ['Document review', 'Content analysis', 'File access', 'Information retrieval'],
  icon: '/icons/docs.png'
  },

  // Memory & AI Tools
  'memoryAddNote': {
    name: 'Add Memory Note',
    description: 'Store important information for future reference',
    category: 'AI Memory',
  useCases: ['Information retention', 'Context preservation', 'Knowledge base', 'Personal notes'],
  icon: '/icons/notes.png'
  },
  'analyze_emotion': {
    name: 'Emotion Analysis',
    description: 'Analyze emotional context and sentiment',
    category: 'AI Intelligence',
  useCases: ['Sentiment analysis', 'Mood detection', 'Emotional support', 'Communication insights'],
  icon: '/icons/analyze_emotional.png'
  },
  'provide_support': {
    name: 'Emotional Support',
    description: 'Provide empathetic responses and emotional assistance',
    category: 'AI Intelligence',
  useCases: ['Mental wellness', 'Empathetic communication', 'Support conversations', 'Care assistance'],
  icon: '/icons/emotional_support.png'
  },

  // Delegation Tools
  'delegate_to_toby': {
    name: 'Delegate to Toby',
    description: 'Assign technical and research tasks to Toby specialist',
    category: 'Task Delegation',
  useCases: ['Technical analysis', 'Data research', 'Information processing', 'Expert consultation'],
  icon: '/img/agents/toby4.png'
  },
  'delegate_to_ami': {
    name: 'Delegate to Ami',
    description: 'Assign executive assistant and Notion workspace organization tasks to Ami specialist',
    category: 'Task Delegation',
    useCases: ['Calendar management', 'Research tasks', 'Note-taking', 'Notion organization', 'Client management'],
    icon: '/img/agents/ami4.png'
  },
  'delegate_to_peter': {
    name: 'Delegate to Peter',
    description: 'Assign Google Workspace and document management tasks to Peter specialist',
    category: 'Task Delegation',
    useCases: ['Google Docs creation', 'Spreadsheet management', 'Drive organization', 'Calendar coordination'],
    icon: '/img/agents/peter4.png'
  },
  'delegate_to_emma': {
    name: 'Delegate to Emma',
    description: 'Assign e-commerce and business tasks to Emma specialist',
    category: 'Task Delegation',
  useCases: ['E-commerce management', 'Sales analysis', 'Business operations', 'Store management'],
  icon: '/img/agents/emma4.png'
  },
  'delegate_to_apu': {
    name: 'Delegate to Apu',
    description: 'Assign research and intelligence tasks to Apu specialist',
    category: 'Task Delegation',
    useCases: ['Web research', 'Market analysis', 'News synthesis', 'Competitive intelligence'],
    icon: '/img/agents/apu4.png'
  },
  'delegate_to_wex': {
    name: 'Delegate to Wex',
    description: 'Delegate web automation tasks to Wex for browser-based operations and workflows',
    category: 'Task Delegation',
    useCases: ['Web scraping', 'Form filling', 'Browser automation', 'Workflow automation', 'Data extraction'],
    icon: '/img/agents/wex4.png'
  },
  'complete_task': {
    name: 'Complete Task',
    description: 'Mark task as complete and return to coordinator',
    category: 'Task Management',
    useCases: ['Task completion', 'Workflow management', 'Process control', 'Status updates'],
    icon: '/icons/completion_task.png'
  },

  // Basic utility tools
  'getCurrentDateTime': {
    name: 'Current Date & Time',
    description: 'Get current date, time, and timezone information',
    category: 'Utilities',
    useCases: ['Time tracking', 'Scheduling', 'Timestamps', 'Date calculations'],
    icon: '/icons/date_time.png'
  },
  'weatherInfo': {
    name: 'Weather Information',
    description: 'Get current weather conditions and forecasts',
    category: 'Information',
    useCases: ['Weather reports', 'Planning assistance', 'Travel planning', 'Event planning'],
    icon: '/icons/weather.png'
  },
  'randomFact': {
    name: 'Random Facts',
    description: 'Generate interesting random facts and trivia',
    category: 'Entertainment',
    useCases: ['Conversation starters', 'Learning', 'Entertainment', 'Trivia'],
    icon: '/icons/randomFact.png'
  },
  'cryptoPrices': {
    name: 'Cryptocurrency Prices',
    description: 'Get real-time cryptocurrency prices and market data',
    category: 'Financial',
    useCases: ['Investment tracking', 'Market analysis', 'Price monitoring', 'Trading decisions'],
    icon: '/icons/cryptocurrency.png'
  },

  // Skyvern Automation Tools (for Wex)
  'add_skyvern_credentials': {
    name: 'Add Skyvern Credentials',
    description: 'Configure Skyvern API credentials for web automation',
    category: 'Automation',
    useCases: ['Setup automation', 'Credential management', 'API configuration', 'Initial setup'],
    icon: '/icons/web_scrapping.png'
  },
  'test_skyvern_connection': {
    name: 'Test Skyvern Connection',
    description: 'Verify Skyvern API connection and credentials',
    category: 'Automation',
    useCases: ['Connection testing', 'API validation', 'Troubleshooting', 'Setup verification'],
    icon: '/icons/web_scrapping.png'
  },
  'create_skyvern_task': {
    name: 'Create Skyvern Task',
    description: 'Create automated browser tasks for web interactions',
    category: 'Automation',
    useCases: ['Web automation', 'Form filling', 'Data extraction', 'Browser workflows'],
    icon: '/icons/web_scrapping.png'
  },
  'get_skyvern_task': {
    name: 'Get Skyvern Task',
    description: 'Retrieve status and results of automation tasks',
    category: 'Automation',
    useCases: ['Task monitoring', 'Result retrieval', 'Status checking', 'Progress tracking'],
    icon: '/icons/web_scrapping.png'
  },
  'take_skyvern_screenshot': {
    name: 'Take Skyvern Screenshot',
    description: 'Capture screenshots during web automation',
    category: 'Automation',
    useCases: ['Visual debugging', 'Process monitoring', 'Documentation', 'Error analysis'],
    icon: '/icons/web_scrapping.png'
  },
  'list_skyvern_tasks': {
    name: 'List Skyvern Tasks',
    description: 'View all automation tasks and their status',
    category: 'Automation',
    useCases: ['Task management', 'History review', 'Bulk monitoring', 'Task overview'],
    icon: '/icons/web_scrapping.png'
  },

  // Notion Credential Tools
  // (Notion credential helper tools intentionally excluded from selectable tools)
}

interface AgentCRUDPanelProps {
  agents: AgentConfig[]
  onCreateAgent: (agent: Partial<AgentConfig>) => void
  onUpdateAgent: (id: string, agent: Partial<AgentConfig>) => void
  onDeleteAgent: (id: string) => void
}

// Function to generate delegation tools for Cleo based on available agents
const generateDelegationTools = (agents: AgentConfig[]) => {
  const baseDelegationTools = ['analyze_emotion', 'provide_support']
  const dynamicDelegationTools = agents
    .filter(agent => agent.id !== 'cleo-supervisor' && agent.role === 'specialist')
    .map(agent => `delegate_to_${agent.name.toLowerCase()}`)
  
  return [...baseDelegationTools, ...dynamicDelegationTools]
}

// Function to update Cleo's delegation capabilities
const updateCleoWithNewAgent = async (newAgentName: string, agents: AgentConfig[]) => {
  const cleoAgent = agents.find(agent => agent.id === 'cleo-supervisor')
  if (!cleoAgent) return

  // Generate updated tools list
  const updatedTools = generateDelegationTools([...agents, { name: newAgentName, role: 'specialist' } as AgentConfig])
  
  // Update Cleo's prompt to include the new agent
  const currentPrompt = cleoAgent.prompt || ''
  const newAgentLine = `- **${newAgentName}**: Custom specialist agent (trigger with: "${newAgentName.toLowerCase()}", "custom", "specialized")`
  
  // Find the delegation section and add the new agent
  const updatedPrompt = currentPrompt.includes('**Your Specialized Sub-Agents:**') 
    ? currentPrompt.replace(
        /(\*\*Your Specialized Sub-Agents:\*\*[\s\S]*?)(\n\n\*\*Delegation Guidelines:\*\*)/,
        `$1\n${newAgentLine}$2`
      )
    : currentPrompt + `\n\n**New Agent Added:**\n${newAgentLine}`

  return {
    tools: updatedTools,
    prompt: updatedPrompt
  }
}

// Stable, top-level AgentForm to avoid remount on every parent render
interface AgentFormProps {
  isEdit?: boolean
  formData: any
  handleInputChange: (field: string, value: any) => void
  handleTextInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  isComposingRef: React.MutableRefObject<boolean>
  tagInput: string
  setTagInput: React.Dispatch<React.SetStateAction<string>>
  addTag: (t: string) => void
  removeTag: (t: string) => void
  handleTagKeyDown: React.KeyboardEventHandler<HTMLInputElement>
  models: { id: string; name?: string }[]
  activeTab: string
  setActiveTab: (v: string) => void
  parentCandidates: any[]
  agents: AgentConfig[]
  isUUID: (v: string | undefined | null) => boolean
  editingAgent: AgentConfig | null
  toolSearch: string
  setToolSearch: React.Dispatch<React.SetStateAction<string>>
  toolCategory: string
  setToolCategory: React.Dispatch<React.SetStateAction<string>>
  allCategories: string[]
  filteredTools: Array<[string, ToolInfo]>
  isDesktop: boolean
}

const AgentForm: React.FC<AgentFormProps> = ({
  isEdit = false,
  formData,
  handleInputChange,
  handleTextInputChange,
  isComposingRef,
  tagInput,
  setTagInput,
  addTag,
  removeTag,
  handleTagKeyDown,
  models,
  activeTab,
  setActiveTab,
  parentCandidates,
  agents,
  isUUID,
  editingAgent,
  toolSearch,
  setToolSearch,
  toolCategory,
  setToolCategory,
  allCategories,
  filteredTools,
  isDesktop,
}) => {
  const [promptView, setPromptView] = React.useState<'edit' | 'preview'>('edit')
  // Mobile-focused UI toggles
  const [showRoleHelp, setShowRoleHelp] = React.useState(false)
  const [showParentHelp, setShowParentHelp] = React.useState(false)
  const [showPreview, setShowPreview] = React.useState(true)
  // Deduplicate models by id to avoid duplicate keys in Select
  const uniqueModels = React.useMemo(() => {
    const seen = new Set<string>()
    const out: { id: string; name?: string }[] = []
    for (const m of models || []) {
      const id = String(m?.id ?? '').trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push({ id, name: m?.name })
    }
    return out
  }, [models])
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="sticky top-0 z-20 flex w-full overflow-x-auto no-scrollbar gap-2 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/70 px-2 py-1 border-b border-slate-700">
        <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm px-3 py-2 flex-shrink-0" value="basic">Basic</TabsTrigger>
        <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm px-3 py-2 flex-shrink-0" value="tools">Tools</TabsTrigger>
        <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm px-3 py-2 flex-shrink-0" value="prompt">Prompt</TabsTrigger>
        <TabsTrigger className="whitespace-nowrap text-xs sm:text-sm px-3 py-2 flex-shrink-0" value="config">Config</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-3 sm:space-y-4">
        {/* Mobile toolbar: preview toggle */}
        {!isDesktop && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Preview</span>
            <button
              type="button"
              onClick={() => setShowPreview(v => !v)}
              aria-expanded={showPreview}
              className={`text-xs px-2 py-1 rounded border ${showPreview ? 'border-violet-500/40 text-violet-200 bg-violet-500/10' : 'border-white/10 text-slate-300 bg-white/5'}`}
            >
              {showPreview ? 'Hide' : 'Show'}
            </button>
          </div>
        )}

        {/* Live Preview */}
        {(isDesktop || showPreview) && (
        <Card className="bg-slate-900/40 border-slate-700/50">
          <CardContent className="pt-4">
            {(() => {
              const name = (formData.name || '').toLowerCase()
              const avatar = name.includes('toby') ? '/img/agents/toby4.png'
                : name.includes('ami') ? '/img/agents/ami4.png'
                : name.includes('peter') ? '/img/agents/peter4.png'
                : name.includes('emma') ? '/img/agents/emma4.png'
                : name.includes('apu') ? '/img/agents/apu4.png'
                : name.includes('wex') ? '/img/agents/wex4.png'
                : name.includes('cleo') ? '/img/agents/logocleo4.png'
                : '/img/agents/logocleo4.png'
              const iconVal = (formData.icon || '').trim()
              const isUrlIcon = iconVal.startsWith('/') || iconVal.startsWith('http')
              const isEmojiIcon = !!iconVal && !isUrlIcon && iconVal.length <= 3
              return (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-14 w-14 rounded-xl ring-2 ring-slate-600/40">
                      <AvatarImage src={avatar} alt={formData.name || 'Agent'} className="object-cover rounded-xl" />
                      <AvatarFallback className="rounded-xl text-lg" style={{ backgroundColor: formData.color }}>
                        <BrainIcon className="w-6 h-6 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    {(isUrlIcon || isEmojiIcon) && (
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border border-white/20 bg-slate-900/90 flex items-center justify-center shadow ring-1 ring-black/20" aria-hidden>
                        {isUrlIcon ? (
                          <Image src={iconVal} alt="icon" width={16} height={16} className="rounded" />
                        ) : (
                          <span className="text-base leading-none">{iconVal}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isEmojiIcon && (<span className="text-lg" aria-hidden>{iconVal}</span>)}
                      {isUrlIcon && (<Image src={iconVal} alt="icon" width={16} height={16} className="rounded" />)}
                      <span className="text-white font-medium">{formData.name || 'New Agent'}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-violet-500/10 text-violet-300 border-violet-500/30">
                        {formData.role}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs line-clamp-1">{formData.description || 'Short agent description'}</p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Agent Name</Label>
          <Input id="name" value={formData.name} onChange={handleTextInputChange('name')} onCompositionStart={() => { isComposingRef.current = true }} onCompositionEnd={() => { isComposingRef.current = false }} placeholder="My Specialized Agent" className="bg-white/10 border-white/20" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="role">Agent Role</Label>
            <Select value={formData.role} onValueChange={(v) => handleInputChange('role', v as AgentRole)}>
              <SelectTrigger id="role" className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-700">
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="specialist">Specialist</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="evaluator">Evaluator</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-slate-400">Select “Specialist” to enable <span className="font-medium">Specialization</span>.</div>
            <div className="text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowRoleHelp(v => !v)}
                aria-expanded={showRoleHelp}
                className="underline decoration-dotted underline-offset-2 text-slate-400"
              >More details</button>
              {showRoleHelp && (
                <p className="mt-1">Note: A sub‑agent cannot be a parent. For example, Sofi can be "Sub‑agent of Emma", but Emma can never be a "sub‑agent of Sofi".</p>
              )}
            </div>
          </div>

          {/* Parent (optional) for sub-agent relationship */}
          <div className="space-y-2">
            <Label htmlFor="parent">Sub-agent of <span className="text-[11px] text-slate-400 font-normal">(only primary agents, not sub-agents)</span></Label>
            {(() => {
              const currentId = editingAgent?.id
              const candidateIds = new Set(parentCandidates.map(p => p.id))
              let uuidAgents = (parentCandidates.length > 0)
                ? parentCandidates.filter(p => isUUID(p.id)).map(p => ({ id: p.id, name: p.name } as any))
                : agents.filter(a => isUUID(a.id) && a.id !== currentId && !a.isSubAgent)
              const currentVal = isUUID(formData.parentAgentId) ? formData.parentAgentId : ''
              return (
                <Select value={currentVal || 'none'} onValueChange={(v) => handleInputChange('parentAgentId', v === 'none' ? '' : v)}>
                  <SelectTrigger id="parent" className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="(Optional) Select parent agent" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 text-white border-slate-700 max-h-64">
                    <SelectItem value="none">None</SelectItem>
                    {uuidAgents.map((a) => {
                      const lower = (a.name || '').toLowerCase()
                      const avatar = (a.avatar)
                        || (lower.includes('toby') ? '/img/agents/toby4.png'
                        : lower.includes('ami') ? '/img/agents/ami4.png'
                        : lower.includes('peter') ? '/img/agents/peter4.png'
                        : lower.includes('emma') ? '/img/agents/emma4.png'
                        : lower.includes('apu') ? '/img/agents/apu4.png'
                        : lower.includes('wex') ? '/img/agents/wex4.png'
                        : lower.includes('cleo') ? '/img/agents/logocleo4.png'
                        : '/img/agents/logocleo4.png')
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={avatar} alt={a.name} />
                              <AvatarFallback className="text-[10px]">{(a.name || 'A').charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{a.name}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )
            })()}
            <div className="text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowParentHelp(v => !v)}
                aria-expanded={showParentHelp}
                className="underline decoration-dotted underline-offset-2 text-slate-400"
              >Tips</button>
              {showParentHelp && (() => {
                const hasCandidates = (parentCandidates && parentCandidates.length > 0) || agents.some(a => isUUID(a.id) && !a.isSubAgent)
                if (hasCandidates) return null
                return (
                  <p className="mt-1 text-amber-400/90">No primary agents available yet. Create a primary agent first to assign as a parent.</p>
                )
              })()}
            </div>
            {formData.parentAgentId && (() => { const pAny: any = (agents.find(x => x.id === formData.parentAgentId) as any) || (parentCandidates.find((pc:any)=>pc.id===formData.parentAgentId) as any); if (!pAny) return null; const lower=(pAny.name||'').toLowerCase(); const avatar = pAny.avatar || (lower.includes('toby') ? '/img/agents/toby4.png' : lower.includes('ami') ? '/img/agents/ami4.png' : lower.includes('peter') ? '/img/agents/peter4.png' : lower.includes('emma') ? '/img/agents/emma4.png' : lower.includes('apu') ? '/img/agents/apu4.png' : lower.includes('wex') ? '/img/agents/wex4.png' : lower.includes('cleo') ? '/img/agents/logocleo4.png' : '/img/agents/logocleo4.png'); return (
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={avatar} alt={pAny.name} />
                  <AvatarFallback className="text-[10px]">{(pAny.name||'A').charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{pAny.name}</span>
              </div>
            )})()}
          </div>

          {formData.role === 'specialist' && (
            <div className="space-y-2">
              <Label>Specialization</Label>
              <div className="text-xs text-slate-400">Choose the primary focus of this specialist agent.</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'technical', label: 'Technical', icon: '⚙️', tags: ['technical','análisis','datos'] },
                  { id: 'creative', label: 'Creative', icon: '🎨', tags: ['creative','diseño','contenido'] },
                  { id: 'logical', label: 'Logical', icon: '🧮', tags: ['logical','matemática','algoritmo'] },
                  { id: 'research', label: 'Research', icon: '🔎', tags: ['research','investigación'] },
                  { id: 'custom', label: 'Custom', icon: '✨', tags: [] },
                ].map(opt => {
                  const active = formData.specialization === (opt.id as any)
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        handleInputChange('specialization', opt.id)
                        if (opt.tags.length) {
                          const newTags = Array.from(new Set([...(formData.tags || []), ...opt.tags]))
                          handleInputChange('tags', newTags)
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${active ? 'bg-violet-500/20 text-violet-200 border-violet-500/40' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
                    >
                      <span className="mr-1">{opt.icon}</span>{opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

  <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={formData.description} onChange={handleTextInputChange('description')} onCompositionStart={() => { isComposingRef.current = true }} onCompositionEnd={() => { isComposingRef.current = false }} placeholder="Describe this agent's capabilities and purpose..." className="bg-white/10 border-white/20 min-h-[100px]" />
        </div>

        {!isEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" type="color" value={formData.color} onChange={(e) => handleInputChange('color', e.target.value)} className="bg-white/10 border-white/20 h-10 p-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icon/Emoji</Label>
              <Input id="icon" value={formData.icon} onChange={handleTextInputChange('icon')} onCompositionStart={() => { isComposingRef.current = true }} onCompositionEnd={() => { isComposingRef.current = false }} placeholder="🤖, 🧠, 🛠️..." className="bg-white/10 border-white/20" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <div className="bg-white/10 border border-white/20 rounded-md px-2 py-2 flex flex-wrap gap-2">
            {(formData.tags || []).map((tag: string) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-700/60 text-slate-100 border border-slate-600/60">
                {tag}
                <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeTag(tag)} className="hover:text-red-300/90 text-slate-300/80">
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            <input id="tags" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} onCompositionStart={() => { isComposingRef.current = true }} onCompositionEnd={() => { isComposingRef.current = false }} onBlur={() => addTag(tagInput)} placeholder={(formData.tags?.length ?? 0) === 0 ? 'Add tag and press Enter' : 'Add another tag'} className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-500">Tip: Press Enter or comma to add a tag. Backspace removes last.</div>
        </div>
      </TabsContent>

  <TabsContent value="tools" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="m-0">Tools</Label>
          <div className="flex gap-2">
            <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => handleInputChange('tools', Array.from(new Set(['complete_task', ...filteredTools.map(([k]) => k)])))}>
              Select visible
            </Button>
            <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => handleInputChange('tools', ['complete_task'])}>
              Clear
            </Button>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => (
            <button key={cat} type="button" onClick={() => setToolCategory(cat)} className={`px-2 py-1 rounded-full text-xs border transition-colors ${toolCategory === cat ? 'bg-violet-500/20 text-violet-200 border-violet-500/40' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <Input placeholder="Search tools by name or description..." value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} className="bg-white/10 border-white/20" />

        {/* Tools list */}
        <div className="relative">
          <div className="flex flex-col gap-2 sm:gap-3 max-h-[50vh] sm:max-h-[35vh] overflow-y-auto no-scrollbar pr-1">
            {filteredTools.map(([key, info]) => {
              const enabled = (formData.tools || []).includes(key)
              return (
                <div key={key} role="button" tabIndex={0}
                  onClick={() => {
                    if (key === 'complete_task') return
                    const next = new Set(formData.tools || [])
                    if (enabled) next.delete(key); else next.add(key)
                    next.add('complete_task')
                    handleInputChange('tools', Array.from(next))
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (key === 'complete_task') return
                      const next = new Set(formData.tools || [])
                      if (enabled) next.delete(key); else next.add(key)
                      next.add('complete_task')
                      handleInputChange('tools', Array.from(next))
                    }
                  }}
                  className={`rounded-lg px-3 py-2 sm:px-4 sm:py-3 border transition-colors outline-none focus:ring-2 focus:ring-violet-400/40 ${enabled ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/10 bg-white/5 hover:bg-white/8'}`}
                >
                  <div className="flex items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {info.icon ? (
                        <Image src={info.icon} alt={info.name} width={28} height={28} loading="lazy" className="rounded-md flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-md bg-white/10 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{info.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{info.category}</div>
                      </div>
                    </div>
                    <Switch onClick={(e) => e.stopPropagation()} checked={enabled} disabled={key === 'complete_task'} onCheckedChange={(checked) => {
                      if (key === 'complete_task') return
                      const next = new Set(formData.tools || [])
                      if (checked) next.add(key)
                      else next.delete(key)
                      next.add('complete_task')
                      handleInputChange('tools', Array.from(next))
                    }} />
                  </div>
                  {info.description && (
                    <p className="text-[12px] sm:text-[11px] text-slate-400 mt-2 line-clamp-2">{info.description}</p>
                  )}
                </div>
              )
            })}
          </div>
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-800/90 to-transparent" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/90 to-transparent" />
        </div>

        <style jsx global>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </TabsContent>

      <TabsContent value="prompt" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">System Prompt</Label>
          {isDesktop ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="relative">
                <Textarea id="prompt" value={formData.prompt} onChange={handleTextInputChange('prompt')} onCompositionStart={() => { isComposingRef.current = true }} onCompositionEnd={() => { isComposingRef.current = false }} placeholder="You are a specialized assistant in..." className="bg-white/10 border-white/20 min-h-[120px] max-h-[45vh] overflow-y-auto no-scrollbar resize-none" />
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-800/90 to-transparent" />
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/90 to-transparent" />
              </div>
              <div className="relative bg-slate-900/40 border border-slate-700/50 rounded-lg p-3 lg:p-4">
                <div className="text-xs text-slate-400 mb-2">Preview (Markdown)</div>
                <div className="max-h-[45vh] overflow-y-auto no-scrollbar text-slate-200 text-sm leading-relaxed">
                  <Markdown>{formData.prompt}</Markdown>
                </div>
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-800/90 to-transparent rounded-t-lg" />
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/90 to-transparent rounded-b-lg" />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                <button type="button" className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${promptView === 'edit' ? 'bg-violet-500/20 text-violet-200 border-violet-500/40' : 'bg-white/5 text-slate-300 border-white/10'}`} onClick={() => setPromptView('edit')}>Edit</button>
                <button type="button" className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${promptView === 'preview' ? 'bg-violet-500/20 text-violet-200 border-violet-500/40' : 'bg-white/5 text-slate-300 border-white/10'}`} onClick={() => setPromptView('preview')}>Preview</button>
              </div>
              {promptView === 'edit' ? (
                <div className="relative">
                  <Textarea id="prompt" value={formData.prompt} onChange={handleTextInputChange('prompt')} onCompositionStart={() => { isComposingRef.current = true }} onCompositionEnd={() => { isComposingRef.current = false }} placeholder="You are a specialized assistant in..." className="bg-white/10 border-white/20 min-h-[120px] max-h-[40vh] overflow-y-auto no-scrollbar resize-none" />
                  <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-800/90 to-transparent" />
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/90 to-transparent" />
                </div>
              ) : (
                <div className="relative bg-slate-900/40 border border-slate-700/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-2">Preview (Markdown)</div>
                  <div className="max-h-[55vh] overflow-y-auto no-scrollbar text-slate-200 text-sm leading-relaxed">
                    <Markdown>{formData.prompt}</Markdown>
                  </div>
                  <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-800/90 to-transparent rounded-t-lg" />
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/90 to-transparent rounded-b-lg" />
                </div>
              )}
            </div>
          )}
        </div>

        <style jsx global>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </TabsContent>

      <TabsContent value="config" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={formData.model} onValueChange={(v) => handleInputChange('model', v)}>
              <SelectTrigger id="model" className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder={uniqueModels.length ? 'Select a model' : 'Loading models...'} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-700 max-h-64">
                  {uniqueModels.map((m, i) => (
                    <SelectItem key={m.id || String(i)} value={m.id}>
                      {m.name || m.id}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input id="temperature" type="number" min="0" max="2" step="0.1" value={formData.temperature} onChange={(e) => { const value = parseFloat(e.target.value) || 0; handleInputChange('temperature', value) }} onCompositionStart={() => { isComposingRef.current = true }} onCompositionEnd={() => { isComposingRef.current = false }} className="bg-white/10 border-white/20" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input id="maxTokens" type="number" value={formData.maxTokens} onChange={(e) => { const value = parseInt(e.target.value) || 0; handleInputChange('maxTokens', value) }} onCompositionStart={() => { isComposingRef.current = true }} onCompositionEnd={() => { isComposingRef.current = false }} className="bg-white/10 border-white/20" />
        </div>
      </TabsContent>
    </Tabs>
  )
}

export function AgentCRUDPanel({ agents, onCreateAgent, onUpdateAgent, onDeleteAgent }: AgentCRUDPanelProps) {
  // Avoid hydration mismatches on SSR by rendering only after mount
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  // Pull server-provided parent candidates (eligible parents) from client store when available
  const parentCandidates = useClientAgentStore((s) => s.parentCandidates)
  // Simple UUID v4-ish check (accepts generic UUID formats)
  const isUUID = (v: string | undefined | null): boolean => !!v && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)
  const { models } = useModel()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [detailsAgent, setDetailsAgent] = useState<AgentConfig | null>(null)
  const [toolSearch, setToolSearch] = useState('')
  const [toolCategory, setToolCategory] = useState<string>('All')
  // Guard for IME composition to prevent cursor jumps
  const isComposingRef = React.useRef(false)
  // Tags chip input local state
  const [tagInput, setTagInput] = useState('')
  // State for active tab to prevent jumping back to basic
  const [activeTab, setActiveTab] = useState('basic')
  // Top-level filters (moved from inline IIFE to keep hooks order stable)
  const [viewFilter, setViewFilter] = React.useState<'all'|'mine'|'defaults'|'subagents'>('all')
  const [search, setSearch] = React.useState('')
  const [toolFilter, setToolFilter] = React.useState('')
  // Responsive detection to avoid rendering both mobile and desktop prompt editors simultaneously
  const [isDesktop, setIsDesktop] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    setIsDesktop(mql.matches)
    if (mql.addEventListener) mql.addEventListener('change', handler)
    else if ((mql as any).addListener) (mql as any).addListener(handler)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler)
      else if ((mql as any).removeListener) (mql as any).removeListener(handler)
    }
  }, [])

  // Note: We avoid returning early on !mounted to keep hooks order identical across renders.
  // Use the "mounted" flag only for minor UI tweaks if needed, not for skipping hook execution.

  // ----- Form state & handlers -----
  type FormState = {
    name: string
    role: AgentRole | ''
    description: string
    color: string
    icon: string
    tags: string[]
    specialization?: 'technical' | 'creative' | 'logical' | 'research' | 'custom'
    parentAgentId?: string
    model: string
    temperature: number
    maxTokens: number
    prompt: string
    tools: string[]
  }

  const initialFormState: FormState = {
    name: '',
    role: '' as any,
    description: '',
    color: '#7c3aed',
    icon: '',
    tags: [],
    specialization: 'custom',
    parentAgentId: '',
    model: '',
    temperature: 0.7,
    maxTokens: 2048,
    prompt: '',
    tools: ['complete_task'],
  }

  const [formData, setFormData] = useState<FormState>(initialFormState)

  const resetForm = () => {
    setFormData(initialFormState)
    setActiveTab('basic')
    setTagInput('')
    setToolSearch('')
    setToolCategory('All')
  }

  const handleInputChange = (field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleTextInputChange = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addTag = (t: string) => {
    const tag = (t || '').trim()
    if (!tag) return
    setFormData((prev) => ({ ...prev, tags: Array.from(new Set([...(prev.tags || []), tag])) }))
    setTagInput('')
  }

  const removeTag = (t: string) => {
    setFormData((prev) => ({ ...prev, tags: (prev.tags || []).filter((x) => x !== t) }))
  }

  const handleTagKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && (formData.tags || []).length > 0) {
      e.preventDefault()
      const last = formData.tags[formData.tags.length - 1]
      removeTag(last)
    }
  }

  // Tool filtering
  const allCategories = React.useMemo(() => {
    const cats = new Set<string>(['All'])
    Object.values(TOOL_REGISTRY).forEach((t) => cats.add(t.category))
    return Array.from(cats)
  }, [])

  const filteredTools = React.useMemo(() => {
    const q = toolSearch.toLowerCase().trim()
    return Object.entries(TOOL_REGISTRY).filter(([key, info]) => {
      const matchCat = toolCategory === 'All' || info.category === toolCategory
      const matchText = !q || key.toLowerCase().includes(q) || info.name.toLowerCase().includes(q) || (info.description || '').toLowerCase().includes(q)
      return matchCat && matchText
    })
  }, [toolCategory, toolSearch])

  // Role label helper
  const getSpecificRoleLabel = (a: AgentConfig) => {
    if ((a as any).isSubAgent) return { label: 'Sub-agent', colorClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40' }
    switch (a.role) {
      case 'supervisor':
        return { label: 'Supervisor', colorClass: 'bg-violet-500/10 text-violet-300 border-violet-500/40' }
      case 'specialist':
        return { label: 'Specialist', colorClass: 'bg-sky-500/10 text-sky-300 border-sky-500/40' }
      case 'worker':
        return { label: 'Worker', colorClass: 'bg-slate-500/10 text-slate-300 border-slate-500/40' }
      case 'evaluator':
        return { label: 'Evaluator', colorClass: 'bg-amber-500/10 text-amber-300 border-amber-500/40' }
      default:
        return { label: 'Agent', colorClass: 'bg-slate-500/10 text-slate-300 border-slate-500/40' }
    }
  }

  // CRUD handlers
  const handleCreate = async () => {
    const payload: Partial<AgentConfig> = {
      name: formData.name,
      role: (formData.role || undefined) as AgentRole | undefined,
      description: formData.description,
      color: formData.color as any,
      icon: formData.icon as any,
      tags: formData.tags,
      model: formData.model,
      temperature: formData.temperature as any,
      maxTokens: formData.maxTokens as any,
      prompt: formData.prompt,
      tools: Array.from(new Set([...(formData.tools || []), 'complete_task'])),
      parentAgentId: formData.parentAgentId || undefined,
      ...(formData.specialization ? { specialization: formData.specialization as any } : {}),
    }
    onCreateAgent(payload)
    // Try update Cleo with new agent delegation option
    try {
      const result = await updateCleoWithNewAgent(formData.name, agents)
      if (result) {
        onUpdateAgent?.('cleo-supervisor', { prompt: result.prompt, tools: result.tools } as any)
      }
    } catch (err) {
      console.warn('Failed to update Cleo with new agent:', err)
    }
    setIsCreateDialogOpen(false)
    resetForm()
  }

  const handleEdit = (agent: AgentConfig) => {
    console.log('🔧 [AGENT EDIT] Editing agent:', agent.name, 'Tools:', agent.tools)
    setEditingAgent(agent)
    
    // Ensure tools array includes agent's current tools plus complete_task
    const agentTools = agent.tools || []
    const initializedTools = Array.from(new Set([...agentTools, 'complete_task']))
    console.log('🔧 [AGENT EDIT] Initialized tools:', initializedTools)
    
    setFormData({
      name: agent.name || '',
      role: (agent.role as AgentRole) || ('' as any),
      description: agent.description || '',
      color: (agent as any).color || '#7c3aed',
      icon: (agent as any).icon || '',
      tags: agent.tags || [],
      specialization: (agent as any).specialization || 'custom',
      parentAgentId: (agent as any).parentAgentId || '',
      model: agent.model || '',
      temperature: (agent as any).temperature ?? 0.7,
      maxTokens: (agent as any).maxTokens ?? 2048,
      prompt: agent.prompt || '',
      tools: initializedTools,
    })
    setActiveTab('basic')
  }

  const handleCopyFromAgent = (agent: AgentConfig) => {
    setIsCreateDialogOpen(true)
    setEditingAgent(null)
    setFormData({
      name: `${agent.name} Copy`,
      role: (agent.role as AgentRole) || ('' as any),
      description: agent.description || '',
      color: (agent as any).color || '#7c3aed',
      icon: (agent as any).icon || '',
      tags: agent.tags || [],
      specialization: (agent as any).specialization || 'custom',
      parentAgentId: '',
      model: agent.model || '',
      temperature: (agent as any).temperature ?? 0.7,
      maxTokens: (agent as any).maxTokens ?? 2048,
      prompt: agent.prompt || '',
      tools: Array.from(new Set([...(agent.tools || []), 'complete_task'])),
    })
    setActiveTab('basic')
  }

  const handleUpdate = async () => {
    if (!editingAgent?.id) return
    const payload: Partial<AgentConfig> = {
      name: formData.name,
      role: (formData.role || undefined) as AgentRole | undefined,
      description: formData.description,
      color: formData.color as any,
      icon: formData.icon as any,
      tags: formData.tags,
      model: formData.model,
      temperature: formData.temperature as any,
      maxTokens: formData.maxTokens as any,
      prompt: formData.prompt,
      tools: Array.from(new Set([...(formData.tools || []), 'complete_task'])),
      parentAgentId: formData.parentAgentId || undefined,
      ...(formData.specialization ? { specialization: formData.specialization as any } : {}),
    }
    onUpdateAgent(editingAgent.id, payload)
    setEditingAgent(null)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    onDeleteAgent(id)
    setDeleteConfirm(null)
  }

  const getAgentAvatar = (agent?: AgentConfig) => {
    if (!agent) return null
    // Prefer explicit avatar path on the agent config when set
    if (agent.avatar) return agent.avatar
    const key = agent.name?.toLowerCase() || ''
    if (key.includes('toby')) return '/img/agents/toby4.png'
    if (key.includes('ami')) return '/img/agents/ami4.png'
    if (key.includes('peter')) return '/img/agents/peter4.png'
    if (key.includes('cleo')) return '/img/agents/logocleo4.png'
    if (key.includes('emma')) return '/img/agents/emma4.png'
    if (key.includes('wex')) return '/img/agents/wex4.png'
    if (key.includes('apu')) return '/img/agents/apu4.png'
    return null
  }

  // ----- Derived data for filters & grouping -----
  const normalized = (s?: string) => (s || '').toLowerCase().trim()
  const matchesSearch = (a: any) => {
    const q = normalized(search)
    if (!q) return true
    return normalized(a.name).includes(q) || normalized(a.description).includes(q) || normalized(a.model).includes(q)
  }
  const matchesTool = (a: any) => {
    const q = normalized(toolFilter)
    if (!q) return true
    const tools = Array.isArray(a.tools) ? a.tools : []
    return tools.some((t: string) => normalized(t).includes(q))
  }
  const defaults = agents.filter((a: any) => (a as any).isDefault === true)
  const subAgents = agents.filter(a => a.isSubAgent)
  const myAgents = agents.filter(a => !subAgents.includes(a) && !defaults.includes(a))
  let sections = [
    { title: 'Default Agents', items: defaults },
    { title: 'My Agents', items: myAgents },
    { title: 'Sub-agents', items: subAgents }
  ]
  if (viewFilter === 'defaults') sections = sections.filter(s => s.title === 'Default Agents')
  if (viewFilter === 'mine') sections = sections.filter(s => s.title === 'My Agents')
  if (viewFilter === 'subagents') sections = sections.filter(s => s.title === 'Sub-agents')

  return (
  <div className="space-y-6 w-full max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Agent Control Center
          </h2>
          <p className="text-slate-400 mt-1">Manage and configure your AI agents</p>
        </div>
        
        <Button
          onClick={() => { resetForm(); setEditingAgent(null); setIsCreateDialogOpen(true) }}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:text-white hover:border-violet-500 hover:bg-violet-500/10 transition-all duration-200"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Filters & Grouped Agents: Default, My Agents, Sub-agents */}
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <select
              value={viewFilter}
              onChange={e => setViewFilter(e.target.value as any)}
              className="bg-slate-800/60 border border-slate-700 text-sm text-slate-200 rounded px-2 py-1"
            >
              <option value="all">View: All</option>
              <option value="defaults">View: Default Agents</option>
              <option value="mine">View: My Agents</option>
              <option value="subagents">View: Sub-agents</option>
            </select>
            <input
              placeholder="Search by name/model..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-800/60 border border-slate-700 text-sm text-slate-200 rounded px-2 py-1 w-48"
            />
            <input
              placeholder="Filter by tool (e.g. shopify)"
              value={toolFilter}
              onChange={e => setToolFilter(e.target.value)}
              className="bg-slate-800/60 border border-slate-700 text-sm text-slate-200 rounded px-2 py-1 w-56"
            />
          </div>
        </div>

        {sections.map(({ title, items }) => (
          <div key={title} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <span className="text-xs text-slate-400">{items.filter(a => matchesSearch(a) && matchesTool(a)).length} items</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 w-full">
              <AnimatePresence>
                {items.filter(a => matchesSearch(a) && matchesTool(a)).map((agent) => (
                  <motion.div
                    key={`${title}_${agent.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Card 
                      className="h-full bg-slate-800/50 border-slate-700/50 hover:border-violet-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-violet-500/10 relative overflow-hidden cursor-pointer"
                      onClick={() => setDetailsAgent(agent)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                      <div className="relative z-10">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="relative group">
                              <Avatar className="h-16 w-16 rounded-xl ring-2 ring-slate-600/50 group-hover:ring-violet-400/50 transition-all duration-300 group-hover:scale-105">
                                {getAgentAvatar(agent) ? (
                                  <AvatarImage src={getAgentAvatar(agent)!} alt={agent.name} className="object-cover rounded-xl" />
                                ) : null}
                                <AvatarFallback className="rounded-xl text-lg" style={{ backgroundColor: agent.color }}>
                                  <BrainIcon className="w-8 h-8 text-white" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl" style={{ backgroundColor: agent.color }} />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg text-white mb-1">{agent.name}</CardTitle>
                              <div className="mb-2">
                                {(() => { const info = getSpecificRoleLabel(agent); return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${info.colorClass}`}>
                                    {info.label}
                                  </span>
                                )})()}
                              </div>
                              {agent.description && (
                                <p className="text-xs text-slate-400 line-clamp-1">{agent.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {agent.tags && agent.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {agent.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs bg-slate-700/60 text-slate-200 border border-slate-600/60">
                                {tag}
                              </Badge>
                            ))}
                            {agent.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-slate-700/60 text-slate-200 border border-slate-600/60">
                                +{agent.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                          <div className="text-xs text-slate-400">
                            <span className="font-medium">{agent.model}</span>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleCopyFromAgent(agent) }} className="h-8 w-8 p-0 hover:bg-violet-500/20" title="Copy agent">
                              <CopyIcon className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(agent) }} className="h-8 w-8 p-0 hover:bg-violet-500/20">
                              <PencilIcon className="w-3 h-3" />
                            </Button>
                            {/* Hide delete for default agents */}
                            {!(agent as any).isDefault && (agent.id !== 'cleo-supervisor') && (
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(agent.id!) }} className="h-8 w-8 p-0 hover:bg-red-500/20 text-red-400 hover:text-red-300">
                                <TrashIcon className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Create (Dialog on desktop, Bottom Sheet on mobile) */}
      {isDesktop ? (
        <Dialog 
          open={isCreateDialogOpen} 
          onOpenChange={(open) => {
            if (!open && !isComposingRef.current) {
              setIsCreateDialogOpen(false)
            }
          }}
        >
          <DialogContent 
            hasCloseButton={false}
            className="max-w-5xl w-[100vw] sm:w-[95vw] bg-slate-800 border-slate-700 sm:rounded-lg rounded-none h-[72dvh] max-h-[75dvh] sm:h-[90vh] grid grid-rows-[auto,1fr,auto] min-h-0 my-2 sm:my-0"
          >
            <DialogHeader className="row-start-1 sticky top-0 z-20 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/70">
              <div className="relative">
                <DialogTitle className="text-xl font-bold text-white flex items-center">
                  <RobotIcon className="w-5 h-5 mr-2 text-violet-400" />
                  Create New Agent
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="absolute right-0 top-0 h-8 w-8 p-0 text-slate-300 hover:text-white"
                  aria-label="Close"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="row-start-2 min-h-0 overflow-y-auto no-scrollbar pr-1 pb-[max(env(safe-area-inset-bottom),16px)] overscroll-contain [-webkit-overflow-scrolling:touch]">
              <div className="space-y-6">
                <AgentForm
                  isEdit={false}
                  formData={formData}
                  handleInputChange={(f, v) => handleInputChange(f as any, v)}
                  handleTextInputChange={(f) => handleTextInputChange(f as any)}
                  isComposingRef={isComposingRef}
                  tagInput={tagInput}
                  setTagInput={setTagInput}
                  addTag={addTag}
                  removeTag={removeTag}
                  handleTagKeyDown={handleTagKeyDown}
                  models={models}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  parentCandidates={parentCandidates as any}
                  agents={agents}
                  isUUID={isUUID}
                  editingAgent={editingAgent}
                  toolSearch={toolSearch}
                  setToolSearch={setToolSearch}
                  toolCategory={toolCategory}
                  setToolCategory={setToolCategory}
                  allCategories={allCategories}
                  filteredTools={filteredTools}
                  isDesktop={isDesktop}
                />
              </div>
            </div>

            <div className="row-start-3 z-20 flex justify-end space-x-3 pt-3 border-t border-slate-700 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/70 px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    resetForm()
                  }}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formData.name || !formData.role || !formData.model}
                  className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Agent
                </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} direction="bottom">
          <SheetContent ensureTitle srTitle="Create New Agent" className="rounded-t-lg border-t border-slate-700 h-[68dvh] max-h-[72dvh] grid grid-rows-[auto,1fr,auto] min-h-0">
            <SheetHeader className="row-start-1 sticky top-0 z-20 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/70 px-4 pt-3 pb-2">
              <div className="relative">
                <SheetTitle className="text-base font-semibold text-white flex items-center">
                  <RobotIcon className="w-5 h-5 mr-2 text-violet-400" />
                  Create New Agent
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="absolute right-0 top-0 h-8 w-8 p-0 text-slate-300 hover:text-white"
                  aria-label="Close"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
            </SheetHeader>

            <div className="row-start-2 min-h-0 overflow-y-auto no-scrollbar pr-1 pb-[max(env(safe-area-inset-bottom),16px)] overscroll-contain [-webkit-overflow-scrolling:touch] px-4">
              <div className="space-y-6">
                <AgentForm
                  isEdit={false}
                  formData={formData}
                  handleInputChange={(f, v) => handleInputChange(f as any, v)}
                  handleTextInputChange={(f) => handleTextInputChange(f as any)}
                  isComposingRef={isComposingRef}
                  tagInput={tagInput}
                  setTagInput={setTagInput}
                  addTag={addTag}
                  removeTag={removeTag}
                  handleTagKeyDown={handleTagKeyDown}
                  models={models}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  parentCandidates={parentCandidates as any}
                  agents={agents}
                  isUUID={isUUID}
                  editingAgent={editingAgent}
                  toolSearch={toolSearch}
                  setToolSearch={setToolSearch}
                  toolCategory={toolCategory}
                  setToolCategory={setToolCategory}
                  allCategories={allCategories}
                  filteredTools={filteredTools}
                  isDesktop={isDesktop}
                />
              </div>
            </div>

            <div className="row-start-3 z-20 flex justify-end gap-3 pt-2 border-t border-slate-700 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/70 px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
              <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm() }} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name || !formData.role || !formData.model} className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50">
                Create Agent
              </Button>
            </div>
          </SheetContent>
        </Drawer>
      )}

      {/* Edit (Dialog desktop, Bottom Sheet mobile) */}
      {isDesktop ? (
        <Dialog open={!!editingAgent} onOpenChange={(open) => !open && setEditingAgent(null)}>
          <DialogContent hasCloseButton={false} className="max-w-2xl w-[100vw] sm:w-auto bg-slate-800 border-slate-700 sm:rounded-lg rounded-none h-[68dvh] max-h-[72dvh] sm:h-auto grid grid-rows-[auto,1fr,auto] min-h-0 my-2 sm:my-0">
            <DialogHeader className="row-start-1 sticky top-0 z-20 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/70">
              <div className="relative">
                <DialogTitle className="text-xl font-bold text-white flex items-center">
                  <PencilIcon className="w-5 h-5 mr-2 text-violet-400" />
                  Edit Agent
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingAgent(null)}
                  className="absolute right-0 top-0 h-8 w-8 p-0 text-slate-300 hover:text-white"
                  aria-label="Close"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="row-start-2 min-h-0 overflow-y-auto no-scrollbar pr-1 pb-[max(env(safe-area-inset-bottom),16px)] overscroll-contain [-webkit-overflow-scrolling:touch]">
              <div className="space-y-6">
                <AgentForm
                  isEdit={true}
                  formData={formData}
                  handleInputChange={(f, v) => handleInputChange(f as any, v)}
                  handleTextInputChange={(f) => handleTextInputChange(f as any)}
                  isComposingRef={isComposingRef}
                  tagInput={tagInput}
                  setTagInput={setTagInput}
                  addTag={addTag}
                  removeTag={removeTag}
                  handleTagKeyDown={handleTagKeyDown}
                  models={models}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  parentCandidates={parentCandidates as any}
                  agents={agents}
                  isUUID={isUUID}
                  editingAgent={editingAgent}
                  toolSearch={toolSearch}
                  setToolSearch={setToolSearch}
                  toolCategory={toolCategory}
                  setToolCategory={setToolCategory}
                  allCategories={allCategories}
                  filteredTools={filteredTools}
                  isDesktop={isDesktop}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700 bg-slate-800">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingAgent(null)
                  resetForm()
                }}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!formData.name || !formData.role || !formData.model}
                className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Agent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={!!editingAgent} onOpenChange={(open) => !open && setEditingAgent(null)} direction="bottom">
          <SheetContent ensureTitle srTitle="Edit Agent" className="rounded-t-lg border-t border-slate-700 h-[64dvh] max-h-[68dvh] grid grid-rows-[auto,1fr,auto] min-h-0">
            <SheetHeader className="row-start-1 sticky top-0 z-20 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/70 px-4 pt-3 pb-2">
              <div className="relative">
                <SheetTitle className="text-base font-semibold text-white flex items-center">
                  <PencilIcon className="w-5 h-5 mr-2 text-violet-400" />
                  Edit Agent
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingAgent(null)}
                  className="absolute right-0 top-0 h-8 w-8 p-0 text-slate-300 hover:text-white"
                  aria-label="Close"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
            </SheetHeader>

            <div className="row-start-2 min-h-0 overflow-y-auto no-scrollbar pr-1 pb-[max(env(safe-area-inset-bottom),16px)] overscroll-contain [-webkit-overflow-scrolling:touch] px-4">
              <div className="space-y-6">
                <AgentForm
                  isEdit={true}
                  formData={formData}
                  handleInputChange={(f, v) => handleInputChange(f as any, v)}
                  handleTextInputChange={(f) => handleTextInputChange(f as any)}
                  isComposingRef={isComposingRef}
                  tagInput={tagInput}
                  setTagInput={setTagInput}
                  addTag={addTag}
                  removeTag={removeTag}
                  handleTagKeyDown={handleTagKeyDown}
                  models={models}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  parentCandidates={parentCandidates as any}
                  agents={agents}
                  isUUID={isUUID}
                  editingAgent={editingAgent}
                  toolSearch={toolSearch}
                  setToolSearch={setToolSearch}
                  toolCategory={toolCategory}
                  setToolCategory={setToolCategory}
                  allCategories={allCategories}
                  filteredTools={filteredTools}
                  isDesktop={isDesktop}
                />
              </div>
            </div>

            <div className="row-start-3 z-20 flex justify-end gap-3 pt-2 border-t border-slate-700 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/70 px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
              <Button variant="outline" onClick={() => { setEditingAgent(null); resetForm() }} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={!formData.name || !formData.role || !formData.model} className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50">
                Update Agent
              </Button>
            </div>
          </SheetContent>
        </Drawer>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-400">Confirm Deletion</DialogTitle>
          </DialogHeader>
          
          <p className="text-slate-300">
            Are you sure you want to delete this agent? This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agent Details Modal */}
      <Dialog open={!!detailsAgent} onOpenChange={(open) => !open && setDetailsAgent(null)}>
        <DialogContent className="max-w-4xl bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
          {detailsAgent && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-4 mb-6">
                  {/* Agent Avatar */}
                  <div className="relative">
                    <Avatar className="h-20 w-20 rounded-xl ring-2 ring-violet-400/50">
            {getAgentAvatar(detailsAgent || undefined) ? (
                        <AvatarImage 
              src={getAgentAvatar(detailsAgent || undefined)!} 
              alt={detailsAgent!.name}
                          className="object-cover rounded-xl"
                        />
                      ) : null}
            <AvatarFallback className="rounded-xl text-xl" style={{ backgroundColor: detailsAgent!.color }}>
                        <BrainIcon className="w-10 h-10 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    {/* Glow effect */}
                    <div 
                      className="absolute inset-0 rounded-xl opacity-20 blur-xl"
            style={{ backgroundColor: detailsAgent!.color }}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold text-white flex items-center mb-2">
            {detailsAgent!.name}
                    </DialogTitle>
                    <div className="flex items-center space-x-3 mb-3">
            {(() => { const info = getSpecificRoleLabel(detailsAgent!); return (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${info.colorClass}`}>
                          {info.label}
                        </span>
                      )})()}
                      <Badge variant="secondary" className="bg-slate-700/60 text-slate-200 border border-slate-600/60">
            {detailsAgent!.model}
                      </Badge>
                    </div>
          <p className="text-slate-300 text-base leading-relaxed">{detailsAgent!.description}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-8">
                {/* Agent Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <RobotIcon className="w-5 h-5 mr-2 text-violet-400" />
                      Configuration
                    </h3>
                    <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Temperature:</span>
                        <span className="text-white font-medium">{detailsAgent!.temperature}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Max Tokens:</span>
                        <span className="text-white font-medium">{detailsAgent!.maxTokens?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Role:</span>
                        <span className="text-white font-medium capitalize">{detailsAgent!.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* System Prompt (Markdown Preview) */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">System Prompt</h3>
                    <div className="bg-slate-700/30 rounded-lg p-3 md:p-4">
                      <div className="max-h-[40vh] overflow-y-auto no-scrollbar prose prose-invert prose-sm">
                        <Markdown>{detailsAgent!.prompt || ''}</Markdown>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tools & Capabilities */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Tools & Capabilities</h3>
                  {detailsAgent!.tools && detailsAgent!.tools.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detailsAgent!.tools
                        // Hide internal/credential helper tools defensively even if legacy data still contains them
                        .filter(t => !['add_notion_credentials','test_notion_connection','list_notion_credentials'].includes(t))
                        .map((toolName, index) => {
                        // Friendly rendering for delegation tools that are created dynamically per sub-agent
                        const isDelegation = toolName.startsWith('delegate_to_')
                        const delegationInfo = (() => {
                          if (!isDelegation) return null
                          // delegate_to_<sanitizedAgentId> where sanitized replaces non-alphanumeric with _
                          const suffix = toolName.replace(/^delegate_to_/, '')
                          const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_')
                          // Prefer children of the current agent as targets
                          const children = agents.filter(a => (a as any).parentAgentId === detailsAgent!.id)
                          const byChild = children.find(c => sanitize(c.id) === suffix)
                          const target = byChild || agents.find(a => sanitize(a.id) === suffix)
                          if (target) {
                            return {
                              name: `Delegate to ${target.name}`,
                              description: `Delegate the current task to sub-agent ${target.name}. ${target.description || ''}`.trim(),
                              category: 'Delegation',
                              useCases: Array.isArray(target.tags) && target.tags.length ? target.tags.slice(0, 5) : ['handoff', 'specialist', 'routing']
                            } as ToolInfo
                          }
                          // Generic fallback for delegation tools when target is not resolvable
                          return {
                            name: 'Delegate to agent',
                            description: 'Delegates the task to another agent or sub-agent better suited for the request.',
                            category: 'Delegation',
                            useCases: ['handoff', 'specialist', 'routing']
                          } as ToolInfo
                        })()

                        const toolInfo = delegationInfo || TOOL_REGISTRY[toolName] || {
                          name: toolName,
                          description: 'Tool description not available',
                          category: isDelegation ? 'Delegation' : 'Unknown',
                          useCases: isDelegation ? ['handoff', 'specialist', 'routing'] : []
                        }
                        return (
                          <div key={index} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30 hover:border-violet-500/30 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-medium text-white">{toolInfo.name}</h4>
                              <Badge variant="outline" className="text-xs border-violet-500/50 text-violet-300 bg-violet-900/20">
                                {toolInfo.category}
                              </Badge>
                            </div>
                            <p className="text-slate-400 text-sm mb-3 leading-relaxed">{toolInfo.description}</p>
                            {toolInfo.useCases.length > 0 && (
                              <div>
                                <p className="text-slate-300 text-xs font-medium mb-2">Use Cases:</p>
                                <ul className="text-slate-400 text-xs space-y-1">
                                  {toolInfo.useCases.slice(0, 3).map((useCase, i) => (
                                    <li key={i} className="flex items-center">
                                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mr-2 flex-shrink-0"></span>
                                      {useCase}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-700/30 rounded-lg p-8 text-center">
                      <RobotIcon className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-400 text-lg font-medium mb-1">No tools configured</p>
                      <p className="text-slate-500 text-sm">This agent doesn't have any specialized tools assigned</p>
                    </div>
                  )}
                </div>

                {/* Tags / Specializations */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Specializations</h3>
                  <div className="flex flex-wrap gap-2">
                    {detailsAgent!.tags && detailsAgent!.tags.length > 0 ? (
                      detailsAgent!.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-violet-900/30 text-violet-300 border border-violet-700/50 hover:bg-violet-800/30 transition-colors">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <div className="bg-slate-700/30 rounded-lg p-4 text-center">
                        <p className="text-slate-400 text-sm">No specializations defined</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-700">
                <Button
                  onClick={() => setDetailsAgent(null)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 transition-colors"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AgentCRUDPanel

/**
 * Dynamic Prompt System
 * 
 * Generates dynamic prompts for agents that include their available tools,
 * sub-agents, and delegation capabilities automatically.
 */

import { AgentConfig } from './types'
import { buildDelegationPromptAddition } from './delegation/dynamic-delegation'

/**
 * Build a complete dynamic prompt for an agent
 */
export async function buildDynamicPrompt(
  agent: AgentConfig, 
  subAgents: AgentConfig[] = [], 
  availableTools: string[] = []
): Promise<string> {
  let prompt = agent.prompt
  
  // Add tool awareness section
  if (availableTools.length > 0 || agent.tools.length > 0) {
    const allTools = [...new Set([...agent.tools, ...availableTools])]
    prompt += buildToolAwarenessSection(allTools)
  }
  
  // Add delegation section for sub-agents
  if (subAgents.length > 0) {
    prompt += buildDelegationPromptAddition(agent, subAgents)
  }
  
  // Add execution context
  prompt += buildExecutionContextSection(agent)
  
  return prompt
}

/**
 * Build tool awareness section for prompts
 */
function buildToolAwarenessSection(tools: string[]): string {
  if (tools.length === 0) return ''
  
  const categorizedTools = categorizeTools(tools)
  
  let section = '\n\nAvailable Tools & Capabilities:\n'
  
  for (const [category, categoryTools] of Object.entries(categorizedTools)) {
    if (categoryTools.length > 0) {
      section += `\n${category}:\n`
      section += categoryTools.map(tool => `- ${tool}: ${getToolDescription(tool)}`).join('\n')
      section += '\n'
    }
  }
  
  section += '\nTool Usage Guidelines:\n'
  section += '- Use tools proactively to provide comprehensive answers\n'
  section += '- Always validate tool results before presenting to user\n'
  section += '- Combine multiple tools when necessary for complete solutions\n'
  
  return section
}

/**
 * Categorize tools by their function
 */
function categorizeTools(tools: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    'Web & Research': [],
    'Google Workspace': [],
    'Notion': [],
    'E-commerce': [],
    'Automation': [],
    'Delegation': [],
    'Credentials': [],
    'Utility': []
  }
  
  for (const tool of tools) {
    const toolLower = tool.toLowerCase()
    
    if (toolLower.includes('delegate_to_')) {
      categories['Delegation'].push(tool)
    } else if (toolLower.includes('google') || toolLower.includes('drive') || toolLower.includes('calendar')) {
      categories['Google Workspace'].push(tool)
    } else if (toolLower.includes('notion')) {
      categories['Notion'].push(tool)
    } else if (toolLower.includes('shopify') || toolLower.includes('ecommerce')) {
      categories['E-commerce'].push(tool)
    } else if (toolLower.includes('skyvern') || toolLower.includes('automation')) {
      categories['Automation'].push(tool)
    } else if (toolLower.includes('credentials') || toolLower.includes('_connection') || toolLower.includes('add_') || toolLower.includes('test_')) {
      categories['Credentials'].push(tool)
    } else if (toolLower.includes('search') || toolLower.includes('web') || toolLower.includes('serp')) {
      categories['Web & Research'].push(tool)
    } else {
      categories['Utility'].push(tool)
    }
  }
  
  // Remove empty categories
  for (const category in categories) {
    if (categories[category].length === 0) {
      delete categories[category]
    }
  }
  
  return categories
}

/**
 * Get description for a tool
 */
function getToolDescription(tool: string): string {
  const descriptions: Record<string, string> = {
    // Web & Research
    'webSearch': 'Search the web for current information',
    'serpGeneralSearch': 'Advanced Google search with structured results',
    'serpNewsSearch': 'Search news articles and current events',
    'serpScholarSearch': 'Search academic papers and scholarly content',
    
    // Google Workspace
    'createGoogleDoc': 'Create new Google Documents',
    'readGoogleDoc': 'Read and analyze Google Documents',
    'createGoogleSheet': 'Create new Google Spreadsheets',
    'readGoogleSheet': 'Read and analyze Google Spreadsheets',
    'listCalendarEvents': 'List calendar events and schedules',
    
    // Notion
    'create-notion-page': 'Create new Notion pages',
    'get-notion-page': 'Read Notion page content',
    'query-notion-database': 'Query Notion databases',
    
    // E-commerce
    'shopifyGetProducts': 'Retrieve Shopify product information',
    'shopifyGetOrders': 'Retrieve Shopify order data',
    'shopifyGetAnalytics': 'Get Shopify store analytics',
    
    // Automation
    'create_skyvern_task': 'Create automated browser tasks',
    'get_skyvern_task': 'Check status of automation tasks',
    
  // Credentials (only Skyvern credential helper retained for now)
  'add_skyvern_credentials': 'Add Skyvern automation credentials',
    
    // Utility
    'getCurrentDateTime': 'Get current date and time',
    'calculator': 'Perform mathematical calculations',
    'randomFact': 'Get random facts for inspiration',
    'complete_task': 'Mark task as completed'
  }
  
  return descriptions[tool] || 'Tool for specialized functionality'
}

/**
 * Build execution context section
 */
function buildExecutionContextSection(agent: AgentConfig): string {
  let section = '\n\nExecution Context:\n'
  
  section += `- Agent: ${agent.name} (${agent.role})\n`
  section += `- Specialization: ${agent.tags?.join(', ') || 'General'}\n`
  section += `- Model: ${agent.model}\n`
  
  if (agent.isSubAgent && agent.parentAgentId) {
    section += `- Sub-agent of: ${agent.parentAgentId}\n`
  }
  
  section += '\nQuality Standards:\n'
  section += '- Provide accurate, helpful, and complete responses\n'
  section += '- Use tools proactively to enhance answers\n'
  section += '- Maintain professional and friendly communication\n'
  section += '- Ask clarifying questions when needed\n'
  
  if (agent.role === 'supervisor') {
    section += '- Delegate tasks to specialists when appropriate\n'
    section += '- Review and synthesize specialist outputs\n'
  }
  
  section += '- Call complete_task when work is finished\n'
  
  return section
}

/**
 * Update agent prompt with dynamic content
 */
export async function updateAgentPromptWithDynamicContent(
  agent: AgentConfig,
  subAgents: AgentConfig[] = [],
  additionalTools: string[] = []
): Promise<AgentConfig> {
  const dynamicPrompt = await buildDynamicPrompt(agent, subAgents, additionalTools)
  
  return {
    ...agent,
    prompt: dynamicPrompt
  }
}

/**
 * Extract base prompt (without dynamic additions)
 */
export function extractBasePrompt(fullPrompt: string): string {
  // Find common dynamic section markers
  const dynamicMarkers = [
    '\n\nAvailable Tools & Capabilities:',
    '\n\nSpecialized Sub-Agents Available:',
    '\n\nExecution Context:'
  ]
  
  let basePrompt = fullPrompt
  
  for (const marker of dynamicMarkers) {
    const index = basePrompt.indexOf(marker)
    if (index !== -1) {
      basePrompt = basePrompt.substring(0, index)
    }
  }
  
  return basePrompt.trim()
}

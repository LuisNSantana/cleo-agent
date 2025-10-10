/**
 * Agent Capability Inspector
 * 
 * Provides detailed information about agent capabilities, tools, and specializations
 * to improve delegation decisions and prevent over-delegation.
 */

import { AgentConfig } from '../types'

export interface AgentCapability {
  agentId: string
  agentName: string
  tools: ToolCapability[]
  specializations: string[]
  canHandle: string[]
  shouldNotHandle: string[]
  bestFor: string[]
}

export interface ToolCapability {
  name: string
  category: string
  description: string
  useCases: string[]
}

/**
 * Get comprehensive capability information for all agents
 */
export async function getAllAgentCapabilities(userId?: string): Promise<AgentCapability[]> {
  try {
    const { getAllAgents } = await import('../registry')
    const agents = await getAllAgents(userId || '00000000-0000-0000-0000-000000000000')
    
    const capabilities: AgentCapability[] = []
    
    for (const agent of agents) {
      if (agent.role === 'specialist') {
        capabilities.push(await getAgentCapability(agent))
      }
    }
    
    return capabilities
  } catch (error) {
    console.error('Error getting all agent capabilities:', error)
    return []
  }
}

/**
 * Get detailed capability information for a specific agent
 */
export async function getAgentCapability(agent: AgentConfig): Promise<AgentCapability> {
  const toolCapabilities = (agent.tools || []).map(toolName => getToolCapability(toolName))
  
  return {
    agentId: agent.id,
    agentName: agent.name,
    tools: toolCapabilities,
    specializations: extractSpecializations(agent),
    canHandle: getCanHandleList(agent),
    shouldNotHandle: getShouldNotHandleList(agent),
    bestFor: getBestForList(agent)
  }
}

/**
 * Get tool capability information
 */
function getToolCapability(toolName: string): ToolCapability {
  const toolMap: Record<string, ToolCapability> = {
    // Google Workspace tools (used by multiple agents)
    'createGoogleDoc': {
      name: 'Create Google Doc',
      category: 'Document Creation',
      description: 'Create documents for financial reports, support guides, or general documentation',
      useCases: ['Financial reports', 'Support documentation', 'Business analysis', 'Solution guides']
    },
    'createGoogleSheet': {
      name: 'Create Google Sheet',
      category: 'Spreadsheet Creation',
      description: 'Create spreadsheets for financial modeling, ticket tracking, or data analysis',
      useCases: ['Financial modeling', 'Ticket tracking', 'Data analysis', 'Performance metrics']
    },
    'createGoogleSlides': {
      name: 'Create Google Slides',
      category: 'Presentation Creation',
      description: 'Create new Google Slide presentations',
      useCases: ['Presentation creation', 'Slide decks', 'Visual presentations']
    },
    'listDriveFiles': {
      name: 'List Drive Files',
      category: 'File Management',
      description: 'List files in Google Drive',
      useCases: ['File browsing', 'Drive exploration', 'File discovery']
    },
    'searchDriveFiles': {
      name: 'Search Drive Files',
      category: 'File Search',
      description: 'Search for specific files in Google Drive',
      useCases: ['File search', 'Document finding', 'Content location']
    },
    
    // Ami's tools (general)
    'createCalendarEvent': {
      name: 'Create Calendar Event',
      category: 'Calendar Management',
      description: 'Create new calendar events and meetings',
      useCases: ['Meeting scheduling', 'Event planning', 'Time management']
    },
    'sendGmailMessage': {
      name: 'Send Gmail Message',
      category: 'Email Communication',
      description: 'Send emails via Gmail',
      useCases: ['Email communication', 'Message sending', 'Correspondence']
    },
    'webSearch': {
      name: 'Web Search',
      category: 'Research',
      description: 'Search the web for information',
      useCases: ['Research', 'Information gathering', 'Fact finding']
    },
    
    // Peter's financial tools
    'fmpCompanyProfile': {
      name: 'FMP Company Profile',
      category: 'Financial Analysis',
      description: 'Get detailed company financial profile',
      useCases: ['Company analysis', 'Financial research', 'Investment evaluation']
    },
    'alphaVantageStockPrice': {
      name: 'Alpha Vantage Stock Price',
      category: 'Market Data',
      description: 'Get real-time stock prices and market data',
      useCases: ['Stock analysis', 'Market monitoring', 'Investment tracking']
    },
    'calculator': {
      name: 'Calculator',
      category: 'Analysis',
      description: 'Perform complex calculations and financial modeling',
      useCases: ['Financial calculations', 'ROI analysis', 'Budget planning']
    },
    
    // Emma's tools
    'shopifyGetProducts': {
      name: 'Get Shopify Products',
      category: 'E-commerce',
      description: 'Retrieve products from Shopify store',
      useCases: ['Product management', 'Inventory review', 'Store analysis']
    },
    'shopifyGetAnalytics': {
      name: 'Get Shopify Analytics',
      category: 'Analytics',
      description: 'Get analytics data from Shopify',
      useCases: ['Sales analysis', 'Performance metrics', 'Business intelligence']
    },
    
    // Apu's support-specific tools
    'leadResearch': {
      name: 'Lead Research',
      category: 'Customer Analysis',
      description: 'Research customer information and context',
      useCases: ['Customer profiling', 'Account analysis', 'Support context']
    },
    
    // Toby's tools
    'codeInterpreter': {
      name: 'Code Interpreter',
      category: 'Programming',
      description: 'Execute and analyze code',
      useCases: ['Code execution', 'Programming tasks', 'Technical analysis']
    }
  }
  
  return toolMap[toolName] || {
    name: toolName,
    category: 'General',
    description: `${toolName} tool`,
    useCases: ['General tasks']
  }
}

/**
 * Extract specializations from agent configuration
 */
function extractSpecializations(agent: AgentConfig): string[] {
  const specializations = new Set<string>()
  
  // From tags
  if (agent.tags) {
    agent.tags.forEach(tag => {
      const normalized = tag.toLowerCase()
      if (normalized.includes('google')) specializations.add('Google Workspace')
      if (normalized.includes('doc')) specializations.add('Document Creation')
      if (normalized.includes('sheet')) specializations.add('Spreadsheet Management')
      if (normalized.includes('drive')) specializations.add('File Management')
      if (normalized.includes('ecommerce')) specializations.add('E-commerce')
      if (normalized.includes('shopify')) specializations.add('Shopify Management')
      if (normalized.includes('technical')) specializations.add('Technical Development')
      if (normalized.includes('creative')) specializations.add('Creative Design')
      if (normalized.includes('research')) specializations.add('Research & Analysis')
    })
  }
  
  // From tools
  if (agent.tools) {
    agent.tools.forEach(tool => {
      if (tool.includes('Google')) specializations.add('Google Workspace')
      if (tool.includes('shopify')) specializations.add('E-commerce')
      if (tool.includes('calendar')) specializations.add('Calendar Management')
      if (tool.includes('gmail')) specializations.add('Email Management')
      if (tool.includes('web')) specializations.add('Web Research')
    })
  }
  
  return Array.from(specializations)
}

/**
 * Get list of what the agent can handle
 */
function getCanHandleList(agent: AgentConfig): string[] {
  const agentSpecializations: Record<string, string[]> = {
    'peter-financial': [
      'Financial analysis',
      'Business strategy',
      'Investment research',
      'Market analysis',
      'Financial modeling',
      'ROI calculations',
      'Budget planning',
      'Cryptocurrency analysis'
    ],
    'ami-creative': [
      'Calendar scheduling',
      'Email management',
      'Research tasks',
      'General organization',
      'Productivity workflows',
      'Meeting coordination',
      'Task planning',
      'Creative projects',
      'Administrative tasks'
    ],
    'emma-ecommerce': [
      'Shopify store management',
      'E-commerce analytics',
      'Product management',
      'Sales analysis',
      'Inventory management',
      'Store optimization'
    ],
    'toby-technical': [
      'Programming tasks',
      'Code development',
      'API integration',
      'Technical troubleshooting',
      'Software architecture',
      'Database management'
    ],
    'apu-support': [
      'Customer support',
      'Technical troubleshooting',
      'Issue resolution',
      'Documentation creation',
      'Service workflows',
      'Ticket management',
      'Customer communication',
      'Help desk operations'
    ],
    'wex-intelligence': [
      'Strategic intelligence',
      'Market intelligence',
      'Competitive analysis',
      'Business insights',
      'Data synthesis',
      'Trend analysis'
    ]
  }
  
  return agentSpecializations[agent.id] || ['General tasks']
}

/**
 * Get list of what the agent should NOT handle
 */
function getShouldNotHandleList(agent: AgentConfig): string[] {
  const agentExclusions: Record<string, string[]> = {
    'peter-financial': [
      'Customer support',
      'Technical troubleshooting',
      'E-commerce management',
      'Programming tasks',
      'Creative design',
      'Calendar scheduling',
      'Email management'
    ],
    'ami-creative': [
      'Google Docs creation (specific files)',
      'Google Sheets creation (specific files)',
      'E-commerce management',
      'Programming tasks',
      'Technical development'
    ],
    'emma-ecommerce': [
      'Google Workspace tasks',
      'Programming tasks',
      'General research',
      'Calendar management',
      'Email tasks'
    ],
    'apu-support': [
      'Financial analysis',
      'Programming tasks',
      'E-commerce management',
      'Creative design',
      'Market research'
    ],
    'toby-technical': [
      'E-commerce management',
      'Customer support',
      'Financial analysis',
      'Calendar scheduling',
      'Email management',
      'Creative design'
    ],
    'wex-intelligence': [
      'Customer support',
      'Programming tasks',
      'E-commerce management',
      'Calendar scheduling',
      'Email management'
    ]
  }
  
  return agentExclusions[agent.id] || []
}

/**
 * Get list of what the agent is best for
 */
function getBestForList(agent: AgentConfig): string[] {
  const agentBestFor: Record<string, string[]> = {
    'peter-financial': [
      'Financial modeling and analysis',
      'Investment research and evaluation',
      'Business strategy development',
      'Market analysis and insights',
      'ROI calculations and planning'
    ],
    'ami-creative': [
      'Coordinating meetings and schedules',
      'Managing email workflows',
      'Research and information gathering',
      'General productivity and organization'
    ],
    'emma-ecommerce': [
      'Shopify store optimization',
      'E-commerce performance analysis',
      'Product catalog management'
    ],
    'apu-support': [
      'Customer issue resolution',
      'Technical troubleshooting guides',
      'Support documentation creation',
      'Service workflow optimization'
    ],
    'toby-technical': [
      'Code development and debugging',
      'API integrations',
      'Technical architecture'
    ],
    'wex-intelligence': [
      'Strategic market intelligence',
      'Competitive analysis reports',
      'Business insights synthesis',
      'Trend analysis and forecasting'
    ]
  }
  
  return agentBestFor[agent.id] || []
}

/**
 * Generate delegation recommendation based on task analysis
 */
export function generateDelegationRecommendation(
  task: string, 
  capabilities: AgentCapability[]
): {
  recommended: AgentCapability | null
  reasoning: string
  alternatives: AgentCapability[]
} {
  const taskLower = task.toLowerCase()
  
  // Score each agent based on how well they match the task
  const scores = capabilities.map(agent => {
    let score = 0
    const reasoning: string[] = []
    
    // Check if task matches what they can handle
    agent.canHandle.forEach(capability => {
      if (taskLower.includes(capability.toLowerCase())) {
        score += 3
        reasoning.push(`Can handle: ${capability}`)
      }
    })
    
    // Check if task matches what they're best for
    agent.bestFor.forEach(strength => {
      if (taskLower.includes(strength.toLowerCase())) {
        score += 5
        reasoning.push(`Best for: ${strength}`)
      }
    })
    
    // Penalize if task matches what they shouldn't handle
    agent.shouldNotHandle.forEach(exclusion => {
      if (taskLower.includes(exclusion.toLowerCase())) {
        score -= 3
        reasoning.push(`Should not handle: ${exclusion}`)
      }
    })
    
    // Check tool relevance
    agent.tools.forEach(tool => {
      tool.useCases.forEach(useCase => {
        if (taskLower.includes(useCase.toLowerCase())) {
          score += 2
          reasoning.push(`Tool match: ${tool.name} for ${useCase}`)
        }
      })
    })
    
    return { agent, score, reasoning }
  })
  
  // Sort by score
  scores.sort((a, b) => b.score - a.score)
  
  const recommended = scores[0]?.score > 0 ? scores[0].agent : null
  const alternatives = scores.slice(1, 3).filter(s => s.score > 0).map(s => s.agent)
  
  const reasoning = recommended 
    ? `Recommended ${recommended.agentName} because: ${scores[0].reasoning.join(', ')}`
    : 'No clear specialization match found'
  
  return {
    recommended,
    reasoning,
    alternatives
  }
}
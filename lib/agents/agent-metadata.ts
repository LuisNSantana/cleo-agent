/**
 * Agent metadata utilities for UI display
 * Maps agent IDs to human-readable names and avatars
 */

export interface AgentMetadata {
  id: string
  name: string
  avatar?: string
  color?: string
  emoji?: string
}

// Agent display metadata
export const AGENT_METADATA: Record<string, AgentMetadata> = {
  'cleo-supervisor': {
    id: 'cleo-supervisor',
    name: 'Cleo',
    avatar: '/img/kyliologo.png',
    color: '#7C3AED',
    emoji: '🤖'
  },
  'apu-support': {
    id: 'apu-support',
    name: 'Apu',
    avatar: '/img/agents/apu4.png',
    color: '#059669',
    emoji: '🔍'
  },
  'emma-ecommerce': {
    id: 'emma-ecommerce',
    name: 'Emma',
    avatar: '/img/agents/emma4.png',
    color: '#FF6B6B',
    emoji: '🛍️'
  },
  'toby-technical': {
    id: 'toby-technical',
    name: 'Toby',
    avatar: '/img/agents/toby4.png',
    color: '#3B82F6',
    emoji: '💻'
  },
  'ami-creative': {
    id: 'ami-creative',
    name: 'Ami',
    avatar: '/img/agents/ami4.png',
    color: '#F59E0B',
    emoji: '🎨'
  },
  'peter-financial': {
    id: 'peter-financial', 
    name: 'Peter',
    avatar: '/img/agents/peter4.png',
    color: '#10B981',
    emoji: '�'
  },
  'wex-intelligence': {
    id: 'wex-intelligence',
    name: 'Wex',
    avatar: '/img/agents/wex4.png',
    color: '#10B981',
    emoji: '🌐'
  },
  'skyvern-agent': {
    id: 'skyvern-agent',
    name: 'Skyvern',
    avatar: '/img/agents/wex4.png', // Using wex avatar as placeholder for now
    color: '#6366F1',
    emoji: '🕸️'
  },
  'jenn-community': {
    id: 'jenn-community',
    name: 'Jenn',
    avatar: '/img/agents/nora4.png', // Placeholder avatar
    color: '#E879F9',
    emoji: '💬'
  },
  'nora-medical': {
    id: 'nora-medical',
    name: 'Nora',
    avatar: '/img/agents/nora4.png',
    color: '#0EA5E9',
    emoji: '🩺'
  },
  'luna-content': {
    id: 'luna-content',
    name: 'Luna',
    avatar: '/img/agents/nora4.png', // Using same avatar for now
    color: '#F472B6',
    emoji: '✨'
  },
  'zara-analytics': {
    id: 'zara-analytics',
    name: 'Zara',
    avatar: '/img/agents/nora4.png', // Using same avatar for now
    color: '#FB7185',
    emoji: '📊'
  },
  'viktor-publisher': {
    id: 'viktor-publisher',
    name: 'Viktor',
    avatar: '/img/agents/nora4.png', // Using same avatar for now
    color: '#EC4899',
    emoji: '🚀'
  }
}

/**
 * Get agent display metadata by ID
 */
export function getAgentMetadata(agentId: string): AgentMetadata {
  // Handle legacy IDs and variations
  const normalizedId = normalizeAgentId(agentId)
  
  return AGENT_METADATA[normalizedId] || {
    id: agentId,
    name: formatAgentName(agentId),
    emoji: '🤖'
  }
}

/**
 * Normalize agent ID to standard format
 */
function normalizeAgentId(agentId: string): string {
  // Map common variations to standard IDs
  const idMap: Record<string, string> = {
    'cleo': 'cleo-supervisor',
    'apu': 'apu-support',

    'emma': 'emma-ecommerce',
    'toby': 'toby-technical',
    'ami': 'ami-creative',
    'peter': 'peter-financial',
    'peter-workspace': 'peter-financial',
    'peter-google': 'peter-financial',
    'peter-advisor': 'peter-financial',
    'peter-finance': 'peter-financial',
    'wex': 'wex-intelligence',
    'skyvern': 'skyvern-agent',
    'nora': 'nora-medical',
    'jenn': 'jenn-community',
  'luna': 'luna-content',
  'luna-content-creator': 'luna-content',
  'zara': 'zara-analytics',
  'zara-analytics-specialist': 'zara-analytics',
  'viktor': 'viktor-publisher',
  'viktor-publishing-specialist': 'viktor-publisher',
  'apu-support': 'apu-support',
  'nora-community': 'jenn-community',
  'jenn-community': 'jenn-community',
  'nora-medical': 'nora-medical',
  'ami-creative': 'ami-creative',
  'emma-ecommerce': 'emma-ecommerce',
  'toby-technical': 'toby-technical',
  'astra-email': 'astra-email'
  }
  
  return idMap[agentId.toLowerCase()] || agentId
}

/**
 * Format agent ID to human-readable name
 */
function formatAgentName(agentId: string): string {
  // Extract name from ID patterns like "apu-support" -> "Apu"
  const name = agentId.split('-')[0]
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

/**
 * Get all agent metadata
 */
export function getAllAgentMetadata(): AgentMetadata[] {
  return Object.values(AGENT_METADATA)
}

/**
 * Check if agent has avatar
 */
export function hasAvatar(agentId: string): boolean {
  const metadata = getAgentMetadata(agentId)
  return !!metadata.avatar
}

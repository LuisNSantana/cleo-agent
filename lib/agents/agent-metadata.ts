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

// Cache for custom agents loaded dynamically
const customAgentCache = new Map<string, AgentMetadata>()

// Agent display metadata
export const AGENT_METADATA: Record<string, AgentMetadata> = {
  'cleo-supervisor': {
    id: 'cleo-supervisor',
    name: 'Ankie',
    avatar: '/img/agents/ankie4.png',
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
  'iris-insights': {
    id: 'iris-insights',
    name: 'Iris',
    avatar: '/img/agents/iris4.jpeg',
    color: '#0EA5E9',
    emoji: '🔎'
  },
  'skyvern-agent': {
    id: 'skyvern-agent',
    name: 'Skyvern',
    avatar: '/img/agents/wex4.png', // Using wex avatar as placeholder (no dedicated skyvern image)
    color: '#6366F1',
    emoji: '🕸️'
  },
  'jenn-community': {
    id: 'jenn-community',
    name: 'Jenn',
    avatar: '/img/agents/jenn4.png',
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
    avatar: '/img/agents/nora4.png', // Using nora avatar (no dedicated luna image)
    color: '#F472B6',
    emoji: '✨'
  },
  'zara-analytics': {
    id: 'zara-analytics',
    name: 'Zara',
    avatar: '/img/agents/nora4.png', // Using nora avatar (no dedicated zara image)
    color: '#FB7185',
    emoji: '📊'
  },
  'viktor-publisher': {
    id: 'viktor-publisher',
    name: 'Viktor',
    avatar: '/img/agents/toby4.png', // Using toby avatar (no dedicated viktor image)
    color: '#EC4899',
    emoji: '🚀'
  },
  'astra-email': {
    id: 'astra-email',
    name: 'Astra',
    avatar: '/img/agents/astra4.png',
    color: '#A78BFA',
    emoji: '✉️'
  },
  'notion-agent': {
    id: 'notion-agent',
    name: 'Notion Agent',
    avatar: '/img/agents/ami4.png', // Using ami avatar (parent agent)
    color: '#000000',
    emoji: '📝'
  }
}

/**
 * Register a custom agent in the cache (called by agent discovery)
 */
export function registerCustomAgent(agent: { id: string; name: string; avatar?: string; color?: string }) {
  customAgentCache.set(agent.id, {
    id: agent.id,
    name: agent.name,
    avatar: agent.avatar,
    color: agent.color,
    emoji: '🤖'
  })
}

/**
 * Get agent display metadata by ID
 * Enhanced to support agentName override for custom/dynamic agents
 */
export function getAgentMetadata(agentId: string, agentName?: string): AgentMetadata {
  // Handle legacy IDs and variations
  const normalizedId = normalizeAgentId(agentId)
  
  // 1. Check predefined agents
  const defaultMeta = AGENT_METADATA[normalizedId]
  if (defaultMeta) {
    return defaultMeta
  }

  // 1.5. If the agentId is not recognized (often a UUID for dynamically loaded agents),
  // fall back to resolving by name when it matches a known predefined agent.
  // This fixes cases where delegation uses UUID agent IDs but still reports agentName.
  if (agentName) {
    const byName = resolveKnownAgentIdFromName(agentName)
    if (byName) {
      const metaByName = AGENT_METADATA[byName]
      if (metaByName) return metaByName
    }
  }
  
  // 2. Check custom agent cache (for dynamic agents)
  const cachedMeta = customAgentCache.get(agentId)
  if (cachedMeta) {
    return cachedMeta
  }
  
  // 3. For unknown agents, use provided name or format from ID
  return {
    id: agentId,
    name: agentName || formatAgentName(agentId),
    emoji: '🤖'
  }
}

function resolveKnownAgentIdFromName(agentName: string): string | null {
  const key = (agentName || '').trim().toLowerCase()
  if (!key) return null

  const nameMap: Record<string, string> = {
    ankie: 'cleo-supervisor',
    cleo: 'cleo-supervisor',
    apu: 'apu-support',
    emma: 'emma-ecommerce',
    toby: 'toby-technical',
    ami: 'ami-creative',
    peter: 'peter-financial',
    wex: 'wex-intelligence',
    iris: 'iris-insights',
    astra: 'astra-email',
    jenn: 'jenn-community',
    nora: 'nora-medical',
    luna: 'luna-content',
    zara: 'zara-analytics',
    viktor: 'viktor-publisher',
  }

  return nameMap[key] || null
}

/**
 * Normalize agent ID to standard format
 */
function normalizeAgentId(agentId: string): string {
  const raw = (agentId || '').trim()
  if (!raw) return agentId

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
  'astra-email': 'astra-email',
  'astra': 'astra-email',
  'iris': 'iris-insights',
  'iris-insights': 'iris-insights',
  'notion': 'notion-agent',
  'notion-agent': 'notion-agent'
  }

  // Normalize common tool-name derived ids (underscored) back to hyphenated form
  const key = raw.toLowerCase().replace(/_/g, '-')

  return idMap[key] || raw
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

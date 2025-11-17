import type { SupabaseClient } from '@supabase/supabase-js'

type Supabase = SupabaseClient<any, 'public', any>

type AgentMappingCacheEntry = {
  data: Record<string, string>
  expiresAt: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const CACHE_KEY_GLOBAL = '__predefined__'
const agentMapCache = new Map<string, AgentMappingCacheEntry>()

type MappingOptions = {
  userId?: string | null
  supabase?: Supabase | null
}

/**
 * Normalize IDs to tool-safe format (letters, numbers, underscores)
 */
function sanitizeAgentId(id: string): string {
  return (id || '').replace(/[^a-zA-Z0-9]/g, '_')
}

/**
 * Get dynamic agent mapping from Supabase (scoped per user)
 * Returns a mapping of agent identifiers (name/id) to delegate tool names
 */
export async function getDynamicAgentMapping(options: MappingOptions = {}): Promise<Record<string, string>> {
  const { userId, supabase } = options
  const cacheKey = userId || CACHE_KEY_GLOBAL
  const now = Date.now()
  const cached = agentMapCache.get(cacheKey)
  
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const baseMap: Record<string, string> = { ...getStaticAgentMapping() }

  // Without a valid user/supabase context, return predefined mapping only
  if (!userId || !supabase) {
    agentMapCache.set(cacheKey, { data: baseMap, expiresAt: now + CACHE_TTL })
    return baseMap
  }

  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DYNAMIC DELEGATION] Failed to fetch user agents for mapping:', error)
      agentMapCache.set(cacheKey, { data: baseMap, expiresAt: now + CACHE_TTL })
      return baseMap
    }

    for (const agent of agents || []) {
      if (!agent?.id) continue
      const toolName = `delegate_to_${sanitizeAgentId(agent.id)}`

      if (agent.name) {
        baseMap[agent.name.toLowerCase()] = toolName
      }

      // Allow lookups by raw UUID or sanitized form for safety
      baseMap[agent.id.toLowerCase()] = toolName
      baseMap[sanitizeAgentId(agent.id).toLowerCase()] = toolName
    }

    agentMapCache.set(cacheKey, { data: baseMap, expiresAt: now + CACHE_TTL })
    return baseMap
  } catch (error) {
    console.error('[DYNAMIC DELEGATION] Error building agent mapping:', error)
    agentMapCache.set(cacheKey, { data: baseMap, expiresAt: now + CACHE_TTL })
    return baseMap
  }
}

/**
 * Static fallback mapping for known agents
 */
function getStaticAgentMapping(): Record<string, string> {
  return {
    'cleo': 'delegate_to_cleo',
    'ami': 'delegate_to_ami',
    'peter': 'delegate_to_peter',
    'emma': 'delegate_to_emma',
    'apu': 'delegate_to_apu',
    'wex': 'delegate_to_wex',
    'astra': 'delegate_to_astra',
    'notion-agent': 'delegate_to_notion_agent',
    'toby': 'delegate_to_toby'
  }
}

/**
 * Clear the agent mapping cache to force refresh
 */
export function clearAgentMappingCache(userId?: string | null): void {
  if (userId) {
    agentMapCache.delete(userId)
  } else {
    agentMapCache.clear()
  }
  console.log('🔄 [DYNAMIC DELEGATION] Agent mapping cache cleared', userId ? `(user: ${userId})` : '')
}

/**
 * Get all available agent names from database
 */
export async function getAvailableAgentNames(options: MappingOptions = {}): Promise<string[]> {
  const map = await getDynamicAgentMapping(options)
  return Object.keys(map)
}

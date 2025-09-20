import { createClient } from '@/lib/supabase/server-admin'

// Cache for agent mapping to avoid repeated DB queries
let agentMapCache: Record<string, string> | null = null
let lastCacheUpdate = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get dynamic agent mapping from database
 * Returns a mapping of agent names to their delegation tool names
 */
export async function getDynamicAgentMapping(): Promise<Record<string, string>> {
  const now = Date.now()
  
  // Return cached mapping if still valid
  if (agentMapCache && (now - lastCacheUpdate) < CACHE_TTL) {
    return agentMapCache
  }

  try {
    const supabase = createClient()
    
    // Get all agents from database
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, name')
    
    if (error) {
      console.error('Error fetching agents for dynamic mapping:', error)
      return getStaticAgentMapping()
    }

    if (!agents || agents.length === 0) {
      console.warn('No agents found in database, using static mapping')
      return getStaticAgentMapping()
    }

    // Build dynamic mapping
    const dynamicMap: Record<string, string> = {}
    
    agents.forEach(agent => {
      if (agent.name && agent.id) {
        const lowerName = agent.name.toLowerCase()
        const toolName = `delegate_to_${agent.id.replace(/[^a-zA-Z0-9]/g, '_')}`
        dynamicMap[lowerName] = toolName
      }
    })

    // Update cache
    agentMapCache = dynamicMap
    lastCacheUpdate = now

    console.log('🔄 [DYNAMIC DELEGATION] Updated agent mapping:', Object.keys(dynamicMap))
    return dynamicMap

  } catch (error) {
    console.error('Error building dynamic agent mapping:', error)
    return getStaticAgentMapping()
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
export function clearAgentMappingCache(): void {
  agentMapCache = null
  lastCacheUpdate = 0
  console.log('🔄 [DYNAMIC DELEGATION] Agent mapping cache cleared')
}

/**
 * Get all available agent names from database
 */
export async function getAvailableAgentNames(): Promise<string[]> {
  try {
    const supabase = createClient()
    
    const { data: agents, error } = await supabase
      .from('agents')
      .select('name')
      .order('name')
    
    if (error) {
      console.error('Error fetching agent names:', error)
      return ['ami', 'peter', 'emma', 'apu', 'wex', 'astra'] // fallback
    }

    return agents?.map(a => a.name?.toLowerCase()).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting available agent names:', error)
    return ['ami', 'peter', 'emma', 'apu', 'wex', 'astra'] // fallback
  }
}
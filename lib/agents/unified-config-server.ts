/**
 * Server-Side Unified Agent Management
 * Server-only interface for agent operations with database access
 */

import { getAgentByIdForUser, getAllAgentsForUser } from './unified-service'
import { ALL_PREDEFINED_AGENTS, getPredefinedAgentById } from './predefined'
import type { AgentConfig } from './types'
import type { UnifiedAgent } from './unified-types'

/**
 * Transform UnifiedAgent to AgentConfig for backward compatibility
 */
function transformToAgentConfig(unifiedAgent: UnifiedAgent): AgentConfig {
  return {
    id: unifiedAgent.id,
    name: unifiedAgent.name,
    description: unifiedAgent.description || '',
    role: unifiedAgent.role as any,
    model: unifiedAgent.model,
    temperature: unifiedAgent.temperature || 0.7,
    maxTokens: unifiedAgent.maxTokens || 4000,
    tools: unifiedAgent.tools || [],
    prompt: unifiedAgent.systemPrompt,
    color: unifiedAgent.color || '#FF6B6B',
    icon: unifiedAgent.icon || '🤖',
    isSubAgent: unifiedAgent.isSubAgent || false,
    parentAgentId: unifiedAgent.parentAgentId || undefined
  }
}

/**
 * Get agent by ID - Predefined-first approach
 */
export async function getAgentById(id: string, userId?: string): Promise<AgentConfig | undefined> {
  try {
    if (!userId) {
      console.warn('🔍 No userId provided for getAgentById, using default user')
      userId = 'default-user'
    }

    console.log('🔍 Looking for agent:', id, 'for user:', userId)
    
    // First check predefined agents (immutable system agents)
    console.log('🔍 Checking predefined agents for:', id)
    const predefinedAgent = getPredefinedAgentById(id)
    if (predefinedAgent) {
      console.log('🔍 Found predefined agent:', predefinedAgent.name)
      return predefinedAgent
    }
    
    // Then check user's custom agents in database
    const unifiedAgent = await getAgentByIdForUser(id, userId)
    
    if (unifiedAgent) {
      console.log('🔍 Found user agent in database:', unifiedAgent.name)
      return transformToAgentConfig(unifiedAgent)
    }

    console.warn(`🔍 Agent not found: ${id}`)
    return undefined
  } catch (error) {
    console.error('🔍 Error getting agent by ID:', error)
    return undefined
  }
}

/**
 * Get all agents for a user - Combines predefined + user custom agents
 */
export async function getAllAgents(userId?: string): Promise<AgentConfig[]> {
  try {
    if (!userId) {
      console.warn('🔍 No userId provided for getAllAgents, using default user')
      userId = 'default-user'
    }

    console.log('🔍 Getting all agents for user:', userId)
  // If userId is not a UUID, skip DB fetch to avoid errors in server logs
  const isUUID = (v: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)

    // Start with all predefined agents (immutable system agents)
    const predefinedAgents: AgentConfig[] = [...ALL_PREDEFINED_AGENTS]
    console.log(`🔍 Found ${predefinedAgents.length} predefined agents`)
    
    // Get user's custom agents from database
  const unifiedAgents = isUUID(userId) ? await getAllAgentsForUser(userId) : []
    const userAgents = unifiedAgents.map(transformToAgentConfig)
    console.log(`🔍 Found ${userAgents.length} user custom agents`)
    
    // Combine both lists
    const allAgents = [...predefinedAgents, ...userAgents]
    console.log(`🔍 Total agents for user ${userId}: ${allAgents.length}`)
    
    return allAgents
  } catch (error) {
    console.error('🔍 Error getting all agents:', error)
    // Fallback to predefined agents only
    return [...ALL_PREDEFINED_AGENTS]
  }
}

/**
 * Get agent by name (for backward compatibility)
 */
export async function getAgentByName(name: string, userId?: string): Promise<AgentConfig | undefined> {
  const allAgents = await getAllAgents(userId)
  return allAgents.find(agent => 
    agent.name.toLowerCase() === name.toLowerCase()
  )
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// These provide synchronous access for orchestrators that haven't been migrated yet
// TODO: Migrate orchestrators to async and remove these functions
// ============================================================================

/**
 * @deprecated Legacy synchronous access - orchestrators only
 */
export function getAllAgentsSync(): AgentConfig[] {
  console.warn('⚠️  Using legacy sync access - migrate orchestrator to async when possible')
  // Return predefined agents only to avoid pulling legacy static config
  return [...ALL_PREDEFINED_AGENTS]
}

/**
 * @deprecated Legacy synchronous access - orchestrators only  
 */
export function getAgentByIdSync(id: string): AgentConfig | undefined {
  console.warn('⚠️  Using legacy sync access - migrate orchestrator to async when possible')
  // Return from predefined agents only to avoid pulling legacy static config
  return getPredefinedAgentById(id)
}

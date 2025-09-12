/**
 * Server-Side Unified Agent Management
 * Server-only interface for agent operations with database access
 */

import { getAgentByIdForUser, getAllAgentsForUser, ensureDefaultAgentsForUser } from './unified-service'
import { getAllAgents as getStaticAgents, getAgentById as getStaticAgentById } from './config'
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
    icon: unifiedAgent.icon || '🤖'
  }
}

/**
 * Get agent by ID - Database-first approach with automatic default agent creation
 */
export async function getAgentById(id: string, userId?: string): Promise<AgentConfig | undefined> {
  try {
    if (!userId) {
      console.warn('🔍 No userId provided for getAgentById, using default user')
      userId = 'default-user'
    }

    console.log('🔍 Looking for agent:', id, 'for user:', userId)
    
    // Ensure default agents exist for this user
    await ensureDefaultAgentsForUser(userId)
    
    // Get agent from database
    const unifiedAgent = await getAgentByIdForUser(id, userId)
    
    if (unifiedAgent) {
      console.log('🔍 Found agent in database:', unifiedAgent.name)
      return transformToAgentConfig(unifiedAgent)
    }

    console.warn(`🔍 Agent not found in database: ${id}`)
    
    // Fallback: Check predefined agents (includes sub-agents)
    console.log('🔍 Checking predefined agents for:', id)
    const predefinedAgent = getPredefinedAgentById(id)
    if (predefinedAgent) {
      console.log('🔍 Found predefined agent:', predefinedAgent.name)
      return predefinedAgent
    }

    console.warn(`🔍 Agent not found in predefined agents either: ${id}`)
    return undefined
  } catch (error) {
    console.error('🔍 Error getting agent by ID:', error)
    return undefined
  }
}

/**
 * Get all agents for a user - Database-first with automatic default agent creation
 */
export async function getAllAgents(userId?: string): Promise<AgentConfig[]> {
  try {
    if (!userId) {
      console.warn('🔍 No userId provided for getAllAgents, using default user')
      userId = 'default-user'
    }

    console.log('🔍 Getting all agents for user:', userId)
    
    // Ensure default agents exist for this user
    await ensureDefaultAgentsForUser(userId)
    
    // Get all agents from database
    const unifiedAgents = await getAllAgentsForUser(userId)
    
    console.log(`🔍 Found ${unifiedAgents.length} agents for user ${userId}`)
    
    return unifiedAgents.map(transformToAgentConfig)
  } catch (error) {
    console.error('🔍 Error getting all agents:', error)
    return []
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
  return getStaticAgents()
}

/**
 * @deprecated Legacy synchronous access - orchestrators only  
 */
export function getAgentByIdSync(id: string): AgentConfig | undefined {
  console.warn('⚠️  Using legacy sync access - migrate orchestrator to async when possible')
  return getStaticAgentById(id)
}

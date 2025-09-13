/**
 * Unified Agent Management
 * Environment-aware interface that routes to client or server implementations
 */

import { ALL_PREDEFINED_AGENTS, getPredefinedAgentById } from './predefined'
import type { AgentConfig } from './types'

// Check if we're in a server environment
const isServer = typeof window === 'undefined'

/**
 * Get agent by ID - Environment-aware routing
 */
export async function getAgentById(id: string, userId?: string): Promise<AgentConfig | undefined> {
  if (isServer) {
    // Dynamic import for server-side operations
    const { getAgentById: getAgentByIdServer } = await import('./unified-config-server')
    return getAgentByIdServer(id, userId)
  } else {
    // Client-side: use predefined agents only
    console.warn('🔍 Client-side getAgentById - using predefined agents only')
    return getPredefinedAgentById(id)
  }
}

/**
 * Get all agents for a user - Environment-aware routing
 */
export async function getAllAgents(userId?: string): Promise<AgentConfig[]> {
  if (isServer) {
    // Dynamic import for server-side operations
    const { getAllAgents: getAllAgentsServer } = await import('./unified-config-server')
    return getAllAgentsServer(userId)
  } else {
    // Client-side: use predefined agents only
    console.warn('🔍 Client-side getAllAgents - using predefined agents only')
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
  return [...ALL_PREDEFINED_AGENTS]
}

/**
 * @deprecated Legacy synchronous access - orchestrators only  
 */
export function getAgentByIdSync(id: string): AgentConfig | undefined {
  console.warn('⚠️  Using legacy sync access - migrate orchestrator to async when possible')
  return getPredefinedAgentById(id)
}

/**
 * Unified Agent Management
 * Environment-aware interface that routes to client or server implementations
 */

import { getAllAgents as getStaticAgents, getAgentById as getStaticAgentById } from './config'
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
    // Client-side: use static agents only for now
    console.warn('🔍 Client-side getAgentById - using static agents only')
    return getStaticAgentById(id)
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
    // Client-side: use static agents only for now
    console.warn('🔍 Client-side getAllAgents - using static agents only')
    return getStaticAgents()
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

/**
 * Client-Side Unified Agent Management
 * Client-safe interface for agent operations without server dependencies
 */

import { getAllAgents as getStaticAgents, getAgentById as getStaticAgentById } from './config'
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
 * Client-safe agent management functions
 * These will use static config as fallback until proper client-side API calls are implemented
 */

/**
 * Get all agents for client-side display (static only for now)
 * For full functionality including database agents, use server actions or API routes
 */
export async function getAllAgentsClient(): Promise<AgentConfig[]> {
  // For now, return static agents only
  // TODO: Implement proper client-side API calls to get database agents
  const staticAgents = getStaticAgents()
  return staticAgents
}

/**
 * Get agent by ID for client-side display (static only for now)
 * For full functionality including database agents, use server actions or API routes
 */
export async function getAgentByIdClient(agentId: string): Promise<AgentConfig | null> {
  // For now, search in static agents only
  // TODO: Implement proper client-side API calls to get database agents
  const staticAgent = getStaticAgentById(agentId)
  return staticAgent || null
}

/**
 * Legacy compatibility functions that use static config only
 * These maintain the same interface as the server version but are client-safe
 */

export async function getAllAgentsForUser(): Promise<AgentConfig[]> {
  console.warn('getAllAgentsForUser called on client-side, returning static agents only')
  return getAllAgentsClient()
}

export async function getAgentByIdForUser(agentId: string): Promise<AgentConfig | null> {
  console.warn('getAgentByIdForUser called on client-side, returning static agent only')
  return getAgentByIdClient(agentId)
}

export async function ensureDefaultAgentsForUser(): Promise<void> {
  console.warn('ensureDefaultAgentsForUser called on client-side, no operation performed')
  // No-op on client side
}

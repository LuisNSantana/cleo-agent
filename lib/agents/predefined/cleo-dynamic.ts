/**
 * Cleo Dynamic Configuration (Server-only)
 * 
 * This file contains server-only code for dynamic agent discovery.
 * It should NEVER be imported in client-side code.
 */

import { AgentConfig } from '../types'
import { getCleoPrompt, sanitizeModelName } from '@/lib/prompts'
import { CLEO_AGENT } from './cleo'

/**
 * Get Cleo configuration with dynamically discovered agents
 * This function should ONLY be called on the server side
 */
export async function getCleoDynamicConfig(userId?: string): Promise<AgentConfig> {
  try {
    // Only try dynamic discovery in server context
    if (typeof window !== 'undefined') {
      // Client-side: return static configuration
      return CLEO_AGENT
    }
    
    // Dynamic imports to avoid build issues
    const { getAgentDiscoveryService } = await import('../dynamic/agent-discovery')
    const { EventEmitter } = await import('../core/event-emitter')
    
    const eventEmitter = new EventEmitter()
    const discoveryService = getAgentDiscoveryService(eventEmitter)
    
    // Discover all available agents
    await discoveryService.initialize(userId)
    const discoveredAgents = discoveryService.getDiscoveredAgents()
    
    // Get all delegation tool names
    const delegationTools = discoveredAgents.map(agent => agent.delegationToolName)
    
    // Generate enhanced prompt with discovered agents
    const delegationPrompt = discoveryService.generateDelegationPrompt()
    const basePrompt = getCleoPrompt(sanitizeModelName('gpt-4o-mini'), 'default')
    
    return {
      ...CLEO_AGENT,
      tools: [...CLEO_AGENT.tools, ...delegationTools],
      prompt: basePrompt + '\n\n' + delegationPrompt,
    }
  } catch (error) {
    console.error('[Cleo] Error loading dynamic configuration:', error)
    // Fallback to static configuration
    return CLEO_AGENT
  }
}

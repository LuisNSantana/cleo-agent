/**
 * Dynamic Agent Enhancement for Graph Builder
 * 
 * Provides runtime enhancement of agents with dynamically discovered tools
 */

import { AgentConfig } from '../types'
import { getAgentDiscoveryService } from '../dynamic/agent-discovery'
import { EventEmitter } from './event-emitter'
import logger from '@/lib/utils/logger'

// Simple per-user debounce to avoid duplicate registration bursts within short windows
const lastRegistrationByUser = new Map<string, number>()
const REGISTRATION_DEBOUNCE_MS = 60_000 // 60s window

/**
 * Enhance an agent configuration with dynamically discovered tools
 */
export async function enhanceAgentWithDynamicTools(
  agentConfig: AgentConfig,
  userId?: string
): Promise<AgentConfig> {
  try {
    // Only enhance agents that have the useDynamicDiscovery flag
    if (!agentConfig.useDynamicDiscovery) {
      return agentConfig
    }
    
    logger.info(`[DynamicEnhancement] Enhancing ${agentConfig.name} with dynamic tools`)
    
    // Initialize discovery service
    const eventEmitter = new EventEmitter()
    const discoveryService = getAgentDiscoveryService(eventEmitter)
    await discoveryService.initialize(userId)
    
    // Get all discovered agents
    const discoveredAgents = discoveryService.getDiscoveredAgents()
    
    // Get delegation tools for discovered agents
    const delegationTools = discoveredAgents.map(agent => agent.delegationToolName)
    
    // Filter out tools that are already in the agent's tool list
    const existingTools = new Set(agentConfig.tools)
    const newTools = delegationTools.filter(tool => !existingTools.has(tool))
    
    if (newTools.length > 0) {
      logger.info(`[DynamicEnhancement] Adding ${newTools.length} new delegation tools to ${agentConfig.name}`)
    }
    
    // Generate enhanced prompt with delegation information
    let enhancedPrompt = agentConfig.prompt
    if (agentConfig.id === 'cleo-supervisor' || agentConfig.id === 'cleo') {
      const delegationPrompt = discoveryService.generateDelegationPrompt()
      if (delegationPrompt) {
        enhancedPrompt = agentConfig.prompt + '\n\n' + delegationPrompt
      }
    }
    
    // Return enhanced configuration
    return {
      ...agentConfig,
      tools: [...agentConfig.tools, ...newTools],
      prompt: enhancedPrompt
    }
    
  } catch (error) {
    logger.error(`[DynamicEnhancement] Error enhancing ${agentConfig.name}:`, error)
    // Return original config on error
    return agentConfig
  }
}

/**
 * Register dynamic tools globally so they can be executed
 */
export async function registerDynamicTools(userId?: string): Promise<void> {
  try {
    // Idempotency guard: skip if we recently registered for this user
    const key = userId || 'anonymous'
    const now = Date.now()
    const last = lastRegistrationByUser.get(key) || 0
    if (now - last < REGISTRATION_DEBOUNCE_MS) {
      logger.debug('[DynamicEnhancement] Skipping dynamic tool registration (recently registered)', { userId: key, msSinceLast: now - last })
      return
    }
    lastRegistrationByUser.set(key, now)

    logger.info('[DynamicEnhancement] Registering dynamic tools globally')
    
    // Initialize discovery service
    const eventEmitter = new EventEmitter()
    const discoveryService = getAgentDiscoveryService(eventEmitter)
    await discoveryService.initialize(userId)
    
    // Get all delegation tools
    const tools = discoveryService.getDelegationTools()
    
    // Import the global tools registry
    const { tools: appTools } = await import('@/lib/tools')
    
    // Register each tool (count only newly added for accurate logging)
    let newlyRegistered = 0
    for (const [toolName, toolImpl] of Object.entries(tools)) {
      if (!(appTools as any)[toolName]) {
        (appTools as any)[toolName] = toolImpl
        logger.info(`[DynamicEnhancement] Registered tool: ${toolName}`)
        newlyRegistered++
      }
    }
    
    logger.info(`[DynamicEnhancement] Registration summary: discovered=${Object.keys(tools).length}, added=${newlyRegistered}, skipped=${Object.keys(tools).length - newlyRegistered}`)
    
  } catch (error) {
    logger.error('[DynamicEnhancement] Error registering dynamic tools:', error)
  }
}

/**
 * Check if an agent should use dynamic discovery
 */
export function shouldUseDynamicDiscovery(agentConfig: AgentConfig): boolean {
  return agentConfig.useDynamicDiscovery === true ||
         agentConfig.id === 'cleo-supervisor' ||
         agentConfig.id === 'cleo'
}

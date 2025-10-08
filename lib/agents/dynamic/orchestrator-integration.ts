/**
 * Orchestrator Integration for Dynamic Agent Discovery
 * 
 * Enhances the orchestrator with dynamic agent detection and registration
 */

import { AgentConfig } from '../types'
import { AgentDiscoveryService } from './agent-discovery'
import { EventEmitter } from '../core/event-emitter'
import { getCleoDynamicConfig } from '../predefined/cleo'
import logger from '@/lib/utils/logger'

export class DynamicOrchestratorEnhancer {
  private static instance: DynamicOrchestratorEnhancer | null = null
  private discoveryService: AgentDiscoveryService
  private eventEmitter: EventEmitter
  private isInitialized = false
  
  private constructor() {
    this.eventEmitter = new EventEmitter()
    this.discoveryService = AgentDiscoveryService.getInstance(this.eventEmitter)
  }
  
  static getInstance(): DynamicOrchestratorEnhancer {
    if (!DynamicOrchestratorEnhancer.instance) {
      DynamicOrchestratorEnhancer.instance = new DynamicOrchestratorEnhancer()
    }
    return DynamicOrchestratorEnhancer.instance
  }
  
  /**
   * Initialize the dynamic orchestrator with agent discovery
   */
  async initialize(userId?: string): Promise<void> {
    if (this.isInitialized) {
      logger.info('[DynamicOrchestrator] Already initialized, refreshing...')
      await this.discoveryService.refresh(userId)
      return
    }
    
    logger.info('[DynamicOrchestrator] Initializing dynamic orchestrator')
    
    // Initialize discovery service
    await this.discoveryService.initialize(userId)
    
    // Set up event listeners
    this.setupEventListeners()
    
    // Enhance Cleo with dynamic capabilities
    await this.enhanceCleoAgent()
    
    // Register discovered agents with orchestrator
    await this.registerDiscoveredAgents()
    
    this.isInitialized = true
    
    logger.info('[DynamicOrchestrator] Initialization complete')
  }
  
  /**
   * Enhance Cleo agent with dynamic discovery
   */
  private async enhanceCleoAgent(): Promise<void> {
    try {
      // Get enhanced Cleo configuration
      const dynamicCleoConfig = await getCleoDynamicConfig()
      
      // Update Cleo in the orchestrator
      const g = globalThis as any
      if (g.__cleoCoreOrchestrator) {
        // Update Cleo's configuration
        const orchestrator = g.__cleoCoreOrchestrator
        
        // If orchestrator has an updateAgent method, use it
        if (orchestrator.updateAgent) {
          orchestrator.updateAgent('cleo-supervisor', dynamicCleoConfig)
          logger.info('[DynamicOrchestrator] Updated Cleo with dynamic configuration')
        } else {
          // Otherwise, re-register Cleo
          orchestrator.registerRuntimeAgent?.(dynamicCleoConfig)
          logger.info('[DynamicOrchestrator] Re-registered Cleo with dynamic configuration')
        }
      }
      
      // Register dynamic delegation tools
      await this.registerDynamicTools()
      
    } catch (error) {
      logger.error('[DynamicOrchestrator] Error enhancing Cleo:', error)
    }
  }
  
  /**
   * Register discovered agents with the orchestrator
   */
  private async registerDiscoveredAgents(): Promise<void> {
    const discoveredAgents = this.discoveryService.getDiscoveredAgents()
    const g = globalThis as any
    
    if (!g.__cleoCoreOrchestrator) {
      logger.warn('[DynamicOrchestrator] Orchestrator not found')
      return
    }
    
    const orchestrator = g.__cleoCoreOrchestrator
    
    for (const agent of discoveredAgents) {
      try {
        // Convert discovered agent to AgentConfig format
        const agentConfig: AgentConfig = {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          role: 'specialist',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 8192,
          tools: agent.capabilities,
          tags: agent.tags,
          prompt: `You are ${agent.name}. ${agent.description}`,
          color: '#4A90E2',
          icon: '🤖',
          dynamic: true
        }
        
        // Register with orchestrator if not already registered
        if (!orchestrator.getAgent?.(agent.id)) {
          orchestrator.registerRuntimeAgent?.(agentConfig)
          logger.info(`[DynamicOrchestrator] Registered agent: ${agent.name}`)
        }
      } catch (error) {
        logger.error(`[DynamicOrchestrator] Error registering agent ${agent.name}:`, error)
      }
    }
  }
  
  /**
   * Register dynamic delegation tools
   */
  private async registerDynamicTools(): Promise<void> {
    try {
      const tools = this.discoveryService.getDelegationTools()
      const { tools: appTools } = await import('@/lib/tools')
      
      // Register each delegation tool globally
      for (const [toolName, toolImpl] of Object.entries(tools)) {
        (appTools as any)[toolName] = toolImpl
        logger.info(`[DynamicOrchestrator] Registered tool: ${toolName}`)
      }
    } catch (error) {
      logger.error('[DynamicOrchestrator] Error registering dynamic tools:', error)
    }
  }
  
  /**
   * Set up event listeners for dynamic updates
   */
  private setupEventListeners(): void {
    // Listen for new agent registration
    this.eventEmitter.on('agent-registered', async (data: any) => {
      logger.info('[DynamicOrchestrator] New agent registered:', data)
      
      // Re-enhance Cleo to include the new agent
      await this.enhanceCleoAgent()
      
      // Register the new agent with orchestrator
      await this.registerDiscoveredAgents()
    })
    
    // Listen for agent updates
    this.eventEmitter.on('agents-discovered', async (data: any) => {
      logger.info(`[DynamicOrchestrator] Agents discovered: ${data.count} agents`)
      
      // Update Cleo's configuration
      await this.enhanceCleoAgent()
    })
  }
  
  /**
   * Refresh dynamic agent discovery
   */
  async refresh(userId?: string): Promise<void> {
    logger.info('[DynamicOrchestrator] Refreshing agent discovery')
    
    await this.discoveryService.refresh(userId)
    await this.enhanceCleoAgent()
    await this.registerDiscoveredAgents()
    
    logger.info('[DynamicOrchestrator] Refresh complete')
  }
  
  /**
   * Get current discovered agents
   */
  getDiscoveredAgents() {
    return this.discoveryService.getDiscoveredAgents()
  }
  
  /**
   * Get delegation prompt for Cleo
   */
  getDelegationPrompt(): string {
    return this.discoveryService.generateDelegationPrompt()
  }
}

// Export convenience functions
export async function initializeDynamicOrchestrator(userId?: string): Promise<void> {
  const enhancer = DynamicOrchestratorEnhancer.getInstance()
  await enhancer.initialize(userId)
}

export async function refreshDynamicAgents(userId?: string): Promise<void> {
  const enhancer = DynamicOrchestratorEnhancer.getInstance()
  await enhancer.refresh(userId)
}

export function getDynamicAgents() {
  const enhancer = DynamicOrchestratorEnhancer.getInstance()
  return enhancer.getDiscoveredAgents()
}

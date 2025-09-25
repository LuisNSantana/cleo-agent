/**
 * Modular Agent System
 * 
 * Main entry point for the new modular agent architecture.
 * Provides unified interface for predefined and dynamic agents with real-time sync.
 */

export * from './predefined'
export * from './dynamic'
export * from './delegation/index'
export * from './registry'
export * from './dynamic-prompts'
export * from './types'

import { AgentConfig } from './types'
import { agentRegistry, AgentRegistry } from './registry'
import { ALL_PREDEFINED_AGENTS } from './predefined'
import { buildDynamicPrompt } from './dynamic-prompts'
import { generateDelegationToolsForAgent } from './delegation/tools'

/**
 * Modular Agent System Class
 * 
 * Provides high-level interface for managing the complete agent system
 */
export class ModularAgentSystem {
  private static instance: ModularAgentSystem
  private registry: AgentRegistry

  private constructor() {
    this.registry = agentRegistry
  }

  static getInstance(): ModularAgentSystem {
    if (!ModularAgentSystem.instance) {
      ModularAgentSystem.instance = new ModularAgentSystem()
    }
    return ModularAgentSystem.instance
  }

  /**
   * Initialize the modular agent system
   */
  async initialize(userId?: string): Promise<void> {
    await this.registry.syncDatabaseAgents(userId)
    console.log('Modular Agent System initialized')
  }

  /**
   * Get agent with full dynamic capabilities
   */
  async getAgentWithCapabilities(agentId: string, userId: string): Promise<AgentConfig | null> {
    const agent = await this.registry.getAgent(agentId)
    if (!agent) return null

    // Get sub-agents for delegation
    const subAgents = await this.registry.getSubAgents(agentId, userId)
    
    // Update agent with delegation tools
    const updatedAgent = await this.registry.updateAgentDelegationTools(agentId, userId)
    if (!updatedAgent) return agent

    // Build dynamic prompt with tool awareness
    const dynamicPrompt = await buildDynamicPrompt(updatedAgent, subAgents)
    
    return {
      ...updatedAgent,
      prompt: dynamicPrompt
    }
  }

  /**
   * Get all agents available to a user
   */
  async getAllAgents(userId: string): Promise<AgentConfig[]> {
    return this.registry.getAllAgentsForUser(userId)
  }

  /**
   * Get sub-agents for a parent agent
   */
  async getSubAgents(parentAgentId: string, userId: string): Promise<AgentConfig[]> {
    return this.registry.getSubAgents(parentAgentId, userId)
  }

  /**
   * Create a new user agent
   */
  async createAgent(agent: Omit<AgentConfig, 'id'>, userId: string): Promise<AgentConfig> {
    const newAgent: AgentConfig = {
      ...agent,
      id: `user-agent-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      dynamic: true,
      userId
    }
    
    await this.registry.registerAgent(newAgent)
    return newAgent
  }

  /**
   * Create a sub-agent for a parent agent
   */
  async createSubAgent(
    parentAgentId: string, 
    subAgent: Omit<AgentConfig, 'id' | 'isSubAgent' | 'parentAgentId'>,
    userId: string
  ): Promise<AgentConfig> {
    const newSubAgent: AgentConfig = {
      ...subAgent,
      id: `sub-agent-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      isSubAgent: true,
      parentAgentId,
      dynamic: true,
      userId
    }
    
    await this.registry.registerAgent(newSubAgent)
    
    // Refresh delegation tools for parent agent
    await this.refreshAgentCapabilities(parentAgentId, userId)
    
    return newSubAgent
  }

  /**
   * Refresh agent capabilities (tools, prompts, delegation)
   */
  async refreshAgentCapabilities(agentId: string, userId: string): Promise<void> {
    await this.registry.updateAgentDelegationTools(agentId, userId)
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    return {
      registry: this.registry.getStats(),
      predefined: ALL_PREDEFINED_AGENTS.length
    }
  }

  /**
   * Subscribe to agent registry changes
   */
  subscribe(callback: (agents: AgentConfig[]) => void) {
    return this.registry.subscribe(callback)
  }

  /**
   * Check if agent has delegation capabilities
   */
  async hasDelegationCapabilities(agentId: string, userId: string): Promise<boolean> {
    const subAgents = await this.getSubAgents(agentId, userId)
    return subAgents.length > 0
  }

  /**
   * Get delegation tools for an agent
   */
  async getDelegationTools(agentId: string, userId: string): Promise<string[]> {
    return generateDelegationToolsForAgent(agentId, userId).then(tools => 
      tools.map(tool => tool.name)
    )
  }

  /**
   * Force sync with database
   */
  async syncWithDatabase(userId?: string): Promise<void> {
    await this.registry.syncDatabaseAgents(userId)
  }
}

/**
 * Global modular agent system instance
 */
export const modularAgentSystem = ModularAgentSystem.getInstance()

/**
 * Utility functions for common operations
 */
export async function initializeModularAgentSystem(userId?: string): Promise<void> {
  await modularAgentSystem.initialize(userId)
}

export async function getAgentWithDynamicCapabilities(agentId: string, userId: string): Promise<AgentConfig | null> {
  return modularAgentSystem.getAgentWithCapabilities(agentId, userId)
}

export async function getAllAvailableAgents(userId: string): Promise<AgentConfig[]> {
  return modularAgentSystem.getAllAgents(userId)
}

export async function createDynamicAgent(agent: Omit<AgentConfig, 'id'>, userId: string): Promise<AgentConfig> {
  return modularAgentSystem.createAgent(agent, userId)
}

export async function createSubAgentForParent(
  parentAgentId: string,
  subAgent: Omit<AgentConfig, 'id' | 'isSubAgent' | 'parentAgentId'>,
  userId: string
): Promise<AgentConfig> {
  return modularAgentSystem.createSubAgent(parentAgentId, subAgent, userId)
}

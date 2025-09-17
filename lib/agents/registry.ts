/**
 * Agent Registry System
 * 
 * Central registry that combines predefined agents with dynamic DB agents
 * and manages real-time synchronization for sub-agent discovery and delegation.
 */

import { AgentConfig } from './types'
import { ALL_PREDEFINED_AGENTS, getPredefinedAgentById } from './predefined'
import { getUserAgents, getSubAgentsForParent } from './dynamic'
import { generateDelegationTools } from './delegation'
import { logger } from '@/lib/logger'

export interface AgentRegistryEntry {
  agent: AgentConfig
  source: 'predefined' | 'database'
  lastUpdated: Date
  delegationTools?: string[]
}

/**
 * Central Agent Registry
 * Maintains unified view of all agents (predefined + DB) with real-time sync
 */
export class AgentRegistry {
  private static instance: AgentRegistry
  private registryMap = new Map<string, AgentRegistryEntry>()
  private subscribers = new Set<(agents: AgentConfig[]) => void>()
  private lastSync = new Date(0)
  
  private constructor() {
    this.initializePredefinedAgents()
  }

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry()
    }
    return AgentRegistry.instance
  }

  /**
   * Initialize registry with predefined agents
   */
  private initializePredefinedAgents() {
    for (const agent of ALL_PREDEFINED_AGENTS) {
      this.registryMap.set(agent.id, {
        agent,
        source: 'predefined',
        lastUpdated: new Date(),
        delegationTools: []
      })
    }
  }

  /**
   * Get agent by ID from registry (checks predefined first, then DB)
   */
  async getAgent(agentId: string): Promise<AgentConfig | null> {
    // Check registry cache first
    const cached = this.registryMap.get(agentId)
    if (cached && cached.source === 'predefined') {
      return cached.agent
    }

    // For DB agents, always fetch fresh data
    await this.syncDatabaseAgents()
    const updated = this.registryMap.get(agentId)
    return updated?.agent || null
  }

  /**
   * Get all agents available to a specific user
   */
  async getAllAgentsForUser(userId: string): Promise<AgentConfig[]> {
    await this.syncDatabaseAgents(userId)
    
    const agents: AgentConfig[] = []
    
    for (const entry of this.registryMap.values()) {
      // Include predefined agents
      if (entry.source === 'predefined') {
        agents.push(entry.agent)
      }
      // Include user's own agents and public agents
      else if (entry.source === 'database') {
        const agent = entry.agent
        if (!agent.userId || agent.userId === userId) {
          agents.push(agent)
        }
      }
    }
    
    return agents
  }

  /**
   * Get sub-agents for a specific parent agent
   */
  async getSubAgents(parentAgentId: string, userId: string): Promise<AgentConfig[]> {
    await this.syncDatabaseAgents(userId)
    
    const subAgents: AgentConfig[] = []
    
    for (const entry of this.registryMap.values()) {
      const agent = entry.agent
      if (agent.isSubAgent && agent.parentAgentId === parentAgentId) {
        // Include if it's the user's agent or a public agent
        if (!agent.userId || agent.userId === userId) {
          subAgents.push(agent)
        }
      }
    }
    
    return subAgents
  }

  /**
   * Sync database agents and update registry
   */
  async syncDatabaseAgents(userId?: string) {
    try {
      const dbAgents = await getUserAgents(userId)
      
      // Remove old DB agents from registry
      for (const [id, entry] of this.registryMap.entries()) {
        if (entry.source === 'database') {
          this.registryMap.delete(id)
        }
      }
      
      // Add fresh DB agents to registry
      for (const agent of dbAgents) {
        this.registryMap.set(agent.id, {
          agent,
          source: 'database',
          lastUpdated: new Date(),
          delegationTools: []
        })
      }
      
      this.lastSync = new Date()
      this.notifySubscribers()
    } catch (error) {
      logger.error('REGISTRY', 'Failed to sync database agents', error)
    }
  }

  /**
   * Update agent tools with dynamic delegation capabilities
   */
  async updateAgentDelegationTools(agentId: string, userId: string): Promise<AgentConfig | null> {
    const agent = await this.getAgent(agentId)
    if (!agent) return null

    // Obtener todos los agentes activos del usuario para delegación (excepto el agente actual y sub-agentes)
    await this.syncDatabaseAgents(userId)
    const userAgents: AgentConfig[] = []
    for (const entry of this.registryMap.values()) {
      const a = entry.agent
      if (
        a.userId === userId &&
        a.id !== agentId &&
        !a.isSubAgent
      ) {
        userAgents.push(a)
      }
    }

    // Generar herramientas de delegación para todos los agentes activos del usuario
    const delegationTools = await generateDelegationTools(agent, userAgents)

    // Update agent's tools to include delegation tools
    const updatedAgent: AgentConfig = {
      ...agent,
      tools: [
        ...agent.tools.filter(tool => !tool.startsWith('delegate_to_')),
        ...delegationTools
      ]
    }

    // Persist tools in DB si es agente de base de datos
    try {
      // Lazy import para evitar dependencias circulares
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (supabaseUrl && supabaseKey && agent.userId) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { error } = await supabase
          .from('agents')
          .update({ tools: updatedAgent.tools })
          .eq('id', agentId)
        
        if (error) {
          logger.error('REGISTRY', 'Error actualizando tools en la base de datos', error)
        }
      }
    } catch (err) {
      logger.error('REGISTRY', 'Error conectando con Supabase para actualizar tools', err)
    }

    // Update registry
    const entry = this.registryMap.get(agentId)
    if (entry) {
      entry.agent = updatedAgent
      entry.delegationTools = delegationTools
      entry.lastUpdated = new Date()
    }

    return updatedAgent
  }

  /**
   * Subscribe to registry changes
   */
  subscribe(callback: (agents: AgentConfig[]) => void) {
    this.subscribers.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Notify all subscribers of changes
   */
  private notifySubscribers() {
    const allAgents = Array.from(this.registryMap.values()).map(entry => entry.agent)
    for (const callback of this.subscribers) {
      callback(allAgents)
    }
  }

  /**
   * Register a new agent (for database storage)
   */
  async registerAgent(agent: AgentConfig): Promise<void> {
    // This would typically save to database first
    // For now, just update registry
    this.registryMap.set(agent.id, {
      agent: { ...agent, dynamic: true },
      source: 'database',
      lastUpdated: new Date(),
      delegationTools: []
    })
    
    this.notifySubscribers()
  }

  /**
   * Force refresh all agents
   */
  async refresh(userId?: string) {
    await this.syncDatabaseAgents(userId)
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const predefinedCount = Array.from(this.registryMap.values())
      .filter(entry => entry.source === 'predefined').length
    const databaseCount = Array.from(this.registryMap.values())
      .filter(entry => entry.source === 'database').length
    
    return {
      total: this.registryMap.size,
      predefined: predefinedCount,
      database: databaseCount,
      lastSync: this.lastSync
    }
  }
}

/**
 * Global registry instance
 */
export const agentRegistry = AgentRegistry.getInstance()

/**
 * Utility functions for common operations
 */
export async function getAgentById(agentId: string): Promise<AgentConfig | null> {
  return agentRegistry.getAgent(agentId)
}

export async function getAllAgents(userId: string): Promise<AgentConfig[]> {
  return agentRegistry.getAllAgentsForUser(userId)
}

export async function refreshAgentRegistry(userId?: string) {
  return agentRegistry.refresh(userId)
}

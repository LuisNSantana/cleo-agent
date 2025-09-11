/**
 * Optimized Agent Registry System
 * 
 * Hybrid architecture:
 * - Predefined agents: Always loaded from local config (immutable)
 * - User agents: Loaded from database (mutable)
 * - Unified API: Transparent access to both sources
 */

import { AgentConfig } from './types'
import { ALL_PREDEFINED_AGENTS } from './predefined'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export interface AgentRegistryEntry {
  agent: AgentConfig
  source: 'predefined' | 'database'
  lastUpdated: Date
  delegationTools?: string[]
}

/**
 * Optimized Agent Registry
 * Local agents + DB agents with efficient caching
 */
export class OptimizedAgentRegistry {
  private static instance: OptimizedAgentRegistry
  private predefinedMap = new Map<string, AgentConfig>()
  private userAgentsCache = new Map<string, AgentConfig[]>() // userId -> agents
  private lastUserAgentsSync = new Map<string, Date>() // userId -> last sync
  private readonly CACHE_TTL_MS = 30000 // 30 seconds cache for user agents
  
  private constructor() {
    this.initializePredefinedAgents()
  }

  static getInstance(): OptimizedAgentRegistry {
    if (!OptimizedAgentRegistry.instance) {
      OptimizedAgentRegistry.instance = new OptimizedAgentRegistry()
    }
    return OptimizedAgentRegistry.instance
  }

  /**
   * Initialize predefined agents (one-time, immutable)
   */
  private initializePredefinedAgents() {
    for (const agent of ALL_PREDEFINED_AGENTS) {
      this.predefinedMap.set(agent.id, agent)
    }
    console.log(`🏗️ Initialized ${this.predefinedMap.size} predefined agents`)
  }

  /**
   * Get agent by ID (checks predefined first, then user agents)
   */
  async getAgent(agentId: string, userId?: string): Promise<AgentConfig | null> {
    // Check predefined agents first (always available)
    const predefined = this.predefinedMap.get(agentId)
    if (predefined) {
      return predefined
    }

    // Check user agents if userId provided
    if (userId) {
      const userAgents = await this.getUserAgents(userId)
      return userAgents.find(agent => agent.id === agentId) || null
    }

    return null
  }

  /**
   * Get all agents for a user (predefined + user-created)
   */
  async getAllAgentsForUser(userId: string): Promise<AgentConfig[]> {
    const predefinedAgents = Array.from(this.predefinedMap.values())
    const userAgents = await this.getUserAgents(userId)
    
    return [...predefinedAgents, ...userAgents]
  }

  /**
   * Get user agents with caching
   */
  private async getUserAgents(userId: string): Promise<AgentConfig[]> {
    const now = new Date()
    const lastSync = this.lastUserAgentsSync.get(userId)
    
    // Return cached if still valid
    if (lastSync && (now.getTime() - lastSync.getTime()) < this.CACHE_TTL_MS) {
      return this.userAgentsCache.get(userId) || []
    }

    try {
      const supabase = getSupabaseAdmin()
      
      const { data: dbAgents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('priority', { ascending: true })

      if (error) {
        console.error('Error fetching user agents:', error)
        return this.userAgentsCache.get(userId) || [] // Return cached on error
      }

      // Transform DB agents to AgentConfig
      const userAgents: AgentConfig[] = (dbAgents || []).map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description || '',
        role: agent.role,
        model: agent.model,
        temperature: agent.temperature,
        maxTokens: agent.max_tokens,
        color: agent.color,
        icon: agent.icon,
        tags: Array.isArray(agent.tags) ? agent.tags : [],
        prompt: agent.system_prompt,
        tools: Array.isArray(agent.tools) ? agent.tools : [],
        isDefault: false, // User agents are never default
        priority: agent.priority,
        parentAgentId: agent.parent_agent_id,
        isSubAgent: !!agent.is_sub_agent,
        predefined: false,
        immutable: false,
        dynamic: true,
        userId: agent.user_id
      }))

      // Update cache
      this.userAgentsCache.set(userId, userAgents)
      this.lastUserAgentsSync.set(userId, now)

      return userAgents
    } catch (error) {
      console.error('Error in getUserAgents:', error)
      return this.userAgentsCache.get(userId) || []
    }
  }

  /**
   * Get predefined agents only
   */
  getPredefinedAgents(): AgentConfig[] {
    return Array.from(this.predefinedMap.values())
  }

  /**
   * Get specialist agents (excluding supervisors)
   */
  getSpecialistAgents(): AgentConfig[] {
    return this.getPredefinedAgents().filter(agent => agent.role === 'specialist')
  }

  /**
   * Get supervisor agent
   */
  getSupervisorAgent(): AgentConfig | null {
    return this.getPredefinedAgents().find(agent => agent.role === 'supervisor') || null
  }

  /**
   * Invalidate user agents cache (call after user creates/updates agents)
   */
  invalidateUserCache(userId: string) {
    this.userAgentsCache.delete(userId)
    this.lastUserAgentsSync.delete(userId)
  }

  /**
   * Get agents by role for a user
   */
  async getAgentsByRole(role: string, userId: string): Promise<AgentConfig[]> {
    const allAgents = await this.getAllAgentsForUser(userId)
    return allAgents.filter(agent => agent.role === role)
  }

  /**
   * Check if agent is predefined
   */
  isPredefined(agentId: string): boolean {
    return this.predefinedMap.has(agentId)
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      predefinedAgents: this.predefinedMap.size,
      cachedUsers: this.userAgentsCache.size,
      totalCachedUserAgents: Array.from(this.userAgentsCache.values()).reduce((sum, agents) => sum + agents.length, 0)
    }
  }
}

/**
 * Global optimized registry instance
 */
export const optimizedAgentRegistry = OptimizedAgentRegistry.getInstance()

/**
 * Utility functions for common operations
 */
export async function getAgentById(agentId: string, userId?: string): Promise<AgentConfig | null> {
  return optimizedAgentRegistry.getAgent(agentId, userId)
}

export async function getAllAgentsForUser(userId: string): Promise<AgentConfig[]> {
  return optimizedAgentRegistry.getAllAgentsForUser(userId)
}

export function getPredefinedAgents(): AgentConfig[] {
  return optimizedAgentRegistry.getPredefinedAgents()
}

export function invalidateUserAgentsCache(userId: string) {
  optimizedAgentRegistry.invalidateUserCache(userId)
}

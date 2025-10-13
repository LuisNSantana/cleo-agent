/**
 * Agent Loader Service
 * Optimized agent loading with caching and dynamic discovery
 * Reduces latency for chat responses that don't require delegation
 */

import { AgentConfig } from './types'
import { agentCache } from './agent-cache'
import { getAllAgents } from './unified-config'
import { enrichKeywordsWithAgents } from '@/lib/delegation/intent-heuristics'
import { logger } from '@/lib/utils/logger'

interface LoaderOptions {
  userId?: string
  forceRefresh?: boolean
  includeSubAgents?: boolean
}

class AgentLoaderService {
  private loading = new Map<string, Promise<AgentConfig[]>>()
  
  /**
   * Load agents with optimized caching
   * Returns immediately from cache if available, reducing latency
   */
  async loadAgents(options: LoaderOptions = {}): Promise<AgentConfig[]> {
    const { userId, forceRefresh = false, includeSubAgents = true } = options
    const cacheKey = userId || '__global__'
    
    // Check cache first (fast path for non-delegation queries)
    if (!forceRefresh) {
      const cached = agentCache.get(userId)
      if (cached) {
        logger.debug(`[AgentLoader] Cache hit for ${cacheKey} (${cached.length} agents)`)
        return cached
      }
    }
    
    // Check if already loading (prevent duplicate requests)
    const existingLoad = this.loading.get(cacheKey)
    if (existingLoad) {
      logger.debug(`[AgentLoader] Waiting for existing load for ${cacheKey}`)
      return existingLoad
    }
    
    // Load agents from source
    const loadPromise = this.loadFromSource(userId, includeSubAgents)
    this.loading.set(cacheKey, loadPromise)
    
    try {
      const agents = await loadPromise
      
      // Update cache
      agentCache.set(agents, userId)
      
      // Enrich intent heuristics with agent keywords
      enrichKeywordsWithAgents(agents.map(a => ({
        id: a.id,
        name: a.name,
        tags: a.tags,
        description: a.description
      })))
      
      logger.info(`[AgentLoader] Loaded ${agents.length} agents for ${cacheKey}`)
      
      return agents
    } finally {
      this.loading.delete(cacheKey)
    }
  }
  
  /**
   * Load agents from unified config
   */
  private async loadFromSource(userId?: string, includeSubAgents = true): Promise<AgentConfig[]> {
    try {
      // Get all agents (predefined + user custom)
      const allAgents = await getAllAgents(userId)
      
      // Filter sub-agents if requested
      if (!includeSubAgents) {
        return allAgents.filter(a => !a.isSubAgent)
      }
      
      return allAgents
    } catch (error) {
      logger.error('[AgentLoader] Error loading agents:', error)
      // Fallback to predefined agents only
      const { ALL_PREDEFINED_AGENTS } = await import('./predefined')
      return [...ALL_PREDEFINED_AGENTS]
    }
  }
  
  /**
   * Get delegation tool name for an agent (fast cached lookup)
   */
  getDelegationToolName(agentId: string, userId?: string): string {
    // Try cache first
    const cached = agentCache.getDelegationTool(agentId, userId)
    if (cached) return cached
    
    // Fallback to convention
    return `delegate_to_${agentId.replace(/[^a-zA-Z0-9]/g, '_')}`
  }
  
  /**
   * Preload agents for a user (async, non-blocking)
   */
  async preload(userId?: string): Promise<void> {
    // Fire and forget - load in background
    this.loadAgents({ userId, forceRefresh: false }).catch(err => {
      logger.warn('[AgentLoader] Background preload failed:', err)
    })
  }
  
  /**
   * Invalidate cache for a user (call when agents are created/updated)
   */
  invalidate(userId?: string): void {
    agentCache.invalidate(userId)
    logger.info(`[AgentLoader] Invalidated cache for ${userId || 'global'}`)
  }
}

// Singleton instance
export const agentLoader = new AgentLoaderService()

// Helper for quick access
export async function getAgentsOptimized(userId?: string): Promise<AgentConfig[]> {
  return agentLoader.loadAgents({ userId })
}

/**
 * Agent Cache Service
 * High-performance caching layer for agent discovery and delegation
 * Optimizes response time for non-delegation queries
 */

import { AgentConfig } from './types'
import { logger } from '@/lib/utils/logger'

interface CacheEntry {
  agents: AgentConfig[]
  delegationTools: Map<string, string>
  timestamp: number
}

class AgentCacheService {
  private cache = new Map<string, CacheEntry>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes
  private readonly GLOBAL_KEY = '__global__'
  
  /**
   * Get cached agents for a user (or global if no userId)
   */
  get(userId?: string): AgentConfig[] | null {
    const key = userId || this.GLOBAL_KEY
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if expired
    const age = Date.now() - entry.timestamp
    if (age > this.TTL) {
      this.cache.delete(key)
      return null
    }
    
    return entry.agents
  }
  
  /**
   * Set cached agents for a user
   */
  set(agents: AgentConfig[], userId?: string): void {
    const key = userId || this.GLOBAL_KEY
    
    // Generate delegation tool names map
    const delegationTools = new Map<string, string>()
    for (const agent of agents) {
      if (agent.role !== 'supervisor') {
        const toolName = `delegate_to_${agent.id.replace(/[^a-zA-Z0-9]/g, '_')}`
        delegationTools.set(agent.id, toolName)
      }
    }
    
    this.cache.set(key, {
      agents,
      delegationTools,
      timestamp: Date.now()
    })
    
    logger.debug(`[AgentCache] Cached ${agents.length} agents for ${key}`)
  }
  
  /**
   * Get delegation tool name for an agent
   */
  getDelegationTool(agentId: string, userId?: string): string | null {
    const key = userId || this.GLOBAL_KEY
    const entry = this.cache.get(key)
    return entry?.delegationTools.get(agentId) || null
  }
  
  /**
   * Invalidate cache for a user
   */
  invalidate(userId?: string): void {
    const key = userId || this.GLOBAL_KEY
    this.cache.delete(key)
    logger.debug(`[AgentCache] Invalidated cache for ${key}`)
  }
  
  /**
   * Invalidate all caches
   */
  invalidateAll(): void {
    this.cache.clear()
    logger.debug('[AgentCache] Invalidated all caches')
  }
  
  /**
   * Get cache stats
   */
  getStats() {
    const entries = Array.from(this.cache.entries())
    const now = Date.now()
    
    return {
      totalEntries: this.cache.size,
      entries: entries.map(([key, entry]) => ({
        key,
        agentCount: entry.agents.length,
        age: now - entry.timestamp,
        expired: now - entry.timestamp > this.TTL
      }))
    }
  }
  
  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`[AgentCache] Cleaned ${cleaned} expired entries`)
    }
  }
}

// Singleton instance
export const agentCache = new AgentCacheService()

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    agentCache.cleanup()
  }, 10 * 60 * 1000)
}

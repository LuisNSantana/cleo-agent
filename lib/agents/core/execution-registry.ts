/**
 * Execution Registry Module
 * 
 * Manages the lifecycle and storage of active agent executions using LRU cache.
 * Provides bounded memory management for concurrent executions.
 * 
 * Key features:
 * - LRU cache with max 100 entries and 5min TTL
 * - Automatic eviction of stale executions
 * - Thread-safe access patterns
 */

import { LRUCache } from 'lru-cache'
import { AgentExecution } from '../types'
import logger from '@/lib/utils/logger'

export interface ExecutionRegistryConfig {
  maxExecutions?: number
  ttlMs?: number
}

export class ExecutionRegistry {
  private executions: LRUCache<string, AgentExecution>
  private config: Required<ExecutionRegistryConfig>

  constructor(config: ExecutionRegistryConfig = {}) {
    this.config = {
      maxExecutions: config.maxExecutions ?? 100,
      ttlMs: config.ttlMs ?? 1000 * 60 * 5 // 5 minutes
    }

    this.executions = new LRUCache<string, AgentExecution>({
      max: this.config.maxExecutions,
      ttl: this.config.ttlMs,
      updateAgeOnGet: true,
      updateAgeOnHas: false,
      dispose: (execution, key) => {
        logger.debug('[EXECUTION-REGISTRY]', `🧹 LRU evicted execution: ${key} (${execution.agentId})`)
      }
    })
  }

  /**
   * Register a new execution
   */
  set(executionId: string, execution: AgentExecution): void {
    this.executions.set(executionId, execution)
  }

  /**
   * Get an execution by ID
   */
  get(executionId: string): AgentExecution | undefined {
    return this.executions.get(executionId)
  }

  /**
   * Check if execution exists
   */
  has(executionId: string): boolean {
    return this.executions.has(executionId)
  }

  /**
   * Remove execution from registry
   */
  delete(executionId: string): boolean {
    return this.executions.delete(executionId)
  }

  /**
   * Get all execution IDs (for debugging/monitoring)
   */
  keys(): string[] {
    return Array.from(this.executions.keys())
  }

  /**
   * Get all executions (for iteration)
   */
  values(): AgentExecution[] {
    return Array.from(this.executions.values())
  }

  /**
   * Get execution count
   */
  size(): number {
    return this.executions.size
  }

  /**
   * Clear all executions (use sparingly)
   */
  clear(): void {
    this.executions.clear()
    logger.info('[EXECUTION-REGISTRY]', '🧹 Cleared all executions')
  }

  /**
   * Find executions matching a predicate
   */
  find(predicate: (execution: AgentExecution) => boolean): AgentExecution | undefined {
    for (const execution of this.executions.values()) {
      if (predicate(execution)) {
        return execution
      }
    }
    return undefined
  }

  /**
   * Filter executions by predicate
   */
  filter(predicate: (execution: AgentExecution) => boolean): AgentExecution[] {
    const results: AgentExecution[] = []
    for (const execution of this.executions.values()) {
      if (predicate(execution)) {
        results.push(execution)
      }
    }
    return results
  }

  /**
   * Get memory usage stats
   */
  getStats() {
    return {
      size: this.executions.size,
      max: this.config.maxExecutions,
      ttlMs: this.config.ttlMs,
      utilizationPercent: (this.executions.size / this.config.maxExecutions) * 100
    }
  }
}

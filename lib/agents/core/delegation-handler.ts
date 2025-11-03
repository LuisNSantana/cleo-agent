/**
 * Delegation Handler Module
 * 
 * Manages agent-to-agent delegations with:
 * - Single-flight pattern (prevents duplicate delegations)
 * - Proactive deduplication (not reactive)
 * - Progress tracking and error recovery
 * 
 * Based on best practices from the delegation system analysis.
 */

import { logger } from '@/lib/logger'
import { EventEmitter } from './event-emitter'
import { ExecutionManager } from './execution-manager'
import { InterruptManager } from './interrupt-manager'
import { 
  registerResolver, 
  getResolver, 
  deleteResolver,
  type DelegationResolver 
} from './delegation-context'
import { LRUCache } from 'lru-cache'

export interface DelegationRequest {
  sourceAgent: string
  targetAgent: string
  task: string
  context?: any
  handoffMessage?: string
  priority?: 'low' | 'normal' | 'high'
  sourceExecutionId?: string
  userId?: string
  conversationHistory?: any[]
}

export interface DelegationResult {
  success: boolean
  result?: any
  targetAgent?: string
  continuationHint?: string
  error?: Error
}

/**
 * DelegationHandler - Manages all agent delegations
 * 
 * Uses "single-flight" pattern: if the same delegation is requested multiple times
 * while it's in progress, all callers get the same Promise instead of starting
 * multiple executions.
 */
export class DelegationHandler {
  private activeDelegations: LRUCache<string, Promise<DelegationResult>>
  private delegationHistory: LRUCache<string, DelegationResult>
  // Track child execution IDs for each delegation key so we can clean up interrupts on timeout
  private delegationExecutions = new Map<string, string>()
  private eventEmitter: EventEmitter

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter
    
    // LRU cache for active delegations (max 50, TTL 2min)
    this.activeDelegations = new LRUCache<string, Promise<DelegationResult>>({
      max: 50,
      ttl: 1000 * 60 * 2, // 2 minutes (delegations should complete faster)
      updateAgeOnGet: true,
      dispose: (promise, key) => {
        logger.debug('[DELEGATION]', `🧹 LRU evicted active delegation: ${key}`)
      }
    })
    
    // LRU cache for delegation history (max 200, TTL 10min)
    this.delegationHistory = new LRUCache<string, DelegationResult>({
      max: 200,
      ttl: 1000 * 60 * 10, // 10 minutes
      updateAgeOnGet: false,
      dispose: (result, key) => {
        logger.debug('[DELEGATION]', `🧹 LRU evicted delegation history: ${key}`)
      }
    })
    
    // Listen for child execution start events to track execution IDs
    this.eventEmitter.on('delegation.execution.started', (data: { delegationKey: string; executionId: string }) => {
      if (data.delegationKey && data.executionId) {
        this.delegationExecutions.set(data.delegationKey, data.executionId)
        logger.debug('DELEGATION', `Tracked child execution: ${data.delegationKey} -> ${data.executionId}`)
      }
    })
  }

  /**
   * Delegate a task to another agent (with deduplication)
   */
  async delegateToAgent(request: DelegationRequest): Promise<DelegationResult> {
    const delegationKey = this.createDelegationKey(request)

    logger.debug('DELEGATION', `Delegation requested`, {
      key: delegationKey,
      source: request.sourceAgent,
      target: request.targetAgent
    })

    // SINGLE-FLIGHT PATTERN: Return existing Promise if delegation is already in progress
    if (this.activeDelegations.has(delegationKey)) {
      logger.info('DELEGATION', `Reusing in-flight delegation: ${delegationKey}`)
      return this.activeDelegations.get(delegationKey)!
    }

    // Create new delegation
    const delegationPromise = this.executeDelegation(request)
    
    // Store Promise for deduplication
    this.activeDelegations.set(delegationKey, delegationPromise)

    // Cleanup after completion (success or failure)
    delegationPromise.finally(() => {
      this.activeDelegations.delete(delegationKey)
      logger.debug('DELEGATION', `Delegation completed, removed from active set: ${delegationKey}`)
    })

    return delegationPromise
  }

  /**
   * Execute delegation (private - only called by delegateToAgent)
   */
  private async executeDelegation(request: DelegationRequest): Promise<DelegationResult> {
    const delegationKey = this.createDelegationKey(request)
    
    try {
      // Emit delegation.requested event
      this.eventEmitter.emit('delegation.requested', {
        sourceAgent: request.sourceAgent,
        targetAgent: request.targetAgent,
        task: request.task,
        context: request.context,
        handoffMessage: request.handoffMessage,
        priority: request.priority || 'normal',
        sourceExecutionId: request.sourceExecutionId,
        userId: request.userId,
        conversationHistory: request.conversationHistory || []
      })

      // Emit progress: starting (normalized payload)
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: request.sourceAgent,
        targetAgent: request.targetAgent,
        status: 'starting',
        message: `Delegating to ${request.targetAgent}...`,
        timestamp: new Date().toISOString(),
        sourceExecutionId: request.sourceExecutionId
      })

      // Wait for delegation.completed event (timeout after 5 minutes)
      const result = await this.waitForDelegationCompletion(delegationKey, 300_000)

      // Store in history
      this.delegationHistory.set(delegationKey, result)

      // Emit progress: completed (normalized payload)
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: request.sourceAgent,
        targetAgent: request.targetAgent,
        status: 'completed',
        message: `${request.targetAgent} completed the task`,
        timestamp: new Date().toISOString(),
        sourceExecutionId: request.sourceExecutionId
      })

      logger.info('DELEGATION', `Delegation succeeded: ${delegationKey}`)
      return result

    } catch (error) {
      logger.error('DELEGATION', `Delegation failed: ${delegationKey}`, error)

      // Emit progress: failed (normalized payload)
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: request.sourceAgent,
        targetAgent: request.targetAgent,
        status: 'failed',
        message: `${request.targetAgent} failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        sourceExecutionId: request.sourceExecutionId
      })

      const failureResult: DelegationResult = {
        success: false,
        error: error as Error
      }

      // Store failure in history
      this.delegationHistory.set(delegationKey, failureResult)

      return failureResult
    }
  }

  /**
   * Wait for delegation.completed event or direct resolver
   */
  private waitForDelegationCompletion(
    delegationKey: string,
    timeoutMs: number
  ): Promise<DelegationResult> {
    return new Promise((resolve, reject) => {
      // Register resolver in request-scoped context (AsyncLocalStorage)
      registerResolver(delegationKey, { 
        resolve: (result: any) => {
          logger.debug('DELEGATION', `✅ Direct resolver fired for ${delegationKey}`)
          cleanup()
          this.delegationExecutions.delete(delegationKey)
          resolve({
            success: true,
            result: result.result,
            targetAgent: result.targetAgent,
            continuationHint: result.continuationHint
          })
        },
        reject: (error: Error) => {
          logger.error('DELEGATION', `❌ Resolver rejected for ${delegationKey}:`, error)
          cleanup()
          this.delegationExecutions.delete(delegationKey)
          reject(error)
        }
      })

      const timeout = setTimeout(() => {
        cleanup()
        
        // CRITICAL: Clean up orphaned interrupt when delegation times out
        const childExecutionId = this.delegationExecutions.get(delegationKey)
        if (childExecutionId) {
          logger.warn('DELEGATION', `Delegation timed out, cleaning up orphaned interrupt`, {
            delegationKey,
            childExecutionId
          })
          
          // Clear the interrupt from cache to prevent "processing" state sticking
          try {
            InterruptManager.clearInterrupt(childExecutionId)
            logger.info('DELEGATION', `✅ Cleared orphaned interrupt for ${childExecutionId}`)
          } catch (error) {
            logger.error('DELEGATION', `Failed to clear interrupt for ${childExecutionId}`, error)
          }
          
          // Remove from tracking
          this.delegationExecutions.delete(delegationKey)
        }
        
        reject(new Error(`Delegation ${delegationKey} timed out after ${timeoutMs / 1000}s`))
      }, timeoutMs)

      const completionHandler = (data: any) => {
        const eventKey = this.createDelegationKey({
          sourceAgent: data.sourceAgent,
          targetAgent: data.targetAgent,
          task: data.task
        } as DelegationRequest)

        if (eventKey === delegationKey) {
          cleanup()
          
          // Clean up execution tracking on successful completion
          this.delegationExecutions.delete(delegationKey)
          
          resolve({
            success: true,
            result: data.result,
            targetAgent: data.targetAgent,
            continuationHint: data.continuationHint
          })
        }
      }

      const cleanup = () => {
        clearTimeout(timeout)
        this.eventEmitter.off('delegation.completed', completionHandler)
        deleteResolver(delegationKey)
      }

      this.eventEmitter.on('delegation.completed', completionHandler)
    })
  }

  /**
   * Create unique key for delegation
   * Format: sourceAgent:targetAgent:taskHash
   */
  private createDelegationKey(request: Partial<DelegationRequest>): string {
    const executionId = request.sourceExecutionId || ExecutionManager.getCurrentExecutionId() || 'unknown'
    const source = request.sourceAgent || 'unknown'
    const target = request.targetAgent || 'unknown'
    
    return `${executionId}:${source}:${target}`
  }

  /**
   * Get delegation history for debugging
   */
  getDelegationHistory(): Map<string, DelegationResult> {
    return new Map(this.delegationHistory)
  }

  /**
   * Get active delegations count
   */
  getActiveDelegationsCount(): number {
    return this.activeDelegations.size
  }

  /**
   * Clear delegation history (for cleanup)
   */
  clearHistory(): void {
    this.delegationHistory.clear()
    logger.debug('DELEGATION', 'Delegation history cleared')
  }
}

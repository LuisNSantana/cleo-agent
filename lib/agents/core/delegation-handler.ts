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
  private activeDelegations = new Map<string, Promise<DelegationResult>>()
  private delegationHistory = new Map<string, DelegationResult>()
  private eventEmitter: EventEmitter

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter
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

      // Emit progress: starting
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: request.sourceAgent,
        targetAgent: request.targetAgent,
        status: 'starting',
        message: `Delegating to ${request.targetAgent}...`,
        timestamp: new Date().toISOString()
      })

      // Wait for delegation.completed event (timeout after 5 minutes)
      const result = await this.waitForDelegationCompletion(delegationKey, 300_000)

      // Store in history
      this.delegationHistory.set(delegationKey, result)

      // Emit progress: completed
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: request.sourceAgent,
        targetAgent: request.targetAgent,
        status: 'completed',
        message: `${request.targetAgent} completed the task`,
        timestamp: new Date().toISOString()
      })

      logger.info('DELEGATION', `Delegation succeeded: ${delegationKey}`)
      return result

    } catch (error) {
      logger.error('DELEGATION', `Delegation failed: ${delegationKey}`, error)

      // Emit progress: failed
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: request.sourceAgent,
        targetAgent: request.targetAgent,
        status: 'failed',
        message: `${request.targetAgent} failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
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
   * Wait for delegation.completed event
   */
  private waitForDelegationCompletion(
    delegationKey: string,
    timeoutMs: number
  ): Promise<DelegationResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup()
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

/**
 * Centralized Error Handling for Agent System
 * Implements comprehensive error classification, recovery, and monitoring
 */

import { AgentExecution } from '../types'

export type ErrorCategory = 
  | 'network'
  | 'model'
  | 'validation' 
  | 'authentication'
  | 'rate_limit'
  | 'timeout'
  | 'graph'
  | 'tool'
  | 'unknown'

export interface ErrorMetrics {
  category: ErrorCategory
  count: number
  lastOccurrence: Date
  averageRecoveryTime: number
  successfulRetries: number
  failedRetries: number
}

export interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableErrors: ErrorCategory[]
}

export interface CircuitBreakerState {
  isOpen: boolean
  failureCount: number
  lastFailureTime?: Date
  resetTimeoutMs: number
}

export class AgentErrorHandler {
  private errorMetrics = new Map<ErrorCategory, ErrorMetrics>()
  private circuitBreakers = new Map<string, CircuitBreakerState>()
  private retryConfig: RetryConfig

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableErrors: ['network', 'timeout', 'rate_limit', 'model'],
      ...retryConfig
    }
  }

  /**
   * Classify error into appropriate category
   */
  classifyError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase()
    const errorName = error.constructor.name.toLowerCase()

    if (message.includes('network') || message.includes('fetch failed') || message.includes('connection')) {
      return 'network'
    }
    
    if (message.includes('timeout') || error.name === 'AbortError') {
      return 'timeout'
    }
    
    if (message.includes('rate limit') || message.includes('quota') || message.includes('429')) {
      return 'rate_limit'
    }
    
    if (message.includes('unauthorized') || message.includes('403') || message.includes('401')) {
      return 'authentication'
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('schema')) {
      return 'validation'
    }
    
    if (message.includes('graph') || message.includes('node') || message.includes('edge')) {
      return 'graph'
    }
    
    if (message.includes('tool') || message.includes('function call')) {
      return 'tool'
    }
    
    if (errorName.includes('openai') || errorName.includes('anthropic') || message.includes('model')) {
      return 'model'
    }

    return 'unknown'
  }

  /**
   * Record error occurrence for metrics tracking
   */
  recordError(error: Error, recoveryTimeMs?: number): void {
    const category = this.classifyError(error)
    const existing = this.errorMetrics.get(category)
    
    if (existing) {
      existing.count++
      existing.lastOccurrence = new Date()
      if (recoveryTimeMs !== undefined) {
        existing.averageRecoveryTime = 
          (existing.averageRecoveryTime + recoveryTimeMs) / 2
      }
    } else {
      this.errorMetrics.set(category, {
        category,
        count: 1,
        lastOccurrence: new Date(),
        averageRecoveryTime: recoveryTimeMs || 0,
        successfulRetries: 0,
        failedRetries: 0
      })
    }
  }

  /**
   * Check if error is retryable based on configuration
   */
  isRetryableError(error: Error): boolean {
    const category = this.classifyError(error)
    return this.retryConfig.retryableErrors.includes(category)
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: string = 'unknown',
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig }
    let lastError: Error
    const startTime = Date.now()

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        // Check circuit breaker
        if (this.isCircuitOpen(context)) {
          throw new Error(`Circuit breaker is open for ${context}`)
        }

        const result = await operation()
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(context)
        
        // Record successful retry if not first attempt
        if (attempt > 1) {
          const category = this.classifyError(lastError!)
          const metrics = this.errorMetrics.get(category)
          if (metrics) {
            metrics.successfulRetries++
          }
        }

        return result
      } catch (error) {
        lastError = error as Error
        const category = this.classifyError(lastError)
        
        // Update circuit breaker
        this.updateCircuitBreaker(context, lastError)
        
        // Don't retry on final attempt or non-retryable errors
        if (attempt === config.maxAttempts || !this.isRetryableError(lastError)) {
          const recoveryTime = Date.now() - startTime
          this.recordError(lastError, recoveryTime)
          
          const metrics = this.errorMetrics.get(category)
          if (metrics) {
            metrics.failedRetries++
          }
          
          throw lastError
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = Math.min(
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        )
        const jitteredDelay = baseDelay + Math.random() * baseDelay * 0.1
        
        console.warn(
          `[ErrorHandler] Attempt ${attempt}/${config.maxAttempts} failed for ${context}:`,
          lastError.message,
          `Retrying in ${jitteredDelay.toFixed(0)}ms`
        )

        await new Promise(resolve => setTimeout(resolve, jitteredDelay))
      }
    }

    throw lastError!
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitOpen(context: string): boolean {
    const state = this.circuitBreakers.get(context)
    if (!state) return false

    if (state.isOpen) {
      const timeSinceLastFailure = Date.now() - (state.lastFailureTime?.getTime() || 0)
      if (timeSinceLastFailure > state.resetTimeoutMs) {
        // Reset circuit breaker
        state.isOpen = false
        state.failureCount = 0
        return false
      }
      return true
    }

    return false
  }

  private updateCircuitBreaker(context: string, error: Error): void {
    const threshold = 5 // Open circuit after 5 consecutive failures
    const resetTimeoutMs = 60000 // 1 minute

    let state = this.circuitBreakers.get(context)
    if (!state) {
      state = {
        isOpen: false,
        failureCount: 0,
        resetTimeoutMs
      }
      this.circuitBreakers.set(context, state)
    }

    state.failureCount++
    state.lastFailureTime = new Date()

    if (state.failureCount >= threshold) {
      state.isOpen = true
      console.warn(`[Circuit Breaker] Opened circuit for ${context} after ${threshold} failures`)
    }
  }

  private resetCircuitBreaker(context: string): void {
    const state = this.circuitBreakers.get(context)
    if (state) {
      state.isOpen = false
      state.failureCount = 0
      state.lastFailureTime = undefined
    }
  }

  /**
   * Handle execution errors with proper recovery strategies
   */
  async handleExecutionError(
    execution: AgentExecution,
    error: Error,
    recovery?: () => Promise<void>
  ): Promise<void> {
    const category = this.classifyError(error)
    this.recordError(error)

    // Update execution with error information
    execution.status = 'failed'
    execution.error = error.message
    execution.endTime = new Date()
    execution.metrics.errorCount++

    console.error(
      `[AgentError] Execution ${execution.id} failed:`,
      {
        category,
        error: error.message,
        agentId: execution.agentId,
        duration: execution.endTime.getTime() - execution.startTime.getTime()
      }
    )

    // Attempt recovery if provided and error is recoverable
    if (recovery && this.isRetryableError(error)) {
      try {
        await this.withRetry(recovery, `execution_recovery_${execution.id}`)
        console.log(`[AgentError] Successfully recovered execution ${execution.id}`)
      } catch (recoveryError) {
        console.error(
          `[AgentError] Recovery failed for execution ${execution.id}:`,
          recoveryError
        )
      }
    }
  }

  /**
   * Get error metrics for monitoring and debugging
   */
  getErrorMetrics(): Record<ErrorCategory, ErrorMetrics> {
    const result: Record<string, ErrorMetrics> = {}
    for (const [category, metrics] of this.errorMetrics) {
      result[category] = { ...metrics }
    }
    return result as Record<ErrorCategory, ErrorMetrics>
  }

  /**
   * Get circuit breaker states for monitoring
   */
  getCircuitBreakerStates(): Record<string, CircuitBreakerState> {
    const result: Record<string, CircuitBreakerState> = {}
    for (const [context, state] of this.circuitBreakers) {
      result[context] = { ...state }
    }
    return result
  }

  /**
   * Reset all metrics and circuit breakers (for testing or maintenance)
   */
  reset(): void {
    this.errorMetrics.clear()
    this.circuitBreakers.clear()
  }

  /**
   * Create a formatted error summary for logging/debugging
   */
  formatErrorSummary(error: Error, context?: string): string {
    const category = this.classifyError(error)
    const metrics = this.errorMetrics.get(category)
    
    return [
      `Error Category: ${category}`,
      `Message: ${error.message}`,
      `Context: ${context || 'unknown'}`,
      `Total ${category} errors: ${metrics?.count || 1}`,
      `Success rate: ${metrics ? 
        ((metrics.successfulRetries / (metrics.successfulRetries + metrics.failedRetries)) * 100).toFixed(1) 
        : 'N/A'}%`
    ].join(' | ')
  }
}

// Singleton instance
export const globalErrorHandler = new AgentErrorHandler()

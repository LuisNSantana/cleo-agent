/**
 * Retry Policy with Exponential Backoff
 * Based on Azure Durable Functions retry patterns
 * 
 * Automatically retries failed operations with increasing delays
 */

import logger from '@/lib/utils/logger'

export interface RetryConfig {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: string[]
  timeout?: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,      // 1s
  maxDelay: 30000,         // 30s
  backoffMultiplier: 2,    // Exponential: 1s, 2s, 4s, 8s...
  retryableErrors: [
    'timeout',
    'network_error',
    'rate_limit',
    'temporary_failure',
    'service_unavailable',
    'connection_reset',
    'econnreset',
    'etimedout',
    'enotfound'
  ]
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: Error
  attempts: number
  totalDuration: number
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error, config: RetryConfig): boolean {
  const errorMessage = error.message?.toLowerCase() || ''
  const errorName = error.name?.toLowerCase() || ''
  
  return config.retryableErrors.some(retryableError => {
    const pattern = retryableError.toLowerCase()
    return errorMessage.includes(pattern) || errorName.includes(pattern)
  })
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoff(
  attempt: number,
  config: RetryConfig
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1)
  
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay)
  
  // Add jitter (±20%) to avoid thundering herd
  const jitter = cappedDelay * 0.2 * (Math.random() - 0.5)
  
  return Math.floor(cappedDelay + jitter)
}

/**
 * Execute function with retry logic
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: { agentId?: string; operation?: string }
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const startTime = Date.now()
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    try {
      // Check timeout if configured
      if (fullConfig.timeout) {
        const elapsed = Date.now() - startTime
        if (elapsed > fullConfig.timeout) {
          throw new Error(`Retry timeout exceeded: ${elapsed}ms > ${fullConfig.timeout}ms`)
        }
      }
      
      // Execute function
      const result = await fn()
      
      // Success!
      if (attempt > 1) {
        logger.info(`✅ Retry succeeded on attempt ${attempt}/${fullConfig.maxAttempts}`, {
          agentId: context?.agentId,
          operation: context?.operation,
          totalDuration: Date.now() - startTime
        })
      }
      
      return result
      
    } catch (error) {
      lastError = error as Error
      
      // Check if error is retryable
      const isRetryable = isRetryableError(lastError, fullConfig)
      
      // Log the failure
      logger.warn(`⚠️ Attempt ${attempt}/${fullConfig.maxAttempts} failed`, {
        agentId: context?.agentId,
        operation: context?.operation,
        error: lastError.message,
        isRetryable,
        willRetry: isRetryable && attempt < fullConfig.maxAttempts
      })
      
      // Don't retry if error is not retryable or we're out of attempts
      if (!isRetryable || attempt === fullConfig.maxAttempts) {
        throw lastError
      }
      
      // Calculate backoff delay
      const delay = calculateBackoff(attempt, fullConfig)
      
      logger.debug(`🔄 Retrying in ${delay}ms (attempt ${attempt + 1}/${fullConfig.maxAttempts})`, {
        agentId: context?.agentId,
        operation: context?.operation
      })
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Retry failed with unknown error')
}

/**
 * Execute with retry and return detailed result
 */
export async function executeWithRetryDetailed<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: { agentId?: string; operation?: string }
): Promise<RetryResult<T>> {
  const startTime = Date.now()
  let attempts = 0
  
  try {
    const result = await executeWithRetry(fn, config, context)
    attempts = 1 // If successful on first try
    
    return {
      success: true,
      result,
      attempts,
      totalDuration: Date.now() - startTime
    }
  } catch (error) {
    return {
      success: false,
      error: error as Error,
      attempts: config.maxAttempts || DEFAULT_RETRY_CONFIG.maxAttempts,
      totalDuration: Date.now() - startTime
    }
  }
}

/**
 * Retry policy presets for common scenarios
 */
export const RETRY_PRESETS = {
  // Fast retry for quick operations
  fast: {
    maxAttempts: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2
  } as Partial<RetryConfig>,
  
  // Standard retry for most operations
  standard: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  } as Partial<RetryConfig>,
  
  // Aggressive retry for critical operations
  aggressive: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  } as Partial<RetryConfig>,
  
  // Network-specific retry (longer delays)
  network: {
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 3,
    retryableErrors: [
      ...DEFAULT_RETRY_CONFIG.retryableErrors,
      'network',
      'dns',
      'connection'
    ]
  } as Partial<RetryConfig>
}

/**
 * Retry Logic with Smart Error Detection
 * 
 * Distinguishes between transient (retryable) and permanent errors
 * to avoid wasting resources on unrecoverable failures.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay in ms (default: 1000) */
  baseDelay?: number
  /** Maximum delay in ms (default: 30000 = 30s) */
  maxDelay?: number
  /** Backoff multiplier (default: 2 for exponential) */
  backoffMultiplier?: number
  /** Custom retry condition function */
  shouldRetry?: (error: any, attempt: number) => boolean
  /** Callback on retry attempt */
  onRetry?: (error: any, attempt: number, delayMs: number) => void
}

/**
 * Determines if an error is retryable based on status code or error type
 */
export function isRetryableError(error: any): boolean {
  // Extract status code from various error formats
  const code = error.statusCode || error.status || error.code || error.response?.status
  
  // Transient HTTP errors that should be retried
  const retryableHttpCodes = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ]
  
  // Network errors that should be retried
  const retryableNetworkErrors = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENETUNREACH',
    'EAI_AGAIN',
  ]
  
  // Don't retry client errors (except 408, 429)
  if (typeof code === 'number' && code >= 400 && code < 500) {
    return retryableHttpCodes.includes(code)
  }
  
  // Retry server errors (5xx)
  if (typeof code === 'number' && code >= 500) {
    return true
  }
  
  // Retry network errors
  if (typeof code === 'string' && retryableNetworkErrors.includes(code)) {
    return true
  }
  
  // Retry on specific error messages
  const errorMessage = error.message?.toLowerCase() || ''
  const retryableMessages = [
    'timeout',
    'timed out',
    'connection reset',
    'socket hang up',
    'network error',
    'fetch failed',
  ]
  
  if (retryableMessages.some(msg => errorMessage.includes(msg))) {
    return true
  }
  
  // Don't retry by default
  return false
}

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateBackoff(
  attempt: number, 
  baseDelay: number, 
  maxDelay: number, 
  multiplier: number
): number {
  // Exponential backoff: baseDelay * (multiplier ^ attempt)
  const exponentialDelay = baseDelay * Math.pow(multiplier, attempt)
  
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay)
  
  // Add jitter (±20%) to prevent thundering herd
  const jitter = cappedDelay * 0.2 * (Math.random() - 0.5)
  
  return Math.floor(cappedDelay + jitter)
}

/**
 * Execute a function with automatic retry on transient failures
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   {
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt} in ${delay}ms due to:`, error.message)
 *     }
 *   }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    shouldRetry = isRetryableError,
    onRetry,
  } = options
  
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Check if we should retry
      const isLastAttempt = attempt === maxRetries
      const canRetry = shouldRetry(error, attempt)
      
      if (isLastAttempt || !canRetry) {
        // Log why we're not retrying
        if (!canRetry) {
          console.log(`[Retry] Not retrying - error is not transient:`, {
            error: (error as any)?.message || String(error),
            code: (error as any)?.statusCode || (error as any)?.status || (error as any)?.code,
            attempt: attempt + 1,
          })
        }
        throw error
      }
      
      // Calculate backoff delay
      const delayMs = calculateBackoff(attempt, baseDelay, maxDelay, backoffMultiplier)
      
      // Notify callback
      if (onRetry) {
        try {
          onRetry(error, attempt + 1, delayMs)
        } catch (callbackError) {
          console.error('[Retry] Error in onRetry callback:', callbackError)
        }
      }
      
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delayMs}ms:`, {
        error: (error as any)?.message || String(error),
        code: (error as any)?.statusCode || (error as any)?.status || (error as any)?.code,
      })
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  // Should never reach here, but TypeScript needs this
  throw lastError
}

/**
 * Retry decorator for class methods
 * 
 * @example
 * ```typescript
 * class ApiClient {
 *   @retry({ maxRetries: 3 })
 *   async fetchData() {
 *     return fetch('https://api.example.com/data')
 *   }
 * }
 * ```
 */
export function retry(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      return withRetry(
        () => originalMethod.apply(this, args),
        options
      )
    }
    
    return descriptor
  }
}

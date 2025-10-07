/**
 * Twitter/X API Rate Limit Handler
 * 
 * Manages API rate limits with:
 * - Automatic retry with exponential backoff
 * - Rate limit header monitoring
 * - Queue system for batched requests
 * - User-friendly error messages with reset times
 */

interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number // Unix timestamp
}

interface RetryConfig {
  maxRetries: number
  initialDelay: number // ms
  maxDelay: number // ms
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 segundo
  maxDelay: 60000, // 1 minuto
  backoffMultiplier: 2
}

/**
 * Parse rate limit headers from Twitter API response
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get('x-rate-limit-limit')
  const remaining = headers.get('x-rate-limit-remaining')
  const reset = headers.get('x-rate-limit-reset')

  if (!limit || !remaining || !reset) {
    return null
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10)
  }
}

/**
 * Calculate wait time from rate limit reset timestamp
 */
export function getWaitTime(resetTimestamp: number): number {
  const now = Math.floor(Date.now() / 1000)
  const waitSeconds = Math.max(0, resetTimestamp - now)
  return waitSeconds * 1000 // Convert to milliseconds
}

/**
 * Format wait time for user-friendly messages
 */
export function formatWaitTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  
  if (seconds < 60) {
    return `${seconds} segundos`
  }
  
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) {
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`
  }
  
  const hours = Math.ceil(minutes / 60)
  return `${hours} hora${hours > 1 ? 's' : ''}`
}

/**
 * Check if we're close to hitting rate limit
 */
export function isNearRateLimit(rateLimitInfo: RateLimitInfo): boolean {
  if (!rateLimitInfo.limit || !rateLimitInfo.remaining) {
    return false
  }
  
  const percentage = (rateLimitInfo.remaining / rateLimitInfo.limit) * 100
  return percentage < 20 // Warning when less than 20% remaining
}

/**
 * Execute Twitter API request with automatic retry and rate limit handling
 */
export async function executeWithRateLimit<T>(
  requestFn: () => Promise<Response>,
  config: Partial<RetryConfig> = {}
): Promise<{
  success: boolean
  data?: T
  error?: string
  rateLimitInfo?: RateLimitInfo
  shouldQueue?: boolean
}> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | null = null
  let lastRateLimitInfo: RateLimitInfo | null = null

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await requestFn()
      
      // Parse rate limit headers
      const rateLimitInfo = parseRateLimitHeaders(response.headers)
      if (rateLimitInfo) {
        lastRateLimitInfo = rateLimitInfo
      }

      // Success
      if (response.ok) {
        const data = await response.json() as T
        
        // Warning if near rate limit
        if (rateLimitInfo && isNearRateLimit(rateLimitInfo)) {
          console.warn(
            `⚠️ Twitter API: Only ${rateLimitInfo.remaining}/${rateLimitInfo.limit} requests remaining. ` +
            `Resets in ${formatWaitTime(getWaitTime(rateLimitInfo.reset))}`
          )
        }
        
        return {
          success: true,
          data,
          rateLimitInfo: rateLimitInfo || undefined
        }
      }

      // Handle 429 Too Many Requests
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}))
        const waitTime = rateLimitInfo 
          ? getWaitTime(rateLimitInfo.reset)
          : retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt)

        // If this is the last attempt, return error with queue suggestion
        if (attempt === retryConfig.maxRetries) {
          const resetTime = rateLimitInfo?.reset 
            ? new Date(rateLimitInfo.reset * 1000).toLocaleTimeString('es-ES')
            : 'desconocido'
          
          return {
            success: false,
            error: `Límite de solicitudes de Twitter alcanzado. Se resetea a las ${resetTime} (en ${formatWaitTime(waitTime)}).`,
            rateLimitInfo: rateLimitInfo || undefined,
            shouldQueue: true // Suggest queuing for later
          }
        }

        // Wait before retry
        const delay = Math.min(waitTime, retryConfig.maxDelay)
        console.log(`⏳ Rate limit hit. Retrying in ${formatWaitTime(delay)} (attempt ${attempt + 1}/${retryConfig.maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // Handle other errors
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `Twitter API error: ${errorData.detail || errorData.title || response.statusText}`,
        rateLimitInfo: rateLimitInfo || undefined
      }

    } catch (error) {
      lastError = error as Error
      
      // Don't retry on network errors if we've tried enough
      if (attempt === retryConfig.maxRetries) {
        break
      }

      // Exponential backoff for network errors
      const delay = Math.min(
        retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
        retryConfig.maxDelay
      )
      
      console.log(`⏳ Request failed. Retrying in ${formatWaitTime(delay)} (attempt ${attempt + 1}/${retryConfig.maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError 
      ? `Error de conexión: ${lastError.message}` 
      : 'Error desconocido al conectar con Twitter',
    rateLimitInfo: lastRateLimitInfo || undefined
  }
}

/**
 * Simple in-memory queue for tweets (can be replaced with Redis/DB for persistence)
 */
class TweetQueue {
  private queue: Array<{
    id: string
    content: string
    options: any
    scheduledFor: number
    retries: number
  }> = []

  add(content: string, options: any = {}, delayMs: number = 0) {
    const id = Math.random().toString(36).substring(7)
    this.queue.push({
      id,
      content,
      options,
      scheduledFor: Date.now() + delayMs,
      retries: 0
    })
    return id
  }

  getReady(): typeof this.queue {
    const now = Date.now()
    return this.queue.filter(item => item.scheduledFor <= now)
  }

  remove(id: string) {
    this.queue = this.queue.filter(item => item.id !== id)
  }

  incrementRetry(id: string) {
    const item = this.queue.find(i => i.id === id)
    if (item) {
      item.retries++
    }
  }

  size(): number {
    return this.queue.length
  }

  clear() {
    this.queue = []
  }
}

export const tweetQueue = new TweetQueue()

/**
 * Get user-friendly rate limit status message
 */
export function getRateLimitStatus(rateLimitInfo: RateLimitInfo): string {
  const percentage = (rateLimitInfo.remaining / rateLimitInfo.limit) * 100
  const resetTime = new Date(rateLimitInfo.reset * 1000).toLocaleTimeString('es-ES')
  const waitTime = formatWaitTime(getWaitTime(rateLimitInfo.reset))

  if (rateLimitInfo.remaining === 0) {
    return `❌ Sin solicitudes disponibles. Se resetea a las ${resetTime} (en ${waitTime}).`
  }

  if (percentage < 20) {
    return `⚠️ Quedan ${rateLimitInfo.remaining}/${rateLimitInfo.limit} solicitudes (${percentage.toFixed(1)}%). Se resetea en ${waitTime}.`
  }

  return `✅ ${rateLimitInfo.remaining}/${rateLimitInfo.limit} solicitudes disponibles. Se resetea en ${waitTime}.`
}

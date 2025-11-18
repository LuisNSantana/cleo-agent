/**
 * Circuit Breaker Pattern Implementation
 * 
 * Protects services from cascading failures by stopping requests
 * when a service is known to be down/struggling.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if service recovered, limited requests pass
 * 
 * Usage:
 * ```typescript
 * const breaker = new CircuitBreaker('openai-api', { threshold: 5, timeout: 30000 })
 * 
 * try {
 *   const result = await breaker.execute(() => fetch('https://api.openai.com/...'))
 * } catch (error) {
 *   if (error.message === 'Circuit breaker is OPEN') {
 *     // Service is down, use fallback
 *   }
 * }
 * ```
 */

export type CircuitState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening circuit (default: 5) */
  threshold?: number
  /** Time in ms to keep circuit open before trying again (default: 30000 = 30s) */
  timeout?: number
  /** Time in ms to wait in half-open before fully closing (default: 5000 = 5s) */
  halfOpenTimeout?: number
  /** Name for logging/monitoring */
  name?: string
  /** Callback when state changes */
  onStateChange?: (from: CircuitState, to: CircuitState) => void
}

export class CircuitBreaker {
  private failures = 0
  private lastFailTime = 0
  private lastSuccessTime = 0
  private state: CircuitState = 'closed'
  private halfOpenAttempts = 0

  private readonly threshold: number
  private readonly timeout: number
  private readonly halfOpenTimeout: number
  private readonly name: string
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name
    this.threshold = options.threshold ?? 5
    this.timeout = options.timeout ?? 30000
    this.halfOpenTimeout = options.halfOpenTimeout ?? 5000
    this.onStateChange = options.onStateChange
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF-OPEN
    if (this.state === 'open') {
      const timeSinceLastFail = Date.now() - this.lastFailTime
      if (timeSinceLastFail > this.timeout) {
        this.transitionTo('half-open')
        this.halfOpenAttempts = 0
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.name} (retry in ${Math.ceil((this.timeout - timeSinceLastFail) / 1000)}s)`)
      }
    }

    // Execute the function
    try {
      const result = await fn()

      // Success handling
      if (this.state === 'half-open') {
        this.halfOpenAttempts++
        // After successful test in half-open, close the circuit
        const timeSinceLastSuccess = Date.now() - this.lastSuccessTime
        if (timeSinceLastSuccess > this.halfOpenTimeout || this.halfOpenAttempts >= 3) {
          this.transitionTo('closed')
          this.failures = 0
          this.halfOpenAttempts = 0
        }
      } else if (this.state === 'closed') {
        // Reset failure count on success
        this.failures = 0
      }

      this.lastSuccessTime = Date.now()
      return result
    } catch (error) {
      // Failure handling
      this.failures++
      this.lastFailTime = Date.now()

      console.error(`[CircuitBreaker:${this.name}] Failure ${this.failures}/${this.threshold}:`, error)

      if (this.state === 'half-open') {
        // Failed during half-open test, go back to open
        this.transitionTo('open')
        this.halfOpenAttempts = 0
      } else if (this.failures >= this.threshold) {
        // Threshold exceeded, open the circuit
        this.transitionTo('open')
      }

      throw error
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset() {
    console.log(`[CircuitBreaker:${this.name}] Manual reset`)
    this.failures = 0
    this.halfOpenAttempts = 0
    this.transitionTo('closed')
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      state: this.state,
      failures: this.failures,
      halfOpenAttempts: this.halfOpenAttempts,
      lastFailTime: this.lastFailTime,
      lastSuccessTime: this.lastSuccessTime,
      timeSinceLastFail: this.lastFailTime ? Date.now() - this.lastFailTime : null,
      timeSinceLastSuccess: this.lastSuccessTime ? Date.now() - this.lastSuccessTime : null,
    }
  }

  private transitionTo(newState: CircuitState) {
    if (this.state !== newState) {
      const oldState = this.state
      this.state = newState
      console.log(`[CircuitBreaker:${this.name}] State transition: ${oldState} → ${newState}`)
      
      if (this.onStateChange) {
        try {
          this.onStateChange(oldState, newState)
        } catch (err) {
          console.error(`[CircuitBreaker:${this.name}] Error in onStateChange callback:`, err)
        }
      }
    }
  }
}

/**
 * Global circuit breaker registry for monitoring
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>()

  register(name: string, breaker: CircuitBreaker) {
    this.breakers.set(name, breaker)
  }

  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name)
  }

  getAll(): Map<string, CircuitBreaker> {
    return this.breakers
  }

  getMetrics() {
    const metrics: Record<string, any> = {}
    for (const [name, breaker] of this.breakers.entries()) {
      metrics[name] = breaker.getMetrics()
    }
    return metrics
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry()

/**
 * Create and register a circuit breaker
 */
export function createCircuitBreaker(name: string, options: CircuitBreakerOptions = {}): CircuitBreaker {
  const breaker = new CircuitBreaker(name, options)
  circuitBreakerRegistry.register(name, breaker)
  return breaker
}

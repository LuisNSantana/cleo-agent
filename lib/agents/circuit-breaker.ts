/**
 * Circuit Breaker Pattern Implementation
 * Based on Netflix Hystrix and Azure Durable Functions best practices
 * 
 * Protects against cascading failures by temporarily blocking calls to failing agents
 */

import logger from '@/lib/utils/logger'

interface CircuitState {
  failures: number
  lastFailure: number | null
  state: 'closed' | 'open' | 'half-open'
  successCount: number
  totalCalls: number
  lastStateChange: number
}

interface CircuitBreakerConfig {
  maxFailures: number
  resetTimeout: number
  halfOpenTimeout: number
  successThreshold: number
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  maxFailures: 3,           // Open circuit after 3 failures
  resetTimeout: 30000,      // Reset failure count after 30s of no failures
  halfOpenTimeout: 60000,   // Try again after 1 min in open state
  successThreshold: 2       // Need 2 successes to close from half-open
}

export class CircuitBreaker {
  private circuits = new Map<string, CircuitState>()
  private config: CircuitBreakerConfig
  
  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }
  
  /**
   * Check if execution is allowed for this agent
   */
  canExecute(agentId: string): { allowed: boolean; reason?: string } {
    const circuit = this.getCircuit(agentId)
    
    // Closed circuit: normal operation
    if (circuit.state === 'closed') {
      return { allowed: true }
    }
    
    // Open circuit: check if we should transition to half-open
    if (circuit.state === 'open') {
      const timeSinceFailure = Date.now() - (circuit.lastFailure || 0)
      
      if (timeSinceFailure > this.config.halfOpenTimeout) {
        // Transition to half-open
        circuit.state = 'half-open'
        circuit.successCount = 0
        logger.info(`🟡 Circuit breaker HALF-OPEN for ${agentId} after ${timeSinceFailure}ms`)
        return { allowed: true }
      }
      
      return {
        allowed: false,
        reason: `Agent ${agentId} is temporarily unavailable due to repeated failures. Please try again in ${Math.ceil((this.config.halfOpenTimeout - timeSinceFailure) / 1000)}s.`
      }
    }
    
    // Half-open: allow limited attempts
    if (circuit.state === 'half-open') {
      return { allowed: true }
    }
    
    return { allowed: true }
  }
  
  /**
   * Record a successful execution
   */
  recordSuccess(agentId: string): void {
    const circuit = this.getCircuit(agentId)
    circuit.totalCalls++
    
    if (circuit.state === 'half-open') {
      circuit.successCount++
      
      if (circuit.successCount >= this.config.successThreshold) {
        // Transition to closed
        circuit.state = 'closed'
        circuit.failures = 0
        circuit.lastStateChange = Date.now()
        logger.info(`✅ Circuit breaker CLOSED for ${agentId} after ${circuit.successCount} successful attempts`)
      }
    } else if (circuit.state === 'closed') {
      // Reset failure count on success
      const timeSinceLastFailure = circuit.lastFailure 
        ? Date.now() - circuit.lastFailure 
        : Infinity
      
      if (timeSinceLastFailure > this.config.resetTimeout) {
        circuit.failures = 0
      }
    }
  }
  
  /**
   * Record a failed execution
   */
  recordFailure(agentId: string, error?: string): void {
    const circuit = this.getCircuit(agentId)
    circuit.totalCalls++
    circuit.failures++
    circuit.lastFailure = Date.now()
    
    if (circuit.state === 'half-open') {
      // Failure in half-open → back to open
      circuit.state = 'open'
      circuit.lastStateChange = Date.now()
      logger.warn(`🔴 Circuit breaker OPEN again for ${agentId} after failure in half-open state`)
    } else if (circuit.state === 'closed') {
      // Check if we should open the circuit
      if (circuit.failures >= this.config.maxFailures) {
        circuit.state = 'open'
        circuit.lastStateChange = Date.now()
        logger.warn(`🔴 Circuit breaker OPEN for ${agentId} after ${circuit.failures} failures`, {
          error,
          totalCalls: circuit.totalCalls
        })
      }
    }
  }
  
  /**
   * Get circuit state for an agent
   */
  getState(agentId: string): CircuitState {
    return { ...this.getCircuit(agentId) }
  }
  
  /**
   * Get all circuit states (for monitoring)
   */
  getAllStates(): Map<string, CircuitState> {
    const states = new Map<string, CircuitState>()
    this.circuits.forEach((state, agentId) => {
      states.set(agentId, { ...state })
    })
    return states
  }
  
  /**
   * Reset circuit for an agent (manual intervention)
   */
  reset(agentId: string): void {
    const circuit = this.getCircuit(agentId)
    circuit.state = 'closed'
    circuit.failures = 0
    circuit.lastFailure = null
    circuit.successCount = 0
    circuit.lastStateChange = Date.now()
    logger.info(`🔄 Circuit breaker RESET for ${agentId}`)
  }
  
  /**
   * Reset all circuits (manual intervention)
   */
  resetAll(): void {
    this.circuits.forEach((_, agentId) => {
      this.reset(agentId)
    })
    logger.info('🔄 All circuit breakers RESET')
  }
  
  /**
   * Get or create circuit state for an agent
   */
  private getCircuit(agentId: string): CircuitState {
    if (!this.circuits.has(agentId)) {
      this.circuits.set(agentId, {
        failures: 0,
        lastFailure: null,
        state: 'closed',
        successCount: 0,
        totalCalls: 0,
        lastStateChange: Date.now()
      })
    }
    return this.circuits.get(agentId)!
  }
}

// Global singleton instance
export const circuitBreaker = new CircuitBreaker()

// Export for monitoring/debugging
if (typeof window === 'undefined') {
  // Server-side only
  ;(global as any).__circuitBreaker = circuitBreaker
}

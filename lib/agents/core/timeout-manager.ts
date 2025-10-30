/**
 * Timeout Manager Module
 * 
 * Centralizes all timeout and budget management for agent executions.
 * Prevents scattered timeout logic throughout the codebase.
 */

import { logger } from '@/lib/logger'

export interface ExecutionBudget {
  maxExecutionMs: number
  maxToolCalls: number
  maxAgentCycles: number
}

export interface BudgetStatus {
  exceeded: boolean
  reason?: string
  recommendations?: string[]
}

/**
 * TimeoutManager - Tracks execution budgets and enforces limits
 */
export class TimeoutManager {
  private executionStartMs: number
  private toolCallCount: number = 0
  private agentCycleCount: number = 0
  private budget: ExecutionBudget

  constructor(budget: ExecutionBudget) {
    this.executionStartMs = Date.now()
    this.budget = budget
    
    logger.debug('TIMEOUT-MANAGER', 'Initialized with budget', budget)
  }

  /**
   * Record a tool call
   */
  recordToolCall(): void {
    this.toolCallCount++
    logger.debug('TIMEOUT-MANAGER', `Tool call recorded (${this.toolCallCount}/${this.budget.maxToolCalls})`)
  }

  /**
   * Record an agent cycle (model invocation)
   */
  recordAgentCycle(): void {
    this.agentCycleCount++
    logger.debug('TIMEOUT-MANAGER', `Agent cycle recorded (${this.agentCycleCount}/${this.budget.maxAgentCycles})`)
  }

  /**
   * Check if execution budget is exceeded
   */
  checkBudget(): BudgetStatus {
    const elapsedMs = Date.now() - this.executionStartMs
    const elapsedSeconds = Math.floor(elapsedMs / 1000)

    // Check time limit
    if (elapsedMs > this.budget.maxExecutionMs) {
      return {
        exceeded: true,
        reason: `Time limit exceeded (${elapsedSeconds}s / ${this.budget.maxExecutionMs / 1000}s)`,
        recommendations: [
          'Finalize with available results',
          'Consider breaking task into smaller chunks',
          'Check for infinite loops in tool calls'
        ]
      }
    }

    // Check tool call limit
    if (this.toolCallCount >= this.budget.maxToolCalls) {
      return {
        exceeded: true,
        reason: `Tool call limit exceeded (${this.toolCallCount} / ${this.budget.maxToolCalls})`,
        recommendations: [
          'Summarize results from completed tool calls',
          'Avoid redundant tool executions',
          'Use caching for repeated queries'
        ]
      }
    }

    // Check agent cycle limit
    if (this.agentCycleCount >= this.budget.maxAgentCycles) {
      return {
        exceeded: true,
        reason: `Agent cycle limit exceeded (${this.agentCycleCount} / ${this.budget.maxAgentCycles})`,
        recommendations: [
          'Provide final answer with current information',
          'Check for reasoning loops',
          'Simplify task requirements'
        ]
      }
    }

    return { exceeded: false }
  }

  /**
   * Get budget utilization percentage
   */
  getBudgetUtilization(): {
    time: number
    toolCalls: number
    cycles: number
  } {
    const elapsedMs = Date.now() - this.executionStartMs
    
    return {
      time: Math.min(100, (elapsedMs / this.budget.maxExecutionMs) * 100),
      toolCalls: Math.min(100, (this.toolCallCount / this.budget.maxToolCalls) * 100),
      cycles: Math.min(100, (this.agentCycleCount / this.budget.maxAgentCycles) * 100)
    }
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): {
    timeMs: number
    toolCalls: number
    cycles: number
  } {
    const elapsedMs = Date.now() - this.executionStartMs
    
    return {
      timeMs: Math.max(0, this.budget.maxExecutionMs - elapsedMs),
      toolCalls: Math.max(0, this.budget.maxToolCalls - this.toolCallCount),
      cycles: Math.max(0, this.budget.maxAgentCycles - this.agentCycleCount)
    }
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    elapsedMs: number
    toolCalls: number
    cycles: number
    budget: ExecutionBudget
    utilization: ReturnType<TimeoutManager['getBudgetUtilization']>
  } {
    return {
      elapsedMs: Date.now() - this.executionStartMs,
      toolCalls: this.toolCallCount,
      cycles: this.agentCycleCount,
      budget: this.budget,
      utilization: this.getBudgetUtilization()
    }
  }

  /**
   * Check if approaching budget limits (>80% utilization)
   */
  isApproachingLimit(): boolean {
    const utilization = this.getBudgetUtilization()
    return (
      utilization.time > 80 ||
      utilization.toolCalls > 80 ||
      utilization.cycles > 80
    )
  }

  /**
   * Get warning if approaching limits
   */
  getWarning(): string | null {
    if (!this.isApproachingLimit()) {
      return null
    }

    const utilization = this.getBudgetUtilization()
    const warnings: string[] = []

    if (utilization.time > 80) {
      warnings.push(`Time: ${utilization.time.toFixed(1)}%`)
    }
    if (utilization.toolCalls > 80) {
      warnings.push(`Tool calls: ${utilization.toolCalls.toFixed(1)}%`)
    }
    if (utilization.cycles > 80) {
      warnings.push(`Cycles: ${utilization.cycles.toFixed(1)}%`)
    }

    return `⚠️ Budget warning - ${warnings.join(', ')}`
  }
}

/**
 * Default budget configurations
 */
export const DEFAULT_BUDGETS = {
  STANDARD: {
    maxExecutionMs: 120_000, // 2 minutes
    maxToolCalls: 20,
    maxAgentCycles: 15
  },
  EXTENDED: {
    maxExecutionMs: 300_000, // 5 minutes
    maxToolCalls: 50,
    maxAgentCycles: 30
  },
  QUICK: {
    maxExecutionMs: 30_000, // 30 seconds
    maxToolCalls: 5,
    maxAgentCycles: 5
  }
} as const

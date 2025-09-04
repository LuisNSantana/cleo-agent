/**
 * Metrics Collector for Agent System
 * Collects and aggregates system performance metrics
 */

import { AgentExecution } from '../types'
import { ErrorMetrics } from './error-handler'

export interface SystemMetrics {
  activeExecutions: number
  totalGraphs: number
  memoryUsage: NodeJS.MemoryUsage
  uptime: number
}

export interface PerformanceMetrics {
  averageExecutionTime: number
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  errorRate: number
}

export class MetricsCollector {
  private executionMetrics: PerformanceMetrics = {
    averageExecutionTime: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    errorRate: 0
  }

  private systemMetrics: SystemMetrics = {
    activeExecutions: 0,
    totalGraphs: 0,
    memoryUsage: process.memoryUsage(),
    uptime: 0
  }

  private errorMetrics: Record<string, ErrorMetrics> = {}

  recordExecutionStart(execution: AgentExecution): void {
    this.executionMetrics.totalExecutions++
    this.systemMetrics.activeExecutions++
  }

  recordExecutionComplete(execution: AgentExecution): void {
    this.executionMetrics.successfulExecutions++
    this.systemMetrics.activeExecutions--
    
    if (execution.endTime && execution.startTime) {
      const executionTime = execution.endTime.getTime() - execution.startTime.getTime()
      this.updateAverageExecutionTime(executionTime)
    }
    
    this.updateErrorRate()
  }

  recordExecutionFailure(execution: AgentExecution): void {
    this.executionMetrics.failedExecutions++
    this.systemMetrics.activeExecutions--
    this.updateErrorRate()
  }

  recordSystemMetrics(metrics: Partial<SystemMetrics>): void {
    this.systemMetrics = { ...this.systemMetrics, ...metrics }
  }

  updateErrorMetrics(errorMetrics: Record<string, ErrorMetrics>): void {
    this.errorMetrics = errorMetrics
  }

  private updateAverageExecutionTime(executionTime: number): void {
    const totalSuccessful = this.executionMetrics.successfulExecutions
    const currentAverage = this.executionMetrics.averageExecutionTime
    
    this.executionMetrics.averageExecutionTime = 
      ((currentAverage * (totalSuccessful - 1)) + executionTime) / totalSuccessful
  }

  private updateErrorRate(): void {
    const total = this.executionMetrics.totalExecutions
    const failed = this.executionMetrics.failedExecutions
    
    this.executionMetrics.errorRate = total > 0 ? (failed / total) * 100 : 0
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.executionMetrics }
  }

  getSystemMetrics(): SystemMetrics {
    return { ...this.systemMetrics }
  }

  getErrorMetrics(): Record<string, ErrorMetrics> {
    return { ...this.errorMetrics }
  }

  getAllMetrics(): {
    performance: PerformanceMetrics
    system: SystemMetrics
    errors: Record<string, ErrorMetrics>
  } {
    return {
      performance: this.getPerformanceMetrics(),
      system: this.getSystemMetrics(),
      errors: this.getErrorMetrics()
    }
  }

  async flush(): Promise<void> {
    // Could write metrics to file or send to analytics service
    console.log('[MetricsCollector] Flushing metrics:', this.getAllMetrics())
  }

  reset(): void {
    this.executionMetrics = {
      averageExecutionTime: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      errorRate: 0
    }
    this.systemMetrics.activeExecutions = 0
    this.errorMetrics = {}
  }
}

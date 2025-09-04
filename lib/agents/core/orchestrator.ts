/**
 * Advanced Agent Orchestrator Core
 * Extended with router logic, delegation, and tool execution
 */

import { StateGraph, StateGraphArgs } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { AgentConfig, AgentExecution, AgentState, ExecutionResult } from '../types'
import { GraphBuilder } from './graph-builder'
import { ExecutionManager } from './execution-manager'
import { ModelFactory } from './model-factory'
import { EventEmitter } from './event-emitter'
import { globalErrorHandler, AgentErrorHandler } from './error-handler'
import { MemoryManager } from './memory-manager'
import { MetricsCollector } from './metrics-collector'
import { getAllAgents } from '../config'

export interface OrchestratorConfig {
  enableMetrics?: boolean
  enableMemory?: boolean
  memoryConfig?: {
    maxThreadMessages?: number
    maxContextTokens?: number
    compressionThreshold?: number
  }
  errorHandlerConfig?: {
    maxRetries?: number
    baseDelayMs?: number
    enableCircuitBreaker?: boolean
  }
}

export interface ExecutionContext {
  threadId: string
  userId: string
  agentId: string
  messageHistory: BaseMessage[]
  metadata?: Record<string, any>
}

export interface ExecutionOptions {
  timeout?: number
  priority?: 'low' | 'normal' | 'high'
  enableStreaming?: boolean
  maxTokens?: number
  temperature?: number
}

/**
 * Modular Agent Orchestrator
 * 
 * Core responsibilities:
 * - Agent execution coordination
 * - Module lifecycle management
 * - Event orchestration
 * - Error handling coordination
 * - Metrics collection coordination
 */
export class AgentOrchestrator {
  private graphBuilder!: GraphBuilder
  private executionManager!: ExecutionManager
  private modelFactory!: ModelFactory
  private eventEmitter!: EventEmitter
  private errorHandler: AgentErrorHandler = globalErrorHandler
  private memoryManager?: MemoryManager
  private metricsCollector?: MetricsCollector
  private config: OrchestratorConfig

  private graphs = new Map<string, StateGraph<AgentState>>()
  private activeExecutions = new Map<string, AgentExecution>()

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      enableMetrics: true,
      enableMemory: true,
      memoryConfig: {
        maxThreadMessages: 100,
        maxContextTokens: 8000,
        compressionThreshold: 0.8
      },
      errorHandlerConfig: {
        maxRetries: 3,
        baseDelayMs: 1000,
        enableCircuitBreaker: true
      },
      ...config
    }

    this.initializeModules()
  }

  private initializeModules(): void {
    // Initialize core modules
    this.eventEmitter = new EventEmitter()
    this.errorHandler = globalErrorHandler
    this.modelFactory = new ModelFactory()
    this.executionManager = new ExecutionManager({
      eventEmitter: this.eventEmitter,
      errorHandler: this.errorHandler
    })
    this.graphBuilder = new GraphBuilder({
      modelFactory: this.modelFactory,
      eventEmitter: this.eventEmitter,
      executionManager: this.executionManager
    })

    // Initialize optional modules
    if (this.config.enableMemory) {
      this.memoryManager = new MemoryManager(this.config.memoryConfig)
    }

    if (this.config.enableMetrics) {
      this.metricsCollector = new MetricsCollector()
      this.setupMetricsCollection()
    }

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // Execution lifecycle events
    this.eventEmitter.on('execution.started', (execution: AgentExecution) => {
      this.activeExecutions.set(execution.id, execution)
      this.metricsCollector?.recordExecutionStart(execution)
    })

    this.eventEmitter.on('execution.completed', (execution: AgentExecution) => {
      this.activeExecutions.delete(execution.id)
      this.metricsCollector?.recordExecutionComplete(execution)
    })

    this.eventEmitter.on('execution.failed', (execution: AgentExecution) => {
      this.activeExecutions.delete(execution.id)
      this.metricsCollector?.recordExecutionFailure(execution)
    })

    // Memory management events
    if (this.memoryManager) {
      this.eventEmitter.on('messages.loaded', (context: ExecutionContext) => {
        this.memoryManager?.trackMessageLoad(context.threadId, context.messageHistory.length)
      })

      this.eventEmitter.on('messages.compressed', (data: { threadId: string, originalCount: number, compressedCount: number }) => {
        console.log(`[Memory] Compressed ${data.originalCount} to ${data.compressedCount} messages for thread ${data.threadId}`)
      })
    }
  }

  private setupMetricsCollection(): void {
    if (!this.metricsCollector) return

    // Collect error metrics
    setInterval(() => {
      const errorMetrics = this.errorHandler.getErrorMetrics()
      this.metricsCollector!.updateErrorMetrics(errorMetrics)
    }, 60000) // Every minute

    // Collect system metrics
    setInterval(() => {
      this.metricsCollector!.recordSystemMetrics({
        activeExecutions: this.activeExecutions.size,
        totalGraphs: this.graphs.size,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      })
    }, 30000) // Every 30 seconds
  }

  /**
   * Initialize agent graph if not already cached
   */
  async initializeAgent(agentConfig: AgentConfig): Promise<void> {
    if (this.graphs.has(agentConfig.id)) {
      return // Already initialized
    }

    try {
      const graph = await this.graphBuilder.buildGraph(agentConfig)
      this.graphs.set(agentConfig.id, graph)
      
      this.eventEmitter.emit('agent.initialized', {
        agentId: agentConfig.id,
        agentName: agentConfig.name
      })

      console.log(`[Orchestrator] Initialized agent: ${agentConfig.name} (${agentConfig.id})`)
    } catch (error) {
      this.errorHandler.recordError(error as Error)
      throw new Error(`Failed to initialize agent ${agentConfig.id}: ${error}`)
    }
  }

  /**
   * Execute agent with comprehensive context and error handling
   * Enhanced with routing and delegation capabilities
   */
  async executeAgent(
    agentConfig: AgentConfig,
    context: ExecutionContext,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const execution: AgentExecution = {
      id: executionId,
      agentId: agentConfig.id,
      threadId: context.threadId,
      userId: context.userId,
      status: 'running',
      startTime: new Date(),
      input: String(context.messageHistory[context.messageHistory.length - 1]?.content || ''),
      result: undefined,
      messages: [],
      options,
      metrics: {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        executionTime: 0,
        executionTimeMs: 0,
        tokensUsed: 0,
        toolCallsCount: 0,
        handoffsCount: 0,
        errorCount: 0,
        retryCount: 0,
        cost: 0
      }
    }

    try {
      // Use routing logic for supervisor agent
      if (agentConfig.id === 'cleo-supervisor') {
        return await this.executeWithRouting(agentConfig, context, execution, options)
      }

      // Direct execution for specialist agents
      await this.initializeAgent(agentConfig)
      const processedContext = await this.prepareExecutionContext(context)

      const result = await this.errorHandler.withRetry(
        () => this.executionManager.executeWithHistory(
          agentConfig,
          this.graphs.get(agentConfig.id)!,
          processedContext,
          execution,
          options
        ),
        `agent_execution_${agentConfig.id}`,
        {
          maxAttempts: this.config.errorHandlerConfig?.maxRetries || 3,
          baseDelayMs: this.config.errorHandlerConfig?.baseDelayMs || 1000
        }
      )

      execution.status = 'completed'
      execution.endTime = new Date()
      execution.result = (result as ExecutionResult).content
      execution.metrics.executionTimeMs = execution.endTime.getTime() - execution.startTime.getTime()

      this.eventEmitter.emit('execution.completed', execution)
      return result as ExecutionResult
    } catch (error) {
      await this.errorHandler.handleExecutionError(execution, error as Error)
      this.eventEmitter.emit('execution.failed', execution)
      throw error
    }
  }

  /**
   * Execute with routing and delegation logic (like legacy orchestrator)
   */
  private async executeWithRouting(
    supervisorConfig: AgentConfig,
    context: ExecutionContext,
    execution: AgentExecution,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const userMessage = String(context.messageHistory[context.messageHistory.length - 1]?.content || '')
    
    // Import agent configs for routing
    const { getAllAgents } = await import('../config')
    const availableAgents = getAllAgents().filter(a => a.id !== 'cleo-supervisor')
    
    console.log(`[Core Router] Analyzing message: "${userMessage.substring(0, 50)}..."`)
    
    // Simple keyword-based routing (can be enhanced with ML scoring later)
    const bestAgent = this.selectBestAgent(userMessage.toLowerCase(), availableAgents)
    
    if (bestAgent) {
      console.log(`[Core Router] Selected agent: ${bestAgent.name} (${bestAgent.id})`)
      
      // Add delegation step for tracking
      execution.steps = execution.steps || []
      execution.steps.push({
        id: `step_${Date.now()}_delegate`,
        agent: 'cleo-supervisor',
        action: 'delegating',
        content: `Delegating to ${bestAgent.name}`,
        progress: 20,
        timestamp: new Date(),
        metadata: { delegatedTo: bestAgent.id, reason: 'routing' }
      })
      
      // Execute specialist agent
      const specialistResult = await this.executeAgent(bestAgent, context, options)
      
      // Add completion step
      execution.steps.push({
        id: `step_${Date.now()}_complete`,
        agent: bestAgent.id,
        action: 'completing',
        content: 'Task completed by specialist',
        progress: 100,
        timestamp: new Date(),
        metadata: { source: 'specialist', passThrough: true }
      })
      
      return specialistResult
    }

    // Fallback: direct supervisor execution
    console.log('[Core Router] No specialist selected, using supervisor')
    await this.initializeAgent(supervisorConfig)
    const processedContext = await this.prepareExecutionContext(context)

    return await this.errorHandler.withRetry(
      () => this.executionManager.executeWithHistory(
        supervisorConfig,
        this.graphs.get(supervisorConfig.id)!,
        processedContext,
        execution,
        options
      ),
      `agent_execution_${supervisorConfig.id}`,
      {
        maxAttempts: this.config.errorHandlerConfig?.maxRetries || 3,
        baseDelayMs: this.config.errorHandlerConfig?.baseDelayMs || 1000
      }
    )
  }

  /**
   * Select best agent based on message content (simplified routing logic)
   */
  private selectBestAgent(message: string, agents: AgentConfig[]): AgentConfig | null {
    const keywords = {
      'emma-ecommerce': ['shopify', 'ecommerce', 'sales', 'products', 'orders', 'store', 'inventory', 'analytics', 'customers'],
      'toby-technical': ['technical', 'research', 'data', 'analysis', 'information', 'metrics', 'programming', 'code'],
      'ami-creative': ['creative', 'design', 'content', 'art', 'brainstorm', 'innovation', 'marketing'],
      'peter-logical': ['logic', 'math', 'calculate', 'problem', 'solve', 'algorithm', 'structured']
    }

    let bestAgent: AgentConfig | null = null
    let bestScore = 0

    for (const agent of agents) {
      const agentKeywords = keywords[agent.id as keyof typeof keywords] || []
      let score = 0

      for (const keyword of agentKeywords) {
        if (message.includes(keyword)) {
          score++
        }
      }

      console.log(`[Core Router] Agent ${agent.id} scored ${score}`)

      if (score > bestScore) {
        bestScore = score
        bestAgent = agent
      }
    }

    return bestScore > 0 ? bestAgent : null
  }

  /**
   * Prepare execution context with memory management
   */
  private async prepareExecutionContext(context: ExecutionContext): Promise<ExecutionContext> {
    let processedContext = { ...context }

    if (this.memoryManager) {
      // Optimize message history if needed
      const optimizedMessages = await this.memoryManager.optimizeMessageHistory(
        context.messageHistory,
        context.threadId
      )

      if (optimizedMessages.length !== context.messageHistory.length) {
        this.eventEmitter.emit('messages.compressed', {
          threadId: context.threadId,
          originalCount: context.messageHistory.length,
          compressedCount: optimizedMessages.length
        })
      }

      processedContext.messageHistory = optimizedMessages
    }

    this.eventEmitter.emit('messages.loaded', processedContext)
    return processedContext
  }

  /**
   * Get execution status and metrics
   */
  getExecutionStatus(executionId: string): AgentExecution | null {
    return this.activeExecutions.get(executionId) || null
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): AgentExecution[] {
    return Array.from(this.activeExecutions.values())
  }

  /**
   * Get system metrics
   */
  getMetrics(): Record<string, any> {
    return {
      activeExecutions: this.activeExecutions.size,
      totalGraphs: this.graphs.size,
      errorMetrics: this.errorHandler.getErrorMetrics(),
      circuitBreakers: this.errorHandler.getCircuitBreakerStates(),
      memoryMetrics: this.memoryManager?.getMetrics(),
      systemMetrics: this.metricsCollector?.getSystemMetrics()
    }
  }

  /**
   * Subscribe to orchestrator events
   */
  on(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.on(event, handler)
  }

  /**
   * Unsubscribe from orchestrator events
   */
  off(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.off(event, handler)
  }

  /**
   * Cancel execution by ID
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId)
    if (!execution) {
      return false
    }

    try {
      execution.status = 'cancelled' as any
      execution.endTime = new Date()
      
      this.activeExecutions.delete(executionId)
      this.eventEmitter.emit('execution.cancelled', execution)
      
      return true
    } catch (error) {
      console.error(`[Orchestrator] Failed to cancel execution ${executionId}:`, error)
      return false
    }
  }

  /**
   * Cleanup resources and shutdown gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[Orchestrator] Initiating shutdown...')

    // Cancel all active executions
    const activeExecutionIds = Array.from(this.activeExecutions.keys())
    await Promise.all(
      activeExecutionIds.map(id => this.cancelExecution(id))
    )

    // Clear caches
    this.graphs.clear()
    this.activeExecutions.clear()

    // Shutdown modules
    if (this.memoryManager) {
      await this.memoryManager.cleanup()
    }

    if (this.metricsCollector) {
      await this.metricsCollector.flush()
    }

    this.eventEmitter.removeAllListeners()

    console.log('[Orchestrator] Shutdown complete')
  }
}

// Singleton instance for global access
export const globalOrchestrator = new AgentOrchestrator()

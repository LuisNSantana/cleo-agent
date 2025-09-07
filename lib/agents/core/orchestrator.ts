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
import { SubAgentManager, type SubAgent } from './sub-agent-manager'
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
  private subAgentManager!: SubAgentManager
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
    this.subAgentManager = new SubAgentManager('default-user', this.eventEmitter)
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

    // Delegation events - handle multi-agent handoffs
    this.eventEmitter.on('delegation.requested', async (delegationData: any) => {
      console.log('🔄 [ORCHESTRATOR] Delegation requested:', delegationData)
      await this.handleDelegation(delegationData)
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
  // Ensure sub-agent manager is initialized (loads cache and registers tools)
  await this.subAgentManager.initialize()

  // Dynamically include sub-agent delegation tools for this agent (if any)
  const subAgentTools = Object.keys(this.subAgentManager.getDelegationTools(agentConfig.id) || {})
  const uniqueTools = Array.from(new Set([...(agentConfig.tools || []), ...subAgentTools]))
  const effectiveAgentConfig = { ...agentConfig, tools: uniqueTools }

  const graph = await this.graphBuilder.buildGraph(effectiveAgentConfig)
      this.graphs.set(agentConfig.id, graph)
      
      this.eventEmitter.emit('agent.initialized', {
        agentId: agentConfig.id,
        agentName: agentConfig.name
      })

  console.log(`[Orchestrator] Initialized agent: ${agentConfig.name} (${agentConfig.id}) with tools: ${uniqueTools.join(', ')}`)
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
    console.log('🔍 [DEBUG] Core executeAgent - Starting execution for:', agentConfig.id)
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
      console.log('🔍 [DEBUG] Core executeAgent - Checking if supervisor:', agentConfig.id === 'cleo-supervisor')
      // Use routing logic for supervisor agent
      if (agentConfig.id === 'cleo-supervisor') {
        console.log('🔍 [DEBUG] Core executeAgent - Using routing for supervisor')
        return await this.executeWithRouting(agentConfig, context, execution, options)
      }

      console.log('🔍 [DEBUG] Core executeAgent - Direct execution for specialist')
      // Direct execution for specialist agents
      await this.initializeAgent(agentConfig)
      console.log('🔍 [DEBUG] Core executeAgent - Agent initialized')
      
      const processedContext = await this.prepareExecutionContext(context)
      console.log('🔍 [DEBUG] Core executeAgent - Context prepared')

      console.log('🔍 [DEBUG] Core executeAgent - About to call errorHandler.withRetry')
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

      console.log('🔍 [DEBUG] Core executeAgent - errorHandler.withRetry completed successfully')
      console.log('🔍 [DEBUG] Core executeAgent - Result type:', typeof result)
      console.log('🔍 [DEBUG] Core executeAgent - Result preview:', result ? JSON.stringify(result).slice(0, 200) : 'null')

      execution.status = 'completed'
      execution.endTime = new Date()
  execution.result = (result as ExecutionResult).content
      execution.metrics.executionTimeMs = execution.endTime.getTime() - execution.startTime.getTime()

      console.log('🔍 [DEBUG] Core executeAgent - About to emit execution.completed')
      this.eventEmitter.emit('execution.completed', execution)
      console.log('🔍 [DEBUG] Core executeAgent - Returning result')
      return result as ExecutionResult
    } catch (error) {
      console.log('🔍 [DEBUG] Core executeAgent - Error caught:', error)
      await this.errorHandler.handleExecutionError(execution, error as Error)
      this.eventEmitter.emit('execution.failed', execution)
      throw error
    }
  }

  /**
   * Execute with intelligent supervision - Cleo as smart supervisor
   * Cleo analyzes the request and uses delegation tools if needed
   */
  private async executeWithRouting(
    supervisorConfig: AgentConfig,
    context: ExecutionContext,
    execution: AgentExecution,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const userMessage = String(context.messageHistory[context.messageHistory.length - 1]?.content || '')
    
    console.log(`[Smart Supervisor] Message received: "${userMessage.substring(0, 50)}..."`)
    console.log(`[Smart Supervisor] Cleo will analyze and decide on delegation`)
    
    // Always execute Cleo as intelligent supervisor
    // He has delegation tools and will decide if specialist help is needed
    await this.initializeAgent(supervisorConfig)
    const processedContext = await this.prepareExecutionContext(context)

    const result = await this.errorHandler.withRetry(
      () => this.executionManager.executeWithHistory(
        supervisorConfig,
        this.graphs.get(supervisorConfig.id)!,
        processedContext,
        execution,
        options
      ),
      execution.id
    )

    console.log(`[Smart Supervisor] Cleo completed analysis and execution`)
    
    return result
  }

  /**
   * Legacy agent selector - now unused since Cleo handles all routing intelligently
   * Keeping for potential future reference
   */

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

  /**
   * Get the sub-agent manager instance
   */
  getSubAgentManager(): SubAgentManager {
    return this.subAgentManager
  }

  /**
   * Create a new sub-agent for a parent agent
   */
  async createSubAgent(
    parentAgentId: string,
    subAgentSpec: {
      name: string
      description: string
      specialization: string
      model?: string
      temperature?: number
      tools?: string[]
      promptOverride?: string
    },
    createdBy: string = 'user'
  ): Promise<SubAgent> {
    const subAgentData = {
      name: subAgentSpec.name,
      description: subAgentSpec.description,
      parentAgentId,
      systemPrompt: subAgentSpec.promptOverride || `You are a specialized sub-agent for ${subAgentSpec.specialization}. ${subAgentSpec.description}`,
      model: subAgentSpec.model,
      config: {
        specialization: subAgentSpec.specialization,
        temperature: subAgentSpec.temperature,
        tools: subAgentSpec.tools,
        createdBy
      }
    }
    
    return await this.subAgentManager.createSubAgent(subAgentData)
  }

  /**
   * Get all sub-agents for a parent agent
   */
  async getSubAgents(parentAgentId: string): Promise<SubAgent[]> {
    return await this.subAgentManager.getSubAgents(parentAgentId)
  }

  /**
   * Delete a sub-agent
   */
  async deleteSubAgent(subAgentId: string): Promise<boolean> {
    return await this.subAgentManager.deleteSubAgent(subAgentId)
  }

  /**
   * Update a sub-agent
   */
  async updateSubAgent(
    subAgentId: string,
    updates: Partial<{
      name: string
      description: string
      specialization: string
      model: string
      temperature: number
      tools: string[]
      promptOverride: string
    }>
  ): Promise<boolean> {
    return await this.subAgentManager.updateSubAgent(subAgentId, updates)
  }

  /**
   * Handle delegation requests from agents
   */
  private async handleDelegation(delegationData: any): Promise<void> {
    try {
      console.log(`🔄 [DELEGATION] ${delegationData.sourceAgent} → ${delegationData.targetAgent}`)
      console.log(`📋 [DELEGATION] Task: ${delegationData.task}`)
      const normalizedPriority: 'low' | 'normal' | 'high' =
        delegationData.priority === 'medium' ? 'normal' : (delegationData.priority || 'normal')
      
      // First, check if target is a sub-agent
      let targetAgentConfig: AgentConfig | SubAgent | null | undefined = await this.subAgentManager.getSubAgent(delegationData.targetAgent)
      let isSubAgent = false
      
      // If not a sub-agent, look in main agents
      if (!targetAgentConfig) {
        const allAgents = getAllAgents()
        targetAgentConfig = allAgents.find(agent => agent.id === delegationData.targetAgent)
        isSubAgent = false
      } else {
        isSubAgent = true
      }
      
      if (!targetAgentConfig) {
        console.error(`❌ [DELEGATION] Target agent not found: ${delegationData.targetAgent}`)
        this.eventEmitter.emit('delegation.failed', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          error: `Agent ${delegationData.targetAgent} not found`
        })
        return
      }
      
      console.log(`🎯 [DELEGATION] Target agent type: ${isSubAgent ? 'Sub-Agent' : 'Main Agent'}`)
      
      // Create execution context for delegated task
      const delegationContext: ExecutionContext = {
        threadId: `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: 'system_delegation',
        agentId: delegationData.targetAgent,
        messageHistory: [
          new SystemMessage({
            content: `You have been delegated a task by ${delegationData.sourceAgent}. ${delegationData.context ? `Context: ${delegationData.context}` : ''}`
          }),
          new HumanMessage({
            content: delegationData.task
          })
        ],
        metadata: {
          isDelegation: true,
          sourceAgent: delegationData.sourceAgent,
          delegationPriority: normalizedPriority,
          isSubAgentDelegation: isSubAgent
        }
      }
      
      console.log(`🚀 [DELEGATION] Executing ${targetAgentConfig.name} with delegated task`)
      
      let delegationResult: ExecutionResult

      if (isSubAgent && 'isSubAgent' in targetAgentConfig) {
        // Execute sub-agent as a real agent by mapping to AgentConfig
        console.log(`📋 [SUB-AGENT] Delegating to sub-agent: ${targetAgentConfig.name}`)

        const sub = targetAgentConfig as SubAgent
        // Build a minimal AgentConfig from SubAgent record
        const subAgentConfig: AgentConfig = {
          id: sub.id,
          name: sub.name,
          description: sub.description,
          role: 'worker',
          model: sub.model || 'gpt-4o-mini',
          temperature: typeof sub.temperature === 'number' ? sub.temperature : 0.7,
          maxTokens: typeof sub.maxTokens === 'number' ? sub.maxTokens : 4096,
          // Prefer explicit tools from subAgentConfig if present, else none (safe default)
          tools: Array.isArray(sub.subAgentConfig?.tools) ? sub.subAgentConfig.tools : [],
          prompt: sub.systemPrompt || `You are a specialized sub-agent named ${sub.name}.` ,
          color: '#64748B',
          icon: 'SparklesIcon',
          avatar: undefined,
          isSubAgent: true,
          parentAgentId: sub.parentAgentId,
          tags: Array.isArray(sub.subAgentConfig?.tags) ? sub.subAgentConfig.tags : undefined
        }

        // Ensure graph exists and execute
        await this.initializeAgent(subAgentConfig)
        delegationResult = await this.executeAgent(
          subAgentConfig,
          delegationContext,
          {
            timeout: 30000,
            priority: normalizedPriority
          }
        )
      } else {
        // Execute regular agent with delegated task
        delegationResult = await this.executeAgent(
          targetAgentConfig as AgentConfig,
          delegationContext,
          {
            timeout: 30000, // 30 seconds timeout for delegated tasks
            priority: normalizedPriority
          }
        )
      }
      
      console.log(`✅ [DELEGATION] ${targetAgentConfig.name} completed delegated task`)
      
      // Emit delegation completed event with result
      this.eventEmitter.emit('delegation.completed', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        status: 'completed',
        result: delegationResult.content,
        executionTime: delegationResult.executionTime,
        tokensUsed: delegationResult.tokensUsed,
        isSubAgentDelegation: isSubAgent
      })
      
    } catch (error) {
      console.error('❌ [DELEGATION] Error handling delegation:', error)
      this.eventEmitter.emit('delegation.failed', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

// Singleton instance for global access
export const globalOrchestrator = new AgentOrchestrator()

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

// Helper function to emit browser events for UI updates
function emitBrowserEvent(eventName: string, detail: any) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(eventName, { detail })
    window.dispatchEvent(event)
  }
}

// Global counter for unique ID generation
let orchestratorMessageIdCounter = 0

// Generate unique message ID to prevent conflicts
function generateUniqueOrchestratorMessageId(): string {
  const timestamp = Date.now()
  const counter = ++orchestratorMessageIdCounter
  const random = Math.random().toString(36).substr(2, 6)
  return `orch_msg_${timestamp}_${counter}_${random}`
}

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
      // Executions are now cleaned up explicitly when they complete
      // No automatic cleanup timeout needed
      this.metricsCollector?.recordExecutionComplete(execution)
      
      // Emit browser event for UI
      emitBrowserEvent('execution-completed', {
        executionId: execution.id,
        agentId: execution.agentId,
        result: execution.result,
        executionTime: execution.metrics?.executionTime,
        tokensUsed: execution.metrics?.tokensUsed
      })
      
      // CRITICAL FIX: Notify Legacy Orchestrator of completion
      try {
        const legacyOrch = (globalThis as any).__cleoOrchestrator
        if (legacyOrch?.handleExecutionCompletion) {
          legacyOrch.handleExecutionCompletion(execution)
        }
      } catch (error) {
        console.warn('Failed to notify legacy orchestrator of completion:', error)
      }
    })

    this.eventEmitter.on('execution.failed', (execution: AgentExecution) => {
      this.activeExecutions.delete(execution.id)
      this.metricsCollector?.recordExecutionFailure(execution)
    })

    // Delegation events - handle multi-agent handoffs
    this.eventEmitter.on('delegation.requested', async (delegationData: any) => {
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
    // Use existing executionId from context if available, otherwise generate new one
    const executionId = (context.metadata?.executionId as string) || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
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

    // Wrap entire execution in AsyncLocalStorage context
    return ExecutionManager.runWithExecutionId(executionId, async () => {
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

      // For normal executions, emit completion immediately
      this.eventEmitter.emit('execution.completed', execution)
      
      // Emit browser event for UI updates
      emitBrowserEvent('execution-completed', {
        executionId: execution.id,
        status: 'completed',
        result: execution.result,
        agentId: execution.agentId,
        threadId: execution.threadId
      })
      
      // Clean up execution context for completed execution
      if (this.executionManager?.cleanupExecutionContext) {
        this.executionManager.cleanupExecutionContext(execution.id)
      }
      
      // Keep execution in activeExecutions for 60 seconds to allow polling to get final result
      setTimeout(() => {
        this.activeExecutions.delete(execution.id)
        console.log('🧹 [CLEANUP] Removed completed execution from memory:', execution.id)
      }, 60000) // 60 seconds
      
      return result as ExecutionResult
      } catch (error) {
        console.error('🔍 [DEBUG] Core executeAgent - Error caught:', error)
        await this.errorHandler.handleExecutionError(execution, error as Error)
        this.eventEmitter.emit('execution.failed', execution)
        throw error
      }
    }) // Close AsyncLocalStorage context
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
    
    // Set execution context for delegation tracking throughout supervisor execution
    if (this.executionManager?.setExecutionContext) {
      this.executionManager.setExecutionContext(execution.id)
    }
    
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
    
    // For supervisor executions, mark as completed and clean up properly
    execution.status = 'completed'
    execution.endTime = new Date()
    execution.result = (result as ExecutionResult).content
    execution.metrics.executionTimeMs = execution.endTime.getTime() - execution.startTime.getTime()

    // Emit completion for supervisor execution
    this.eventEmitter.emit('execution.completed', execution)
    
    // Emit browser event for UI updates when supervisor completes
    emitBrowserEvent('execution-completed', {
      executionId: execution.id,
      status: 'completed',
      result: execution.result,
      agentId: execution.agentId,
      threadId: execution.threadId
    })
    
    // Clean up execution context for supervisor AFTER all delegations are complete
    if (this.executionManager?.cleanupExecutionContext) {
      this.executionManager.cleanupExecutionContext(execution.id)
    }
    
    // Keep execution in activeExecutions for 60 seconds to allow polling to get final result
    setTimeout(() => {
      this.activeExecutions.delete(execution.id)
    }, 60000) // 60 seconds
    
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
      console.log(`🔍 [DEBUG] sourceExecutionId:`, delegationData.sourceExecutionId)
      
      // Emit delegation progress events for UI
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'initializing',
        status: 'requested',
        message: `Starting delegation to ${delegationData.targetAgent}`,
        progress: 0
      })
      
      // Also emit browser event for UI
      emitBrowserEvent('delegation-progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'initializing',
        status: 'requested',
        message: `Starting delegation to ${delegationData.targetAgent}`,
        progress: 0
      })
      
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
      
      // Emit progress: agent found
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'analyzing',
        status: 'accepted',
        message: `${delegationData.targetAgent} acepta la tarea`,
        progress: 10
      })
      
      emitBrowserEvent('delegation-progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'analyzing',
        status: 'accepted',
        message: `${delegationData.targetAgent} accepts the task`,
        progress: 10
      })
      
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
      
      // Emit progress: starting execution
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'processing',
        status: 'in_progress',
        message: `${delegationData.targetAgent} está procesando la tarea`,
        progress: 25
      })
      
      emitBrowserEvent('delegation-progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'processing',
        status: 'in_progress',
        message: `${delegationData.targetAgent} is processing the task`,
        progress: 25
      })
      
      let delegationResult: ExecutionResult

      if (isSubAgent && 'isSubAgent' in targetAgentConfig) {
        // Execute sub-agent as a real agent by mapping to AgentConfig
        console.log(`📋 [SUB-AGENT] Delegating to sub-agent: ${targetAgentConfig.name}`)

        // Emit progress: working on sub-agent
        this.eventEmitter.emit('delegation.progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'researching',
          status: 'in_progress',
          message: `Sub-agente ${delegationData.targetAgent} analizando contexto`,
          progress: 40
        })
        
        emitBrowserEvent('delegation-progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'researching',
          status: 'in_progress',
          message: `Sub-agent ${delegationData.targetAgent} analyzing context`,
          progress: 40
        })

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
        
        // Emit progress: executing sub-agent
        this.eventEmitter.emit('delegation.progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'synthesizing',
          status: 'in_progress',
          message: `Sub-agente ejecutando herramientas especializadas`,
          progress: 70
        })
        
        emitBrowserEvent('delegation-progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'synthesizing',
          status: 'in_progress',
          message: `Sub-agent executing specialized tools`,
          progress: 70
        })
        
        delegationResult = await this.executeAgent(
          subAgentConfig,
          delegationContext,
          {
            timeout: 90000, // 90 seconds timeout for sub-agents (was 30 seconds)
            priority: normalizedPriority
          }
        )
      } else {
        // Execute regular agent with delegated task
        
        // Emit progress: executing main agent
        this.eventEmitter.emit('delegation.progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'researching',
          status: 'in_progress',
          message: `${delegationData.targetAgent} ejecutando herramientas`,
          progress: 60
        })
        
        emitBrowserEvent('delegation-progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'researching',
          status: 'in_progress',
          message: `${delegationData.targetAgent} executing tools`,
          progress: 60
        })
        
        delegationResult = await this.executeAgent(
          targetAgentConfig as AgentConfig,
          delegationContext,
          {
            timeout: 120000, // 2 minutes timeout for delegated tasks (was 30 seconds)
            priority: normalizedPriority
          }
        )
      }
      
      console.log(`✅ [DELEGATION] ${targetAgentConfig.name} completed delegated task`)
      
      // Emit progress: finalizing
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'finalizing',
        status: 'completing',
        message: `${delegationData.targetAgent} finalizando respuesta`,
        progress: 90
      })
      
      emitBrowserEvent('delegation-progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'finalizing',
        status: 'completing',
        message: `${delegationData.targetAgent} finalizing response`,
        progress: 90
      })
      
      // Emit delegation completed event with result
      this.eventEmitter.emit('delegation.completed', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        status: 'completed',
        result: delegationResult.content,
        executionTime: delegationResult.executionTime,
        tokensUsed: delegationResult.tokensUsed,
        isSubAgentDelegation: isSubAgent,
        sourceExecutionId: delegationData.sourceExecutionId
      })
      
      // Also emit browser event for UI
      emitBrowserEvent('delegation-completed', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        status: 'completed',
        result: delegationResult.content,
        executionTime: delegationResult.executionTime,
        tokensUsed: delegationResult.tokensUsed,
        isSubAgentDelegation: isSubAgent,
        sourceExecutionId: delegationData.sourceExecutionId
      })

      // CRITICAL FIX: Update the original execution with delegation result
      if (delegationData.sourceExecutionId) {
        console.log('🔄 [DELEGATION] Looking for original execution:', delegationData.sourceExecutionId)
        console.log('🔄 [DELEGATION] Active executions keys:', Array.from(this.activeExecutions.keys()))
        
        const originalExecution = this.activeExecutions.get(delegationData.sourceExecutionId)
        if (originalExecution) {
          console.log('🔄 [DELEGATION] Found original execution, adding delegation result:', delegationData.sourceExecutionId)
          
          // Add delegation result as a message to the execution (but DON'T mark as completed yet)
          const delegationMessage = {
            id: generateUniqueOrchestratorMessageId(),
            type: 'ai' as const,
            content: `✅ Task completed by ${delegationData.targetAgent}:\n\n${delegationResult.content}`,
            timestamp: new Date(),
            metadata: {
              sender: delegationData.targetAgent,
              isDelegationResult: true,
              sourceAgent: delegationData.sourceAgent
            }
          }
          
          originalExecution.messages.push(delegationMessage)
          
          // Update metrics (cumulative)
          originalExecution.metrics.executionTime += delegationResult.executionTime || 0
          originalExecution.metrics.tokensUsed += delegationResult.tokensUsed || 0
          
          console.log('🔄 [DELEGATION] Delegation result added to original execution, keeping it active for more delegations')
          
          // DO NOT mark as completed or remove from activeExecutions yet
          // The original agent (Cleo) may have more delegations to do
          // It will be completed when the agent's graph execution finishes
          
        } else {
          console.warn('🔄 [DELEGATION] Original execution not found:', delegationData.sourceExecutionId)
        }
      }
      
    } catch (error) {
      console.error('❌ [DELEGATION] Error handling delegation:', error)
      this.eventEmitter.emit('delegation.failed', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        error: error instanceof Error ? error.message : String(error)
      })
      
      // Also emit browser event for UI
      emitBrowserEvent('delegation-failed', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

// Singleton instance for global access
export const globalOrchestrator = new AgentOrchestrator()

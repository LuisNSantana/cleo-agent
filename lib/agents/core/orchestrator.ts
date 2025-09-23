/**
 * Advanced Agent Orchestrator Core
 * Extended with router logic, delegation, and tool execution
 */

import { StateGraph, StateGraphArgs } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { AgentConfig, AgentExecution, AgentState, ExecutionResult } from '../types'
import { safeSetState } from '@/lib/agents/execution-state'
import { GraphBuilder } from './graph-builder'
import { ExecutionManager } from './execution-manager'
import { ModelFactory } from './model-factory'
import { EventEmitter } from './event-emitter'
import { globalErrorHandler, AgentErrorHandler } from './error-handler'
import { MemoryManager } from './memory-manager'
import { MetricsCollector } from './metrics-collector'
import { getAgentMetadata } from '../agent-metadata'
import { SubAgentManager, type SubAgent } from './sub-agent-manager'
import { getAllAgents, getAgentById } from '../unified-config'
import { canonicalizeAgentId, getAgentDisplayName } from '../id-canonicalization'
import { getCurrentUserId } from '@/lib/server/request-context'
import { getRuntimeConfig, type RuntimeConfig } from '../runtime-config'
import logger from '@/lib/utils/logger'
import { emitExecutionEvent } from '@/lib/agents/logging-events'

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
  private runtime: RuntimeConfig
  // Track executions that performed at least one delegation
  private delegationsSeen: Set<string> = new Set()

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
  this.runtime = getRuntimeConfig()
  }

  private initializeModules(): void {
    // Initialize core modules
    this.eventEmitter = new EventEmitter()
    this.errorHandler = globalErrorHandler
  this.modelFactory = new ModelFactory()
  // Use NIL UUID as a safe default to avoid non-UUID logs/DB errors; updated per-execution later
  this.subAgentManager = new SubAgentManager('00000000-0000-0000-0000-000000000000', this.eventEmitter)
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
  logger.warn('Failed to notify legacy orchestrator of completion:', error)
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

    // Listen to all delegation progress events and add them as steps for client tracking
    this.eventEmitter.on('delegation.progress', (progressData: any) => {
      this.addDelegationProgressStep(progressData)
    })

    // Graph node lifecycle -> execution steps for graph UI
    this.eventEmitter.on('node.entered', (data: any) => {
      try {
        const execId = ExecutionManager.getCurrentExecutionId() || data?.state?.executionId
        if (!execId) return
        const exec = this.activeExecutions.get(execId)
        if (!exec) return
        if (!exec.steps) exec.steps = []
        const action: any = data?.nodeId === 'router' ? 'routing' : 'analyzing'
        exec.steps.push({
          id: `node_enter_${data?.nodeId || 'unknown'}_${Date.now()}`,
          timestamp: new Date(),
          agent: data?.agentId || exec.agentId,
          action,
          content: `Entered node ${String(data?.nodeId || 'unknown')}`,
          progress: 0,
          metadata: { nodeId: data?.nodeId, stage: 'entered' }
        } as any)

        // Mirror step to parent execution if present (quick exec UI watches parent)
        const parentId = data?.state?.metadata?.parentExecutionId
        if (parentId && parentId !== execId) {
          const parentExec = this.activeExecutions.get(parentId)
          if (parentExec) {
            if (!parentExec.steps) parentExec.steps = []
            parentExec.steps.push({
              id: `node_enter_mirror_${data?.nodeId || 'unknown'}_${Date.now()}`,
              timestamp: new Date(),
              agent: data?.agentId || exec.agentId,
              action,
              content: `(${exec.agentId}) entered ${String(data?.nodeId || 'unknown')}`,
              progress: 0,
              metadata: { nodeId: data?.nodeId, stage: 'entered', mirroredFrom: execId }
            } as any)
          }
        }
      } catch {}
    })

    this.eventEmitter.on('node.completed', (data: any) => {
      try {
        const execId = ExecutionManager.getCurrentExecutionId() || data?.state?.executionId
        if (!execId) return
        const exec = this.activeExecutions.get(execId)
        if (!exec) return
        if (!exec.steps) exec.steps = []
        const isFinalize = data?.nodeId === 'finalize'
        const action: any = isFinalize ? 'completing' : 'responding'
        exec.steps.push({
          id: `node_complete_${data?.nodeId || 'unknown'}_${Date.now()}`,
          timestamp: new Date(),
          agent: data?.agentId || exec.agentId,
          action,
          content: `Completed node ${String(data?.nodeId || 'unknown')}`,
          progress: isFinalize ? 100 : 75,
          metadata: { nodeId: data?.nodeId, stage: 'completed' }
        } as any)

        // Mirror to parent if applicable
        const parentId = data?.state?.metadata?.parentExecutionId
        if (parentId && parentId !== execId) {
          const parentExec = this.activeExecutions.get(parentId)
          if (parentExec) {
            if (!parentExec.steps) parentExec.steps = []
            parentExec.steps.push({
              id: `node_complete_mirror_${data?.nodeId || 'unknown'}_${Date.now()}`,
              timestamp: new Date(),
              agent: data?.agentId || exec.agentId,
              action,
              content: `(${exec.agentId}) completed ${String(data?.nodeId || 'unknown')}`,
              progress: isFinalize ? 100 : 75,
              metadata: { nodeId: data?.nodeId, stage: 'completed', mirroredFrom: execId }
            } as any)
          }
        }
      } catch {}
    })

    // Memory management events
    if (this.memoryManager) {
      this.eventEmitter.on('messages.loaded', (context: ExecutionContext) => {
        this.memoryManager?.trackMessageLoad(context.threadId, context.messageHistory.length)
      })

      this.eventEmitter.on('messages.compressed', (data: { threadId: string, originalCount: number, compressedCount: number }) => {
        logger.debug('[Memory] Compressed messages', { threadId: data.threadId, original: data.originalCount, compressed: data.compressedCount })
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
  // First, try cached tools; if empty, fetch sub-agents and build tools on the fly
  let subAgentToolsMap = this.subAgentManager.getDelegationTools(agentConfig.id) || {}
  if (Object.keys(subAgentToolsMap).length === 0) {
    const subs = await this.subAgentManager.getSubAgents(agentConfig.id)
    // getSubAgents will populate delegationTools internally
    subAgentToolsMap = this.subAgentManager.getDelegationTools(agentConfig.id) || {}
  }
  const subAgentTools = Object.keys(subAgentToolsMap)
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
      steps: [],
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

  // Track in active executions early for visibility
  this.activeExecutions.set(execution.id, execution)

    // Structured log: execution.start (core)
    emitExecutionEvent({
      trace_id: execution.id,
      execution_id: execution.id,
      agent_id: execution.agentId,
      user_id: execution.userId,
      thread_id: execution.threadId,
      state: execution.status,
      event: 'execution.start',
      level: 'info',
      data: { inputPreview: execution.input?.slice(0,200), mode: agentConfig.id === 'cleo-supervisor' ? 'supervisor' : 'direct' }
    })

    // Ensure at least one step exists for polling UIs
    try {
      execution.steps!.push({
        id: `core_start_${Date.now()}`,
        timestamp: new Date(),
        agent: execution.agentId,
        action: 'routing',
        content: `Core execution started (${agentConfig.id})`,
        progress: 0,
        metadata: { mode: agentConfig.id === 'cleo-supervisor' ? 'supervisor' : 'direct' }
      } as any)
      emitExecutionEvent({
        trace_id: execution.id,
        execution_id: execution.id,
        agent_id: execution.agentId,
        user_id: execution.userId,
        thread_id: execution.threadId,
        state: execution.status,
        event: 'step.append',
        level: 'debug',
        data: { stepId: execution.steps?.[0]?.id, action: 'routing' }
      })
    } catch (e) {
      logger.warn('[CORE] Failed to create initial step', { executionId: execution.id, err: e instanceof Error ? e.message : e })
    }

    // Wrap entire execution in AsyncLocalStorage context
    return ExecutionManager.runWithExecutionId(executionId, async () => {
      try {
        // Ensure SubAgentManager uses a valid UUID for this execution
        {
          const NIL_UUID = '00000000-0000-0000-0000-000000000000'
          const isValidUuid = (v?: string) => !!v && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)
          const ctxUserId = isValidUuid(context.userId) ? context.userId : (isValidUuid(getCurrentUserId()) ? (getCurrentUserId() as string) : NIL_UUID)
          await this.subAgentManager.setUser(ctxUserId)
        }

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

  {
      const prevState = (execution as any).status
  const changedState = safeSetState(execution as any, 'completed', logger as any)
  if (changedState) emitExecutionEvent({
        trace_id: execution.id,
        execution_id: execution.id,
        agent_id: execution.agentId,
        user_id: execution.userId,
        thread_id: execution.threadId,
        state: execution.status,
        event: 'state.change',
        level: 'debug',
        data: { prev: prevState, next: execution.status }
      })
    }
      emitExecutionEvent({
        trace_id: execution.id,
        execution_id: execution.id,
        agent_id: execution.agentId,
        user_id: execution.userId,
        thread_id: execution.threadId,
        state: execution.status,
        event: 'execution.complete',
        level: 'info',
        data: { steps: execution.steps?.length || 0, messages: execution.messages?.length || 0 }
      })
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
  logger.debug('🧹 [CLEANUP] Removed completed execution from memory:', execution.id)
      }, 60000) // 60 seconds
      
      return result as ExecutionResult
      } catch (error) {
  logger.error('🔍 [DEBUG] Core executeAgent - Error caught:', error)
        emitExecutionEvent({
          trace_id: execution.id,
          execution_id: execution.id,
          agent_id: execution.agentId,
          user_id: execution.userId,
          thread_id: execution.threadId,
          state: execution.status,
          event: 'execution.error',
          level: 'error',
          data: { error: error instanceof Error ? error.message : String(error) }
        })
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
    // Ensure SubAgentManager uses a valid UUID for this execution
    {
      const NIL_UUID = '00000000-0000-0000-0000-000000000000'
      const isValidUuid = (v?: string) => !!v && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)
      const ctxUserId = isValidUuid(context.userId) ? context.userId : (isValidUuid(getCurrentUserId()) ? (getCurrentUserId() as string) : NIL_UUID)
      await this.subAgentManager.setUser(ctxUserId)
    }

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
  {
    const prevState = (execution as any).status
  const changedState = safeSetState(execution as any, 'completed', logger as any)
  if (changedState) emitExecutionEvent({
      trace_id: execution.id,
      execution_id: execution.id,
      agent_id: execution.agentId,
      user_id: execution.userId,
      thread_id: execution.threadId,
      state: execution.status,
      event: 'state.change',
      level: 'debug',
      data: { prev: prevState, next: execution.status }
    })
  }
    emitExecutionEvent({
      trace_id: execution.id,
      execution_id: execution.id,
      agent_id: execution.agentId,
      user_id: execution.userId,
      thread_id: execution.threadId,
      state: execution.status,
      event: 'execution.complete',
      level: 'info',
      data: { supervisor: true, steps: execution.steps?.length || 0, messages: execution.messages?.length || 0 }
    })
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
    
    // If no delegation occurred during this supervisor run, emit a clear UI signal
    if (!this.delegationsSeen.has(execution.id)) {
      // Add an explicit step to the execution timeline for visibility
      if (!execution.steps) execution.steps = []
      execution.steps.push({
        id: `delegation_skipped_${Date.now()}`,
        timestamp: new Date(),
        agent: supervisorConfig.id,
        action: 'delegating',
        content: `${supervisorConfig.name} handled directly (no delegation)`,
        progress: 100,
        metadata: {
          status: 'skipped',
          stage: 'decision',
          reason: 'direct_or_clarify'
        }
      } as any)
      emitExecutionEvent({
        trace_id: execution.id,
        execution_id: execution.id,
        agent_id: execution.agentId,
        user_id: execution.userId,
        thread_id: execution.threadId,
        state: execution.status,
        event: 'step.append',
        level: 'debug',
        data: { stepId: execution.steps[execution.steps.length-1].id, action: 'delegating', reason: 'skipped' }
      })

      this.eventEmitter.emit('delegation.skipped', {
        executionId: execution.id,
        agentId: supervisorConfig.id,
        reason: 'direct_or_clarify'
      })
      emitBrowserEvent('delegation-skipped', {
        executionId: execution.id,
        agentId: supervisorConfig.id,
        reason: 'direct_or_clarify'
      })
    } else {
      // Clear flag for next runs
      this.delegationsSeen.delete(execution.id)
    }

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
  safeSetState(execution as any, 'cancelled', logger as any)
      execution.endTime = new Date()
      
      this.activeExecutions.delete(executionId)
      this.eventEmitter.emit('execution.cancelled', execution)
      
      return true
    } catch (error) {
  logger.error(`[Orchestrator] Failed to cancel execution ${executionId}:`, error)
      return false
    }
  }

  /**
   * Cleanup resources and shutdown gracefully
   */
  async shutdown(): Promise<void> {
  logger.info('[Orchestrator] Initiating shutdown...')

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

  logger.info('[Orchestrator] Shutdown complete')
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

  private addDelegationProgressStep(progressData: any) {
    // Add delegation progress as execution step for client tracking
    if (progressData.sourceExecutionId) {
      const sourceExecution = this.activeExecutions.get(progressData.sourceExecutionId)
      if (sourceExecution) {
        if (!sourceExecution.steps) sourceExecution.steps = []
        const stepId = `delegation_progress_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        
        // Get agent metadata for display names
        const targetMetadata = getAgentMetadata(progressData.targetAgent)
        
        const newStep = {
          id: stepId,
          timestamp: new Date(),
          agent: progressData.targetAgent,
          action: 'delegating' as const,
          content: progressData.message || `${targetMetadata.name} working on task`,
          progress: progressData.progress || 0,
          metadata: {
            sourceAgent: progressData.sourceAgent,
            delegatedTo: progressData.targetAgent,
            task: progressData.task,
            status: progressData.status,
            stage: progressData.stage,
            message: progressData.message
          }
        }
  sourceExecution.steps.push(newStep)
        
        // Keep only essential logs
        if (process.env.NODE_ENV !== 'production') {
          logger.debug('📝 [DELEGATION] Progress step added:', progressData.stage, progressData.progress, 'Total steps:', sourceExecution.steps.length)
        }
      } else {
  logger.warn('❌ [ORCHESTRATOR] Could not find source execution or steps array:', {
          sourceExecutionId: progressData.sourceExecutionId,
          executionFound: !!sourceExecution,
          hasStepsArray: Boolean(sourceExecution && (sourceExecution as any).steps)
        })
      }
    } else {
  logger.warn('❌ [ORCHESTRATOR] No sourceExecutionId in progress data:', progressData)
    }
  }

  /**
   * Handle delegation requests from agents
   */
  private async handleDelegation(delegationData: any): Promise<void> {
    try {
      logger.info(`🔄 [DELEGATION] ${delegationData.sourceAgent} → ${delegationData.targetAgent}`)
      // Mark that the source execution performed a delegation
      if (delegationData.sourceExecutionId) {
        this.delegationsSeen.add(delegationData.sourceExecutionId)
      }
      
      // Add delegation step to original execution for UI tracking
      if (delegationData.sourceExecutionId) {
        const sourceExecution = this.activeExecutions.get(delegationData.sourceExecutionId)
        if (sourceExecution) {
          if (!sourceExecution.steps) sourceExecution.steps = []
          
          // Get agent metadata for display names
          const sourceMetadata = getAgentMetadata(delegationData.sourceAgent)
          const targetMetadata = getAgentMetadata(delegationData.targetAgent)
          
          sourceExecution.steps.push({
            id: `delegation_${Date.now()}`,
            timestamp: new Date(),
            agent: delegationData.sourceAgent,
            action: 'delegating',
            content: `${sourceMetadata.name} delegating to ${targetMetadata.name}: ${delegationData.task}`,
            progress: 0,
            metadata: {
              sourceAgent: delegationData.sourceAgent,
              delegatedTo: delegationData.targetAgent,
              task: delegationData.task,
              status: 'requested',
              stage: 'initializing'
            }
          })
          
          if (process.env.NODE_ENV === 'development') {
            logger.debug(`📝 [DELEGATION] Step added: ${sourceMetadata.name} → ${targetMetadata.name}`)
          }
        }
      }
      
      // Emit delegation progress events for UI
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'initializing',
        status: 'requested',
        message: `Starting delegation to ${delegationData.targetAgent}`,
        progress: 0,
        sourceExecutionId: delegationData.sourceExecutionId
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
      
  // First, resolve canonical target via DB-backed alias resolver (fallback to static)
  const { resolveAgentCanonicalKey } = await import('../alias-resolver')
  delegationData.targetAgent = await resolveAgentCanonicalKey(delegationData.targetAgent)
      let targetAgentConfig: AgentConfig | SubAgent | null | undefined = await this.subAgentManager.getSubAgent(delegationData.targetAgent)
      let isSubAgent = false
      
      // If not a sub-agent, look in main agents
      if (!targetAgentConfig) {
        const allAgents = await getAllAgents()
        targetAgentConfig = allAgents.find(agent => agent.id === delegationData.targetAgent)
        
        // Legacy mappings now handled by canonicalizeAgentId()
        
        isSubAgent = false
      } else {
        isSubAgent = true
      }
      
      if (!targetAgentConfig) {
        logger.error(`❌ [DELEGATION] Target agent not found: ${delegationData.targetAgent}`)
        this.eventEmitter.emit('delegation.failed', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          error: `Agent ${delegationData.targetAgent} not found`
        })
        return
      }
      
  logger.debug(`🎯 [DELEGATION] Target agent type: ${isSubAgent ? 'Sub-Agent' : 'Main Agent'} (${getAgentDisplayName(delegationData.targetAgent)})`)
      
      // Add progress step: agent found and accepted
      if (delegationData.sourceExecutionId) {
        const sourceExecution = this.activeExecutions.get(delegationData.sourceExecutionId)
        if (sourceExecution && sourceExecution.steps) {
          sourceExecution.steps.push({
            id: `delegation_accepted_${Date.now()}`,
            timestamp: new Date(),
            agent: delegationData.targetAgent,
            action: 'delegating',
            content: `${delegationData.targetAgent} accepted the task`,
            progress: 10,
            metadata: {
              sourceAgent: delegationData.sourceAgent,
              delegatedTo: delegationData.targetAgent,
              task: delegationData.task,
              status: 'accepted',
              stage: 'analyzing'
            }
          })
        }
      }
      
      // Emit progress: agent found
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'analyzing',
        status: 'accepted',
        message: `${delegationData.targetAgent} acepta la tarea`,
        progress: 10,
        sourceExecutionId: delegationData.sourceExecutionId
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
      // Determine a safe, valid userId for delegated executions
      const NIL_UUID = '00000000-0000-0000-0000-000000000000'
      const isValidUuid = (v?: string) => !!v && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)

      const sourceUserId = delegationData?.sourceExecutionId
        ? this.activeExecutions.get(delegationData.sourceExecutionId)?.userId
        : undefined
      const contextUserId = getCurrentUserId()
      const preferredUserId = [delegationData.userId, sourceUserId, contextUserId].find(id => isValidUuid(id))

  logger.debug('👤 [DELEGATION] User resolution:', {
        providedUserId: delegationData.userId,
        sourceUserId,
        contextUserId,
        chosenUserId: preferredUserId || sourceUserId || contextUserId || NIL_UUID
      })

      // Ensure SubAgentManager context is aligned with the chosen user id for this delegation
      try {
        await this.subAgentManager.setUser(preferredUserId || sourceUserId || contextUserId || NIL_UUID)
      } catch {}

      const delegationContext: ExecutionContext = {
        threadId: `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        // Ensure we never set an invalid UUID that would break DB filters/RLS
        userId: preferredUserId || sourceUserId || contextUserId || NIL_UUID,
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
          isSubAgentDelegation: isSubAgent,
          // Link delegated execution to its parent so UI can mirror steps
          parentExecutionId: delegationData.sourceExecutionId
        }
      }
      
  logger.info(`🚀 [DELEGATION] Executing ${targetAgentConfig.name} with delegated task`)
      
      // Emit progress: starting execution
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'processing',
        status: 'in_progress',
        message: `${delegationData.targetAgent} is processing the task`,
        progress: 25,
        sourceExecutionId: delegationData.sourceExecutionId
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
  logger.debug(`📋 [SUB-AGENT] Delegating to sub-agent: ${targetAgentConfig.name}`)

        // Add progress step: sub-agent analyzing
        if (delegationData.sourceExecutionId) {
          const sourceExecution = this.activeExecutions.get(delegationData.sourceExecutionId)
          if (sourceExecution && sourceExecution.steps) {
            sourceExecution.steps.push({
              id: `delegation_analyzing_${Date.now()}`,
              timestamp: new Date(),
              agent: delegationData.targetAgent,
              action: 'delegating',
              content: `${delegationData.targetAgent} analyzing context`,
              progress: 40,
              metadata: {
                sourceAgent: delegationData.sourceAgent,
                delegatedTo: delegationData.targetAgent,
                task: delegationData.task,
                status: 'in_progress',
                stage: 'researching'
              }
            })
          }
        }

        // Emit progress: working on sub-agent
        this.eventEmitter.emit('delegation.progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'researching',
          status: 'in_progress',
          message: `Sub-agente ${delegationData.targetAgent} analizando contexto`,
          progress: 40,
          sourceExecutionId: delegationData.sourceExecutionId
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
        
        // Add progress step: sub-agent executing
        if (delegationData.sourceExecutionId) {
          const sourceExecution = this.activeExecutions.get(delegationData.sourceExecutionId)
          if (sourceExecution && sourceExecution.steps) {
            sourceExecution.steps.push({
              id: `delegation_executing_${Date.now()}`,
              timestamp: new Date(),
              agent: delegationData.targetAgent,
              action: 'delegating',
              content: `${delegationData.targetAgent} executing specialized tools`,
              progress: 70,
              metadata: {
                sourceAgent: delegationData.sourceAgent,
                delegatedTo: delegationData.targetAgent,
                task: delegationData.task,
                status: 'in_progress',
                stage: 'synthesizing'
              }
            })
          }
        }
        
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
            timeout: this.runtime.maxExecutionMsSpecialist,
            priority: normalizedPriority
          }
        )
      } else {
        // Execute regular agent with delegated task
        
        // Add progress step: main agent working
        if (delegationData.sourceExecutionId) {
          const sourceExecution = this.activeExecutions.get(delegationData.sourceExecutionId)
          if (sourceExecution && sourceExecution.steps) {
            sourceExecution.steps.push({
              id: `delegation_researching_${Date.now()}`,
              timestamp: new Date(),
              agent: delegationData.targetAgent,
              action: 'delegating',
              content: `${delegationData.targetAgent} executing tools`,
              progress: 60,
              metadata: {
                sourceAgent: delegationData.sourceAgent,
                delegatedTo: delegationData.targetAgent,
                task: delegationData.task,
                status: 'in_progress',
                stage: 'researching'
              }
            })
          }
        }
        
        // Emit progress: executing main agent
        this.eventEmitter.emit('delegation.progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'researching',
          status: 'in_progress',
          message: `${delegationData.targetAgent} ejecutando herramientas`,
          progress: 60,
          sourceExecutionId: delegationData.sourceExecutionId
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
            timeout: this.runtime.maxExecutionMsSupervisor,
            priority: normalizedPriority
          }
        )
      }
      
  logger.info(`✅ [DELEGATION] ${targetAgentConfig.name} completed delegated task`)
      
      // Add progress step: delegation completing
      if (delegationData.sourceExecutionId) {
        const sourceExecution = this.activeExecutions.get(delegationData.sourceExecutionId)
        if (sourceExecution && sourceExecution.steps) {
          sourceExecution.steps.push({
            id: `delegation_finalizing_${Date.now()}`,
            timestamp: new Date(),
            agent: delegationData.targetAgent,
            action: 'delegating',
            content: `${delegationData.targetAgent} finalizing response`,
            progress: 90,
            metadata: {
              sourceAgent: delegationData.sourceAgent,
              delegatedTo: delegationData.targetAgent,
              task: delegationData.task,
              status: 'completing',
              stage: 'finalizing'
            }
          })
        }
      }
      
      // Emit progress: finalizing
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'finalizing',
        status: 'completing',
        message: `${delegationData.targetAgent} finalizando respuesta`,
        progress: 90,
        sourceExecutionId: delegationData.sourceExecutionId
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
      
      // Add final step: delegation completed
      if (delegationData.sourceExecutionId) {
        const sourceExecution = this.activeExecutions.get(delegationData.sourceExecutionId)
        if (sourceExecution && sourceExecution.steps) {
          sourceExecution.steps.push({
            id: `delegation_completed_${Date.now()}`,
            timestamp: new Date(),
            agent: delegationData.targetAgent,
            action: 'delegating',
            content: `${delegationData.targetAgent} completed the task`,
            progress: 100,
            metadata: {
              sourceAgent: delegationData.sourceAgent,
              delegatedTo: delegationData.targetAgent,
              task: delegationData.task,
              status: 'completed',
              stage: 'finalizing',
              result: delegationResult.content,
              executionTime: delegationResult.executionTime
            }
          })
        }
      }
      
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
        logger.debug('🔄 [DELEGATION] Looking for original execution:', delegationData.sourceExecutionId)
        logger.debug('🔄 [DELEGATION] Active executions keys:', Array.from(this.activeExecutions.keys()))
        
        const originalExecution = this.activeExecutions.get(delegationData.sourceExecutionId)
        if (originalExecution) {
          logger.debug('🔄 [DELEGATION] Found original execution, adding delegation result:', delegationData.sourceExecutionId)
          
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
          
          logger.debug('🔄 [DELEGATION] Delegation result added to original execution, keeping it active for more delegations')
          
          // DO NOT mark as completed or remove from activeExecutions yet
          // The original agent (Cleo) may have more delegations to do
          // It will be completed when the agent's graph execution finishes
          
        } else {
          logger.warn('🔄 [DELEGATION] Original execution not found:', delegationData.sourceExecutionId)
        }
      }
      
    } catch (error) {
      logger.error('❌ [DELEGATION] Error handling delegation:', error)
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

// Singleton instance for global access (lazy-initialized to avoid module load issues)
let _globalOrchestrator: AgentOrchestrator | null = null

export function getGlobalOrchestrator(): AgentOrchestrator {
  if (!_globalOrchestrator) {
    _globalOrchestrator = new AgentOrchestrator()
  }
  return _globalOrchestrator
}

// Backward compatibility
export const globalOrchestrator = {
  get instance() {
    return getGlobalOrchestrator()
  }
}

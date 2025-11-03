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
import { withDelegationContext } from './delegation-context'
import { ExecutionRegistry } from './execution-registry'
import { DelegationCoordinator } from './delegation-coordinator'
import { emitBrowserEvent } from '@/lib/utils/browser-events'

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
  
  // New modular components
  private executionRegistry!: ExecutionRegistry
  private delegationCoordinator!: DelegationCoordinator
  
  // Track executions that performed at least one delegation
  private delegationsSeen: Set<string> = new Set()

  private graphs = new Map<string, StateGraph<AgentState>>()
  // Store interval references for cleanup
  private metricsIntervals: NodeJS.Timeout[] = []

  // Public getter for event emitter (needed for SSE listeners in app/api/chat/route.ts)
  get emitter() {
    return this.eventEmitter
  }

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

    // Initialize execution registry and delegation coordinator
    this.executionRegistry = new ExecutionRegistry({
      maxExecutions: 100,
      ttlMs: 1000 * 60 * 5 // 5 minutes
    })
  // DelegationCoordinator will be initialized after core modules are ready

    this.initializeModules()
  this.runtime = getRuntimeConfig()
    // Now that core modules are initialized, wire the DelegationCoordinator with dependencies
    this.delegationCoordinator = new DelegationCoordinator(
      this.eventEmitter,
      this.executionRegistry,
      this.subAgentManager,
      this.executeAgent.bind(this),
      this.initializeAgent.bind(this),
      this.delegationsSeen,
      {
        maxExecutionMsSpecialist: this.runtime.maxExecutionMsSpecialist,
        maxExecutionMsSupervisor: this.runtime.maxExecutionMsSupervisor,
        delegationTimeoutMs: this.runtime.delegationTimeoutMs
      }
    )
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
      this.executionRegistry.set(execution.id, execution)
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
  this.executionRegistry.delete(execution.id)
  this.metricsCollector?.recordExecutionFailure(execution)
    })

    // CRITICAL: Listen for interrupts from delegated executions
    // When a child execution (e.g., Astra) hits an interrupt, we need to propagate
    // the interrupt step to the parent execution (e.g., Cleo) immediately
    // so that the parent's polling can detect it and show the approval UI
    this.eventEmitter.on('execution.interrupted', (interruptData: any) => {
      try {
        logger.debug('🛑 [ORCHESTRATOR] Interrupt detected in execution:', {
          executionId: interruptData.executionId,
          agentId: interruptData.agentId,
          userId: interruptData.userId,
          action: interruptData.interrupt?.action_request?.action,
          hasStep: !!interruptData.step,
          stepAction: interruptData.step?.action
        })

        // Find parent execution (typically cleo-supervisor) by checking all active executions
        // Strategy: Parent is cleo-supervisor OR any execution that started before the child
        // and is from the same user
        const allExecutions = Array.from(this.executionRegistry.values())
        
        // First, try to find cleo-supervisor execution for this user
        let parentExecution = allExecutions.find(
          (exec: any) => 
            exec.id !== interruptData.executionId && // Not the child
            exec.agentId === 'cleo-supervisor' && // Is Cleo
            exec.userId === interruptData.userId && // Same user
            exec.startTime && // Has started
            (Date.now() - new Date(exec.startTime).getTime()) < 600000 // Within last 10 minutes
        )
        
        // Fallback: find any execution that started before the child and is still active
        if (!parentExecution) {
          const childExec = allExecutions.find(e => e.id === interruptData.executionId)
          if (childExec?.startTime) {
            parentExecution = allExecutions.find(
              (exec: any) => 
                exec.id !== interruptData.executionId && // Not the child
                exec.userId === interruptData.userId && // Same user
                exec.startTime && // Has started
                new Date(exec.startTime).getTime() < new Date(childExec.startTime).getTime() && // Started before child
                (Date.now() - new Date(exec.startTime).getTime()) < 600000 // Within last 10 minutes
            )
          }
        }
        
        if (parentExecution && interruptData.step) {
          // Propagate the interrupt step to the parent execution immediately (use steps, not snapshot)
          if (!Array.isArray(parentExecution.steps)) (parentExecution as any).steps = []
          ;(parentExecution as any).steps.push(interruptData.step)
          
          logger.info('🔄 [ORCHESTRATOR] Propagated interrupt step from delegation to parent:', {
            parentExecId: parentExecution.id,
            parentAgent: parentExecution.agentId,
            childExecId: interruptData.executionId,
            childAgent: interruptData.agentId,
            interruptAction: interruptData.interrupt?.action_request?.action,
            parentStepsCount: (parentExecution as any).steps?.length,
            propagatedStep: {
              id: interruptData.step.id,
              action: interruptData.step.action,
              agent: interruptData.step.agent
            }
          })
          
          // CRITICAL DEBUG: Verify step is actually in the array
          const found = (parentExecution as any).steps?.find((s: any) => s.id === interruptData.step.id)
          if (found) {
            console.log('✅ [ORCHESTRATOR] VERIFIED: Interrupt step exists in parent.steps')
          } else {
            console.error('❌ [ORCHESTRATOR] ERROR: Step not found after push!')
          }
        } else {
          // DEBUG: Why didn't we propagate?
          logger.warn('🔄 [ORCHESTRATOR] Could not find parent execution for interrupt:', {
            childExecId: interruptData.executionId,
            childAgent: interruptData.agentId,
            parentExecutionFound: !!parentExecution,
            stepExists: !!interruptData.step,
            reason: !parentExecution ? 'NO_PARENT_FOUND' : 'NO_STEP_IN_EVENT_DATA',
            activeExecutions: Array.from(this.executionRegistry.keys())
          })
        }
        
        // CRITICAL: Always propagate to external listeners (SSE streams) regardless of parent propagation
        // The event 'execution.interrupted' is listened to by chat/route.ts for SSE emission
        // DO NOT block or consume this event - multiple listeners need it
      } catch (error) {
        logger.error('❌ [ORCHESTRATOR] Error handling execution.interrupted event:', error)
      }
    })

    // Delegation events - handle multi-agent handoffs
    this.eventEmitter.on('delegation.requested', async (delegationData: any) => {
  await this.delegationCoordinator.handleDelegation(delegationData)
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
        const exec = this.executionRegistry.get(execId)
        if (!exec) return
        if (!exec.steps) exec.steps = []
        const action: any = data?.nodeId === 'router' ? 'routing' : 'analyzing'
        exec.steps.push({
          id: `node_enter_${data?.nodeId || 'unknown'}_${Date.now()}`,
          timestamp: new Date(),
          agent: data?.agentId || exec.agentId,
          agentName: exec.agentName,
          action,
          content: `Entered node ${String(data?.nodeId || 'unknown')}`,
          progress: 0,
          metadata: { nodeId: data?.nodeId, stage: 'entered' }
        } as any)

        // Mirror step to parent execution if present (quick exec UI watches parent)
        const parentId = data?.state?.metadata?.parentExecutionId
        if (parentId && parentId !== execId) {
          const parentExec = this.executionRegistry.get(parentId)
          if (parentExec) {
            if (!parentExec.steps) parentExec.steps = []
            parentExec.steps.push({
              id: `node_enter_mirror_${data?.nodeId || 'unknown'}_${Date.now()}`,
              timestamp: new Date(),
              agent: data?.agentId || exec.agentId,
              agentName: exec.agentName,
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
        const exec = this.executionRegistry.get(execId)
        if (!exec) return
        if (!exec.steps) exec.steps = []
        const isFinalize = data?.nodeId === 'finalize'
        const action: any = isFinalize ? 'completing' : 'responding'
        exec.steps.push({
          id: `node_complete_${data?.nodeId || 'unknown'}_${Date.now()}`,
          timestamp: new Date(),
          agent: data?.agentId || exec.agentId,
          agentName: exec.agentName,
          action,
          content: `Completed node ${String(data?.nodeId || 'unknown')}`,
          progress: isFinalize ? 100 : 75,
          metadata: { nodeId: data?.nodeId, stage: 'completed' }
        } as any)

        // Mirror to parent if applicable
        const parentId = data?.state?.metadata?.parentExecutionId
        if (parentId && parentId !== execId) {
          const parentExec = this.executionRegistry.get(parentId)
          if (parentExec) {
            if (!parentExec.steps) parentExec.steps = []
            parentExec.steps.push({
              id: `node_complete_mirror_${data?.nodeId || 'unknown'}_${Date.now()}`,
              timestamp: new Date(),
              agent: data?.agentId || exec.agentId,
              agentName: exec.agentName,
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
    const errorMetricsInterval = setInterval(() => {
      const errorMetrics = this.errorHandler.getErrorMetrics()
      this.metricsCollector!.updateErrorMetrics(errorMetrics)
    }, 60000) // Every minute
    this.metricsIntervals.push(errorMetricsInterval)

    // Collect system metrics
    const systemMetricsInterval = setInterval(() => {
      this.metricsCollector!.recordSystemMetrics({
        activeExecutions: this.executionRegistry.size(),
        totalGraphs: this.graphs.size,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      })
    }, 30000) // Every 30 seconds
    this.metricsIntervals.push(systemMetricsInterval)
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
      agentName: agentConfig.name,
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
  this.executionRegistry.set(execution.id, execution)

    // If this is a delegation, emit the execution.started event for tracking
    if (context.metadata?.isDelegation) {
      const sourceExecId = context.metadata.parentExecutionId || 'unknown'
      const sourceAgent = context.metadata.sourceAgent || 'unknown'
      const delegationKey = `${sourceExecId}:${sourceAgent}:${execution.agentId}`
      
      this.eventEmitter.emit('delegation.execution.started', {
        delegationKey,
        executionId: execution.id
      })
      
      logger.debug('DELEGATION', `Emitted execution.started for child`, {
        delegationKey,
        childExecutionId: execution.id
      })
    }

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
        agentName: agentConfig.name,
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

    // Wrap entire execution in delegation context AND AsyncLocalStorage
    return withDelegationContext(context.userId, executionId, () =>
      ExecutionManager.runWithExecutionId(executionId, async () => {
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
  this.executionRegistry.delete(execution.id)
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
    })) // Close AsyncLocalStorage context + delegation context
  }

  /**
   * Execute with intelligent supervision - Cleo as smart supervisor
   * Cleo analyzes the request and uses delegation tools if needed
   * CRITICAL: Always returns a response, even on timeout/error
   */
  private async executeWithRouting(
    supervisorConfig: AgentConfig,
    context: ExecutionContext,
    execution: AgentExecution,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const userMessage = String(context.messageHistory[context.messageHistory.length - 1]?.content || '')
    
    // 🎯 Early Intent Detection - Provide routing hints to Cleo supervisor
    const { detectEarlyIntent } = await import('../router')
    const routingHint = detectEarlyIntent(userMessage)
    
    if (routingHint) {
      const hintPayload = {
        type: 'routing-directive',
        directive: routingHint,
      }
      const hintMessage = `🎯 ROUTING DIRECTIVE ${JSON.stringify(hintPayload)}`
      
      emitExecutionEvent({
        trace_id: execution.id,
        execution_id: execution.id,
        agent_id: execution.agentId,
        user_id: execution.userId,
        thread_id: execution.threadId,
        state: execution.status,
        event: 'routing.hint_detected',
        level: 'info',
        data: { hint: routingHint, userMessage: userMessage.slice(0, 100) }
      })

      // Modify context to include routing hint
      context = {
        ...context,
        messageHistory: [
          ...context.messageHistory.slice(0, -1),
          new SystemMessage(hintMessage),
          context.messageHistory[context.messageHistory.length - 1] // Keep original user message last
        ]
      }
    }
    
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
    let processedContext = await this.prepareExecutionContext(context)

    // CRITICAL FIX: LangGraph Orchestrator-Worker Pattern
    // According to LangGraph documentation, after a worker (specialist) completes,
    // the orchestrator should ONLY synthesize the worker's output with the CURRENT request,
    // NOT process the entire thread history as new tasks.
    // 
    // Filter out historical messages that were already handled in previous turns.
    // Keep only: system message + current user request + delegation results (if any)
    //
    // This prevents Cleo from treating old resolved requests as new pending tasks.
    const currentUserMessage = processedContext.messageHistory[processedContext.messageHistory.length - 1]
    const systemMessage = processedContext.messageHistory.find(m => m._getType() === 'system')
    
    // Find the most recent delegation completion messages (ToolMessages from this execution)
    const recentDelegationResults = processedContext.messageHistory
      .filter(m => m._getType() === 'tool')
      .slice(-5) // Keep last 5 tool results max (usually 1-2 delegations)
    
    // CRITICAL: Check if currentUserMessage has multimodal content (images)
    // If so, use the FULL message from processedContext, not just extracted reference
    const lastMessageContent = (currentUserMessage as any)?.content
    const hasMultimodalContent = Array.isArray(lastMessageContent) 
      && lastMessageContent.some((p: any) => p?.type === 'image_url')
    
    // Build focused context: system + recent delegations + current user request
    // IMPORTANT: Use the actual last message from processedContext.messageHistory to preserve multimodal content
    const actualLastMessage = processedContext.messageHistory[processedContext.messageHistory.length - 1]
    const focusedHistory = [
      ...(systemMessage ? [systemMessage] : []),
      ...recentDelegationResults,
      actualLastMessage
    ].filter(Boolean)
    
    logger.info('🎯 [SUPERVISOR] Focused context for orchestrator', {
      originalHistoryLength: processedContext.messageHistory.length,
      focusedHistoryLength: focusedHistory.length,
      hasDelegationResults: recentDelegationResults.length > 0,
      hasMultimodalContent,
      lastMessageImageCount: hasMultimodalContent 
        ? lastMessageContent.filter((p: any) => p?.type === 'image_url').length 
        : 0
    })
    
    processedContext = {
      ...processedContext,
      messageHistory: focusedHistory
    }

    // CRITICAL FIX: Supervisor timeout should be long enough for HITL (approvals)
    // and should PAUSE while an active interrupt is waiting for user input.
    // Base timeout comes from runtime, but we manage it dynamically below.
    const supervisorTimeoutConfig = this.runtime.maxExecutionMsSupervisor
    const SUPERVISOR_TIMEOUT = Number.isFinite(supervisorTimeoutConfig) && supervisorTimeoutConfig > 0
      ? supervisorTimeoutConfig
      : 0
    
    let result: ExecutionResult;
    let timedOut = false;
    
    try {
      const supervisorPromise = this.errorHandler.withRetry(
        () => this.executionManager.executeWithHistory(
          supervisorConfig,
          this.graphs.get(supervisorConfig.id)!,
          processedContext,
          execution,
          options
        ),
        execution.id
      );

      if (SUPERVISOR_TIMEOUT) {
        // Dynamic timeout that pauses while a child execution is waiting for approval
        // Track potential child execution with an active interrupt
        let waitingForApproval = false
        let lastKnownChildExecId: string | null = null
        let intervalId: NodeJS.Timeout | null = null

        // Listener to detect interrupts from delegated executions
        const pauseOnInterrupt = (interruptData: any) => {
          try {
            // Same user, and likely our parent execution (Cleo supervisor)
            if (interruptData?.userId === processedContext.userId) {
              waitingForApproval = true
              lastKnownChildExecId = String(interruptData.executionId || '') || lastKnownChildExecId
            }
          } catch {}
        }

        this.eventEmitter?.on('execution.interrupted', pauseOnInterrupt)

        // Build a controllable timer that checks every second
        const startTime = Date.now()
        const dynamicTimeout = new Promise<never>((_, reject) => {
          const check = async () => {
            try {
              // If we're in approval wait, verify via InterruptManager whether it's still pending
              if (waitingForApproval && lastKnownChildExecId) {
                try {
                  const { InterruptManager } = await import('../core/interrupt-manager')
                  const state = await InterruptManager.getInterrupt(lastKnownChildExecId)
                  if (!state || state.status !== 'pending') {
                    // Interrupt resolved or not found → resume timeout counting
                    waitingForApproval = false
                  }
                } catch {}
              }

              const elapsed = Date.now() - startTime
              if (!waitingForApproval && elapsed >= SUPERVISOR_TIMEOUT) {
                timedOut = true
                reject(new Error(`Supervisor timeout: ${supervisorConfig.id} exceeded ${SUPERVISOR_TIMEOUT/1000}s (including all delegations)`))
                return
              }
            } finally {
              // Re-arm check each second unless promise already resolved/rejected
              intervalId = setTimeout(check, 1000)
            }
          }
          check()
        })

        try {
          result = await Promise.race([
            supervisorPromise.finally(() => {
              if (intervalId) clearTimeout(intervalId)
              this.eventEmitter?.off('execution.interrupted', pauseOnInterrupt)
            }),
            dynamicTimeout
          ]) as ExecutionResult
        } catch (err) {
          // Ensure listener cleanup on error
          this.eventEmitter?.off('execution.interrupted', pauseOnInterrupt)
          if (intervalId) clearTimeout(intervalId)
          throw err
        }
      } else {
        result = await supervisorPromise as ExecutionResult
      }
    } catch (error) {
      // CRITICAL: Always return a response to user, even on error/timeout
      logger.error('❌ [SUPERVISOR] Execution failed:', error);
      
      // Mark execution as failed
      safeSetState(execution as any, 'failed', logger as any);
      execution.endTime = new Date();
      execution.metrics.executionTimeMs = execution.endTime.getTime() - execution.startTime.getTime();
      
      // Emit failure events
      this.eventEmitter.emit('execution.failed', execution);
      emitBrowserEvent('execution-failed', {
        executionId: execution.id,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        agentId: execution.agentId,
        threadId: execution.threadId
      });
      
      // Create error response for user
      const errorMessage = timedOut
        ? `⏱️ Lo siento, la tarea excedió el tiempo máximo de ${SUPERVISOR_TIMEOUT/1000} segundos. Por favor, intenta con una solicitud más específica o divídela en partes más pequeñas.`
        : `❌ Lo siento, ocurrió un error al procesar tu solicitud: ${error instanceof Error ? error.message : String(error)}`;
      
      result = {
        content: errorMessage,
        metadata: {
          sender: supervisorConfig.id,
          error: true,
          timedOut,
          originalError: error instanceof Error ? error.message : String(error)
        },
        executionTime: execution.metrics.executionTimeMs,
        tokensUsed: 0,
        messages: []
      };
      
      execution.result = result.content;
      
      // Clean up and keep in memory briefly for polling
      if (this.executionManager?.cleanupExecutionContext) {
        this.executionManager.cleanupExecutionContext(execution.id);
      }
      setTimeout(() => {
        this.executionRegistry.delete(execution.id);
      }, 60000);
      
      // Return error response instead of throwing
      return result;
    }
    
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
      this.executionRegistry.delete(execution.id)
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
    const processedContext = { ...context }

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
    return this.executionRegistry.get(executionId) || null
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): AgentExecution[] {
    return Array.from(this.executionRegistry.values())
  }

  /**
   * Get system metrics
   */
  getMetrics(): Record<string, any> {
    return {
      activeExecutions: this.executionRegistry.size(),
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
    const execution = this.executionRegistry.get(executionId)
    if (!execution) {
      return false
    }

    try {
  safeSetState(execution as any, 'cancelled', logger as any)
      execution.endTime = new Date()
      
      this.executionRegistry.delete(executionId)
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
    const activeExecutionIds = Array.from(this.executionRegistry.keys())
    await Promise.all(
      activeExecutionIds.map(id => this.cancelExecution(id))
    )

    // Clear caches
    this.graphs.clear()
    this.executionRegistry.clear()

    // Shutdown modules
    if (this.memoryManager) {
      await this.memoryManager.cleanup()
    }

    if (this.metricsCollector) {
      await this.metricsCollector.flush()
    }

    // Clear all metrics intervals
    this.metricsIntervals.forEach(interval => clearInterval(interval))
    this.metricsIntervals = []

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
    // Fallback: infer executionId if missing (tolerant normalization)
    const inferredExecId = progressData.sourceExecutionId || ExecutionManager.getCurrentExecutionId()
    if (inferredExecId) {
      const sourceExecution = this.executionRegistry.get(inferredExecId)
      if (sourceExecution) {
        if (!sourceExecution.steps) sourceExecution.steps = []
        const stepId = `delegation_progress_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        
        // Use agentName from progressData if available (preferred), fallback to getAgentDisplayName
        // This ensures custom agents show their friendly names
        const targetDisplayName = progressData.agentName || getAgentDisplayName(progressData.targetAgent)
        
        const newStep = {
          id: stepId,
          timestamp: new Date(),
          agent: progressData.targetAgent,
          agentName: targetDisplayName, // ✅ Add friendly name for UI
          action: 'delegating' as const,
          content: progressData.message || `${targetDisplayName} working on task`,
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
        logger.debug('⚠️ [ORCHESTRATOR] Could not find source execution or steps array for delegation progress:', {
          sourceExecutionId: inferredExecId,
          executionFound: !!sourceExecution,
          hasStepsArray: Boolean(sourceExecution && (sourceExecution as any).steps)
        })
      }
    } else {
      // Lower severity and avoid noise; many progress events are emitted from child contexts
      logger.debug('⚠️ [ORCHESTRATOR] No executionId available for delegation progress (skipping step):', {
        stage: progressData?.stage,
        status: progressData?.status,
        targetAgent: progressData?.targetAgent
      })
    }
  }

  /**
   * Handle delegation requests from agents
   */
  
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

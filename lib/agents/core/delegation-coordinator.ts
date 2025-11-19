/**
 * Delegation Coordinator Module
 * 
 * Handles full delegation lifecycle: creation, execution, and completion.
 * Coordinates between parent and child executions during delegations.
 * 
 * Responsibilities:
 * - Execute delegated tasks (sub-agents and main agents)
 * - Process delegation.completed events
 * - Resolve delegation promises via AsyncLocalStorage
 * - Add delegation results to parent execution context
 * - Emit progress events for UI updates
 */

import logger from '@/lib/utils/logger'
import { EventEmitter } from './event-emitter'
import { ExecutionRegistry } from './execution-registry'
import { getResolver } from './delegation-context'
import { canonicalizeAgentId } from '../id-canonicalization'
import { getCurrentUserId } from '@/lib/server/request-context'
import { getAllAgents } from '../unified-config'
import { getAgentMetadata } from '../agent-metadata'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import type { AgentConfig, ExecutionResult } from '../types'
import type { SubAgent } from './sub-agent-manager'
import type { SubAgentManager } from './sub-agent-manager'
import type { ExecutionContext } from './orchestrator'
import { emitBrowserEvent } from '@/lib/utils/browser-events'

// Global counter for unique ID generation
let delegationMessageIdCounter = 0

// Generate unique message ID to prevent conflicts
function generateUniqueMessageId(): string {
  const timestamp = Date.now()
  const counter = ++delegationMessageIdCounter
  const random = Math.random().toString(36).substr(2, 6)
  return `del_msg_${timestamp}_${counter}_${random}`
}

export interface DelegationCompletionData {
  sourceAgent: string
  targetAgent: string
  sourceExecutionId?: string
  result: any
  continuationHint?: string
  executionTime?: number
}

export interface DelegationProgressData {
  sourceAgent: string
  targetAgent: string
  sourceExecutionId?: string
  status: string
  message: string
  timestamp: string
}

export interface DelegationData {
  sourceAgent: string
  targetAgent: string
  task: string
  context?: string
  priority?: 'low' | 'medium' | 'high'
  sourceExecutionId?: string
  userId?: string
  conversationHistory?: any[]
}

export interface RuntimeConfig {
  maxExecutionMsSpecialist: number
  maxExecutionMsSupervisor: number
  delegationTimeoutMs: number
}

export type ExecuteAgentFn = (
  config: AgentConfig,
  context: ExecutionContext,
  options?: { timeout?: number; priority?: 'low' | 'normal' | 'high' }
) => Promise<ExecutionResult>

export class DelegationCoordinator {
  private eventEmitter: EventEmitter
  private executionRegistry: ExecutionRegistry
  private subAgentManager: SubAgentManager
  private executeAgentFn: ExecuteAgentFn
  private initializeAgentFn: (config: AgentConfig) => Promise<void>
  private delegationsSeen: Set<string>
  private runtime: RuntimeConfig

  constructor(
    eventEmitter: EventEmitter,
    executionRegistry: ExecutionRegistry,
    subAgentManager: SubAgentManager,
    executeAgentFn: ExecuteAgentFn,
    initializeAgentFn: (config: AgentConfig) => Promise<void>,
    delegationsSeen: Set<string>,
    runtime: RuntimeConfig
  ) {
    this.eventEmitter = eventEmitter
    this.executionRegistry = executionRegistry
    this.subAgentManager = subAgentManager
    this.executeAgentFn = executeAgentFn
    this.initializeAgentFn = initializeAgentFn
    this.delegationsSeen = delegationsSeen
    this.runtime = runtime
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // Handle delegation completion
    this.eventEmitter.on('delegation.completed', (data: DelegationCompletionData) => {
      this.handleDelegationCompletion(data)
    })

    // Handle delegation progress (optional, for logging/monitoring)
    this.eventEmitter.on('delegation.progress', (data: DelegationProgressData) => {
      this.handleDelegationProgress(data)
    })
  }

  /**
   * Handle delegation completion event
   */
  private handleDelegationCompletion(delegationData: DelegationCompletionData): void {
    try {
      // Resolve canonical agent ID for key matching
      const canonicalTargetAgent = canonicalizeAgentId(delegationData.targetAgent)
      
      // Find original (parent) execution
      if (!delegationData.sourceExecutionId) {
        logger.warn('[DELEGATION-COORD]', '❌ No sourceExecutionId in completion data')
        return
      }

      const originalExecution = this.executionRegistry.get(delegationData.sourceExecutionId)
      
      if (originalExecution) {
        logger.info('[DELEGATION-COORD]', '🔄 Found parent execution', {
          parentId: delegationData.sourceExecutionId,
          targetAgent: canonicalTargetAgent
        })

        // Build delegation key for resolver lookup
        const delegationKey = `${delegationData.sourceExecutionId}:${delegationData.sourceAgent}:${canonicalTargetAgent}`
        
        logger.info('[DELEGATION-COORD]', '🔑 Looking up resolver', { delegationKey })

        // Resolve via AsyncLocalStorage context
        const resolver = getResolver(delegationKey)
        if (resolver && typeof resolver.resolve === 'function') {
          logger.info('[DELEGATION-COORD]', '🎯 Resolving delegation promise', {
            delegationKey,
            hasResult: !!delegationData.result
          })
          resolver.resolve({
            success: true,
            result: delegationData.result,
            targetAgent: canonicalTargetAgent,
            continuationHint: delegationData.continuationHint
          })
          logger.info('[DELEGATION-COORD]', '✅ Resolver completed, parent can continue')
        } else {
          logger.warn('[DELEGATION-COORD]', '⚠️ No resolver found', { delegationKey })
        }
      } else {
        logger.warn('[DELEGATION-COORD]', '🔄 Parent execution not found:', delegationData.sourceExecutionId)
      }
    } catch (error) {
      logger.error('[DELEGATION-COORD]', '❌ Error handling delegation completion:', error)
    }
  }

  /**
   * Handle delegation progress event (for monitoring)
   */
  private handleDelegationProgress(data: DelegationProgressData): void {
    if (!data.sourceExecutionId) {
      logger.debug('[DELEGATION-COORD]', '⚠️ No sourceExecutionId in progress data:', data.message)
      return
    }

    logger.debug('[DELEGATION-COORD]', `📊 Progress: ${data.status} - ${data.message}`, {
      source: data.sourceAgent,
      target: data.targetAgent,
      executionId: data.sourceExecutionId
    })
  }

  /**
   * Execute a delegated task. Mirrors the original Orchestrator.handleDelegation logic,
   * but routed through this coordinator with explicit dependencies.
   */
  public async handleDelegation(delegationData: any): Promise<void> {
    try {
      logger.info(`🔄 [DELEGATION] ${delegationData.sourceAgent} → ${delegationData.targetAgent}`)
      // Mark that the source execution performed a delegation
      if (delegationData.sourceExecutionId) {
        this.delegationsSeen.add(delegationData.sourceExecutionId)
      }

      const normalizedPriority: 'low' | 'normal' | 'high' =
        delegationData.priority === 'medium' ? 'normal' : (delegationData.priority || 'normal')

      // Resolve canonical target via alias resolver (db-backed)
      const { resolveAgentCanonicalKey } = await import('../alias-resolver')
      delegationData.targetAgent = await resolveAgentCanonicalKey(delegationData.targetAgent)

      let targetAgentConfig: AgentConfig | SubAgent | null | undefined = await this.subAgentManager.getSubAgent(delegationData.targetAgent)
      let isSubAgent = false

      if (!targetAgentConfig) {
        // Resolve user for agent loading
        const sourceExecUserId = delegationData.sourceExecutionId ? this.executionRegistry.get(delegationData.sourceExecutionId)?.userId : undefined
        const candidateUserId = delegationData.userId || sourceExecUserId || getCurrentUserId()
        const allAgents = await getAllAgents(candidateUserId)
        targetAgentConfig = allAgents.find(agent => agent.id === delegationData.targetAgent)
        isSubAgent = false
      } else {
        isSubAgent = true
      }

      if (!targetAgentConfig) {
        logger.error(`❌ [DELEGATION] Target agent not found: ${delegationData.targetAgent}`)
        
        // ✅ CIRCUIT BREAKER: Resolve delegation promise immediately with error
        // Prevents 300s timeout waiting for non-existent agent
        const canonicalTargetAgent = canonicalizeAgentId(delegationData.targetAgent)
        const delegationKey = `${delegationData.sourceExecutionId}:${delegationData.sourceAgent}:${canonicalTargetAgent}`
        
        const resolver = getResolver(delegationKey)
        if (resolver) {
          logger.info('[DELEGATION-COORD]', '🚨 Resolving delegation with error (circuit breaker)')
          resolver.resolve({
            success: false,
            error: new Error(`Agent ${delegationData.targetAgent} not found`),
            result: null
          })
        }
        
        this.eventEmitter.emit('delegation.failed', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          error: `Agent ${delegationData.targetAgent} not found`
        })
        return
      }

      logger.debug(`🎯 [DELEGATION] Target agent type: ${isSubAgent ? 'Sub-Agent' : 'Main Agent'} (${(targetAgentConfig as any).name})`)
      const targetAgentName = (targetAgentConfig as any).name

      // ✅ CONSOLIDATED DELEGATION STEPS: Only 1 initial step instead of 7+
      // Track in parent execution steps (ONLY ONE STEP for delegation start)
      if (delegationData.sourceExecutionId) {
        const sourceExecution = this.executionRegistry.get(delegationData.sourceExecutionId)
        if (sourceExecution) {
          if (!sourceExecution.steps) (sourceExecution as any).steps = []
          const sourceMetadata = getAgentMetadata(delegationData.sourceAgent)
          ;(sourceExecution as any).steps.push({
            id: `delegation_${Date.now()}`,
            timestamp: new Date(),
            agent: delegationData.sourceAgent,
            agentName: sourceMetadata.name,
            action: 'delegating',
            content: `${sourceMetadata.name} delegó tarea a ${targetAgentName}`,
            progress: 0,
            metadata: {
              sourceAgent: delegationData.sourceAgent,
              delegatedTo: delegationData.targetAgent,
              task: delegationData.task,
              status: 'in_progress',
              stage: 'processing'
            }
          })
        }
      }

      // ❌ REMOVED: Redundant "analyzing/accepted" progress emission
      // This creates duplicate "Analyzing" steps that confuse users
      // The initial delegation step (line ~244) is sufficient
      /*
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'analyzing',
        status: 'accepted',
        message: `${targetAgentName} acepta la tarea`,
        agentName: targetAgentName,
        progress: 10,
        sourceExecutionId: delegationData.sourceExecutionId
      })
      emitBrowserEvent('delegation-progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'analyzing',
        status: 'accepted',
        message: `${targetAgentName} accepts the task`,
        progress: 10
      })
      */

      // Build execution context for delegation
      const NIL_UUID = '00000000-0000-0000-0000-000000000000'
      const isValidUuid = (v?: string) => !!v && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)

      const sourceUserId = delegationData?.sourceExecutionId
        ? this.executionRegistry.get(delegationData.sourceExecutionId)?.userId
        : undefined
      const contextUserId = getCurrentUserId()
      const preferredUserId = [delegationData.userId, sourceUserId, contextUserId].find(id => isValidUuid(id))

      logger.debug('👤 [DELEGATION] User resolution:', {
        providedUserId: delegationData.userId,
        sourceUserId,
        contextUserId,
        chosenUserId: (preferredUserId || sourceUserId || contextUserId || NIL_UUID) as string
      })

      try {
        await this.subAgentManager.setUser(preferredUserId || sourceUserId || contextUserId || NIL_UUID)
      } catch {}

      const conversationHistory = delegationData.conversationHistory || []
      const isSimpleTask = delegationData.task.length < 200 || 
                           delegationData.task.toLowerCase().includes('publica') ||
                           delegationData.task.toLowerCase().includes('post') ||
                           delegationData.task.toLowerCase().includes('publish')
      const historyLimit = isSimpleTask ? 3 : 10
      const recentHistory = conversationHistory.slice(-historyLimit)

      // 🔧 CRITICAL FIX: Preserve multimodal parts (images, PDFs, etc.) from original message
      // Find the last HumanMessage in conversationHistory that has multimodal content
      let delegationTaskMessage: any
      const lastHumanMsg = conversationHistory
        .slice()
        .reverse()
        .find((msg: any) => msg._getType && msg._getType() === 'human')
      
      // If original message has multimodal parts, preserve them in delegation
      if (lastHumanMsg && Array.isArray((lastHumanMsg as any).content)) {
        logger.debug('🎯 [DELEGATION] Preserving multimodal parts from original message', {
          partsCount: (lastHumanMsg as any).content.length,
          types: (lastHumanMsg as any).content.map((p: any) => p.type)
        })
        
        // Create new message with preserved multimodal content + delegation task
        const originalParts = (lastHumanMsg as any).content
        delegationTaskMessage = new HumanMessage({ 
          content: [
            { type: 'text', text: delegationData.task },
            ...originalParts.filter((p: any) => p.type !== 'text') // Keep images, files, etc.
          ]
        })
      } else {
        // Fallback: text-only message (original behavior)
        delegationTaskMessage = new HumanMessage({ content: delegationData.task })
      }

      const delegationMessageHistory = [
        ...recentHistory,
        new SystemMessage({
          content: `You have been delegated a task by ${delegationData.sourceAgent}. ${delegationData.context ? `Context: ${delegationData.context}` : ''}`
        }),
        delegationTaskMessage
      ]

      logger.debug('🔍 [DELEGATION CONTEXT] Building context with conversation history:', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        conversationHistoryLength: conversationHistory.length,
        filteredHistoryLength: recentHistory.length,
        totalHistoryLength: delegationMessageHistory.length,
        isSimpleTask,
        task: delegationData.task.slice(0, 100)
      })

      // ✅ CRITICAL: Inherit isScheduledTask flag from parent execution
      // This ensures auto-approval bypasses HITL in delegated tasks (pre-authorized)
      let inheritedIsScheduledTask = false
      if (delegationData.sourceExecutionId) {
        const sourceExecution = this.executionRegistry.get(delegationData.sourceExecutionId)
        if (sourceExecution && (sourceExecution as any).metadata?.isScheduledTask === true) {
          inheritedIsScheduledTask = true
          logger.debug('🔑 [DELEGATION] Inherited isScheduledTask=true from parent execution', {
            parentExecId: delegationData.sourceExecutionId,
            childAgent: delegationData.targetAgent
          })
        }
      }

      const delegationContext: ExecutionContext = {
        threadId: `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: (preferredUserId || sourceUserId || contextUserId || NIL_UUID) as string,
        agentId: delegationData.targetAgent,
        messageHistory: delegationMessageHistory as any,
        metadata: {
          isDelegation: true,
          sourceAgent: delegationData.sourceAgent,
          delegationPriority: normalizedPriority,
          isSubAgentDelegation: isSubAgent,
          parentExecutionId: delegationData.sourceExecutionId,
          originalHistoryLength: conversationHistory.length,
          filteredHistoryLength: recentHistory.length,
          isSimpleTask,
          isScheduledTask: inheritedIsScheduledTask  // ✅ Propagate to child
        }
      }

      logger.info(`🚀 [DELEGATION] Executing ${targetAgentName} with delegated task`)

      // ❌ REMOVED: Redundant "processing" progress emission
      // User already knows task is in progress from initial step
      /*
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'processing',
        status: 'in_progress',
        message: `${targetAgentName} is processing the task`,
        agentName: targetAgentName,
        progress: 25,
        sourceExecutionId: delegationData.sourceExecutionId
      })
      emitBrowserEvent('delegation-progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'processing',
        status: 'in_progress',
        message: `${targetAgentName} is processing the task`,
        progress: 25
      })
      */

      let delegationResult: ExecutionResult

      if (isSubAgent && 'isSubAgent' in (targetAgentConfig as any)) {
        // Sub-agent execution path
        logger.debug(`📋 [SUB-AGENT] Delegating to sub-agent: ${targetAgentName}`)

        if (delegationData.sourceExecutionId) {
          const sourceExecution = this.executionRegistry.get(delegationData.sourceExecutionId)
          if (sourceExecution && (sourceExecution as any).steps) {
            ;(sourceExecution as any).steps.push({
              id: `delegation_analyzing_${Date.now()}`,
              timestamp: new Date(),
              agent: delegationData.targetAgent,
              agentName: targetAgentName,
              action: 'delegating',
              content: `${targetAgentName} analyzing context`,
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

        // ❌ REMOVED: Redundant "researching/analyzing" progress for sub-agents
        // The steps.push() above already added this info to the pipeline
        /*
        this.eventEmitter.emit('delegation.progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'researching',
          status: 'in_progress',
          message: `Sub-agente ${targetAgentName} analizando contexto`,
          agentName: targetAgentName,
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
        */

        const sub = targetAgentConfig as SubAgent
        const subAgentConfig: AgentConfig = {
          id: sub.id,
          name: sub.name,
          description: (sub as any).description,
          role: 'worker',
          model: (sub as any).model || 'gpt-4o-mini',
          temperature: typeof (sub as any).temperature === 'number' ? (sub as any).temperature : 0.7,
          maxTokens: typeof (sub as any).maxTokens === 'number' ? (sub as any).maxTokens : 4096,
          tools: Array.isArray((sub as any).subAgentConfig?.tools) ? (sub as any).subAgentConfig.tools : [],
          prompt: (sub as any).systemPrompt || `You are a specialized sub-agent named ${sub.name}.` ,
          color: '#64748B',
          icon: 'SparklesIcon',
          avatar: undefined,
          isSubAgent: true,
          parentAgentId: (sub as any).parentAgentId,
          tags: Array.isArray((sub as any).subAgentConfig?.tags) ? (sub as any).subAgentConfig.tags : undefined
        }

        await this.initializeAgentFn(subAgentConfig)

        if (delegationData.sourceExecutionId) {
          const sourceExecution = this.executionRegistry.get(delegationData.sourceExecutionId)
          if (sourceExecution && (sourceExecution as any).steps) {
            ;(sourceExecution as any).steps.push({
              id: `delegation_executing_${Date.now()}`,
              timestamp: new Date(),
              agent: delegationData.targetAgent,
              agentName: targetAgentName,
              action: 'delegating',
              content: `${targetAgentName} executing specialized tools`,
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

        // ❌ REMOVED: Redundant "synthesizing/executing" progress for sub-agents
        // The steps.push() above already shows tool execution
        /*
        this.eventEmitter.emit('delegation.progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'synthesizing',
          status: 'in_progress',
          message: `Sub-agente ejecutando herramientas especializadas`,
          agentName: targetAgentName,
          progress: 70,
          sourceExecutionId: delegationData.sourceExecutionId
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
        */

        const subAgentTimeoutConfig = this.runtime.maxExecutionMsSpecialist
        const SUBAGENT_TIMEOUT = Number.isFinite(subAgentTimeoutConfig) && subAgentTimeoutConfig > 0 ? subAgentTimeoutConfig : 0
        try {
          const subAgentPromise = this.executeAgentFn(
            subAgentConfig,
            delegationContext,
            { timeout: this.runtime.maxExecutionMsSpecialist, priority: normalizedPriority }
          )
          delegationResult = SUBAGENT_TIMEOUT
            ? await Promise.race([
                subAgentPromise,
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Sub-agent timeout: ${delegationData.targetAgent} exceeded ${Math.round(SUBAGENT_TIMEOUT / 1000)}s`)), SUBAGENT_TIMEOUT))
              ]) as ExecutionResult
            : await subAgentPromise as ExecutionResult
        } catch (subError) {
          logger.error(`❌ [DELEGATION] Sub-agent ${delegationData.targetAgent} failed:`, subError)
          const isTimeout = SUBAGENT_TIMEOUT > 0 && subError instanceof Error && subError.message.includes('timeout')
          const timeoutSeconds = SUBAGENT_TIMEOUT ? Math.round(SUBAGENT_TIMEOUT / 1000) : null
          const errorMessage = isTimeout
            ? `⏱️ El sub-agente ${delegationData.targetAgent} excedió el tiempo máximo (${timeoutSeconds}s). La tarea es demasiado compleja para este agente especializado.`
            : `❌ El sub-agente ${delegationData.targetAgent} encontró un error: ${subError instanceof Error ? subError.message : String(subError)}`
          delegationResult = {
            content: errorMessage,
            metadata: { sender: delegationData.targetAgent, error: true, timedOut: isTimeout, originalError: subError instanceof Error ? subError.message : String(subError) },
            executionTime: isTimeout && SUBAGENT_TIMEOUT ? SUBAGENT_TIMEOUT : 0,
            tokensUsed: 0,
            messages: []
          } as any
        }
      } else {
        // Main agent execution path
        if (delegationData.sourceExecutionId) {
          const sourceExecution = this.executionRegistry.get(delegationData.sourceExecutionId)
          if (sourceExecution && (sourceExecution as any).steps) {
            ;(sourceExecution as any).steps.push({
              id: `delegation_researching_${Date.now()}`,
              timestamp: new Date(),
              agent: delegationData.targetAgent,
              agentName: targetAgentName,
              action: 'delegating',
              content: `${targetAgentName} executing tools`,
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
        
        // ❌ REMOVED: Redundant "researching/executing tools" progress for main agents
        // The steps.push() above already shows this
        /*
        this.eventEmitter.emit('delegation.progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'researching',
          status: 'in_progress',
          message: `${targetAgentName} ejecutando herramientas`,
          agentName: targetAgentName,
          progress: 60,
          sourceExecutionId: delegationData.sourceExecutionId
        })
        emitBrowserEvent('delegation-progress', {
          sourceAgent: delegationData.sourceAgent,
          targetAgent: delegationData.targetAgent,
          task: delegationData.task,
          stage: 'researching',
          status: 'in_progress',
          message: `${targetAgentName} executing tools`,
          progress: 60
        })
        */

        const delegationTimeoutConfig = this.runtime.delegationTimeoutMs
        const DELEGATION_TIMEOUT = Number.isFinite(delegationTimeoutConfig) && delegationTimeoutConfig > 0 ? delegationTimeoutConfig : 0
        try {
          const delegationPromise = this.executeAgentFn(
            targetAgentConfig as AgentConfig,
            delegationContext,
            { timeout: this.runtime.maxExecutionMsSupervisor, priority: normalizedPriority }
          )
          delegationResult = DELEGATION_TIMEOUT
            ? await Promise.race([
                delegationPromise,
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Delegation timeout: ${delegationData.targetAgent} exceeded ${Math.round(DELEGATION_TIMEOUT / 1000)}s`)), DELEGATION_TIMEOUT))
              ]) as ExecutionResult
            : await delegationPromise as ExecutionResult
        } catch (delError) {
          logger.error(`❌ [DELEGATION] Agent ${delegationData.targetAgent} failed:`, delError)
          const isTimeout = DELEGATION_TIMEOUT > 0 && delError instanceof Error && delError.message.includes('timeout')
          const timeoutSeconds = DELEGATION_TIMEOUT ? Math.round(DELEGATION_TIMEOUT / 1000) : null
          const errorMessage = isTimeout
            ? `⏱️ El agente ${delegationData.targetAgent} excedió el tiempo máximo (${timeoutSeconds}s). Por favor, intenta reformular la tarea de manera más específica.`
            : `❌ El agente ${delegationData.targetAgent} encontró un error: ${delError instanceof Error ? delError.message : String(delError)}`
          delegationResult = {
            content: errorMessage,
            metadata: { sender: delegationData.targetAgent, error: true, timedOut: isTimeout, originalError: delError instanceof Error ? delError.message : String(delError) },
            executionTime: isTimeout && DELEGATION_TIMEOUT ? DELEGATION_TIMEOUT : 0,
            tokensUsed: 0,
            messages: []
          } as any
        }
      }

      logger.info(`✅ [DELEGATION] ${targetAgentName} completed delegated task`)

      // Finalizing steps
      if (delegationData.sourceExecutionId) {
        const sourceExecution = this.executionRegistry.get(delegationData.sourceExecutionId)
        if (sourceExecution && (sourceExecution as any).steps) {
          ;(sourceExecution as any).steps.push({
            id: `delegation_finalizing_${Date.now()}`,
            timestamp: new Date(),
            agent: delegationData.targetAgent,
            agentName: targetAgentName,
            action: 'delegating',
            content: `${targetAgentName} finalizing response`,
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
      
      // ❌ REMOVED: Redundant "finalizing" progress emission
      // The completion event (delegation.completed) is sufficient
      // No need for intermediate "finalizing" state
      /*
      this.eventEmitter.emit('delegation.progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'finalizing',
        status: 'completing',
        message: `${targetAgentName} finalizando respuesta`,
        agentName: targetAgentName,
        progress: 90,
        sourceExecutionId: delegationData.sourceExecutionId
      })
      emitBrowserEvent('delegation-progress', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        task: delegationData.task,
        stage: 'finalizing',
        status: 'completing',
        message: `${targetAgentName} finalizing response`,
        progress: 90
      })
      */

      if (delegationData.sourceExecutionId) {
        const sourceExecution = this.executionRegistry.get(delegationData.sourceExecutionId)
        if (sourceExecution && (sourceExecution as any).steps) {
          ;(sourceExecution as any).steps.push({
            id: `delegation_completed_${Date.now()}`,
            timestamp: new Date(),
            agent: delegationData.targetAgent,
            agentName: targetAgentName,
            action: 'delegating',
            content: `${targetAgentName} completed the task`,
            progress: 100,
            metadata: {
              sourceAgent: delegationData.sourceAgent,
              delegatedTo: delegationData.targetAgent,
              task: delegationData.task,
              status: 'completed',
              stage: 'finalizing',
              result: (delegationResult as any).content,
              executionTime: (delegationResult as any).executionTime
            }
          })
        }
      }

      this.eventEmitter.emit('delegation.completed', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        status: 'completed',
        result: (delegationResult as any).content,
        executionTime: (delegationResult as any).executionTime,
        tokensUsed: (delegationResult as any).tokensUsed,
        isSubAgentDelegation: isSubAgent,
        sourceExecutionId: delegationData.sourceExecutionId
      })
      emitBrowserEvent('delegation-completed', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        status: 'completed',
        result: (delegationResult as any).content,
        executionTime: (delegationResult as any).executionTime,
        tokensUsed: (delegationResult as any).tokensUsed,
        isSubAgentDelegation: isSubAgent,
        sourceExecutionId: delegationData.sourceExecutionId
      })

      // Update original execution with result and propagate interrupts
      if (delegationData.sourceExecutionId) {
        logger.debug('🔄 [DELEGATION] Looking for original execution:', delegationData.sourceExecutionId)
        logger.debug('🔄 [DELEGATION] Active executions keys:', Array.from(this.executionRegistry.keys()))
        const originalExecution = this.executionRegistry.get(delegationData.sourceExecutionId)
        if (originalExecution) {
          logger.debug('🔄 [DELEGATION] Found original execution, adding delegation result:', delegationData.sourceExecutionId)
          let canonicalTargetAgent = delegationData.targetAgent
          try {
            const { resolveAgentCanonicalKey } = await import('../alias-resolver')
            canonicalTargetAgent = await resolveAgentCanonicalKey(delegationData.targetAgent)
            logger.debug('🔑 [DELEGATION] Resolved canonical agent ID:', { original: delegationData.targetAgent, canonical: canonicalTargetAgent })
          } catch (err) {
            logger.warn('⚠️ [DELEGATION] Failed to resolve canonical agent ID, using original:', err)
          }

          const delegationMessage = {
            id: generateUniqueMessageId(),
            type: 'ai' as const,
            content: `✅ Task completed by ${delegationData.targetAgent}:\n\n${(delegationResult as any).content}`,
            timestamp: new Date(),
            metadata: { sender: delegationData.targetAgent, isDelegationResult: true, sourceAgent: delegationData.sourceAgent }
          }
          ;(originalExecution as any).messages.push(delegationMessage)

          const delegatedExecution = Array.from(this.executionRegistry.values()).find(
            (exec: any) => exec.agentId === delegationData.targetAgent && exec.startTime && (Date.now() - new Date(exec.startTime).getTime()) < 60000
          ) as any
          if ((delegatedExecution?.steps && delegatedExecution.steps.length > 0) || (delegatedExecution?.snapshot?.steps && delegatedExecution.snapshot.steps.length > 0)) {
            const sourceSteps = Array.isArray(delegatedExecution.steps) && delegatedExecution.steps.length > 0
              ? delegatedExecution.steps
              : (delegatedExecution.snapshot?.steps || [])
            const interruptSteps = sourceSteps.filter((step: any) => step?.action === 'interrupt' && step?.metadata?.type === 'interrupt')
            if (interruptSteps.length > 0) {
              if (!Array.isArray((originalExecution as any).steps)) (originalExecution as any).steps = []
              interruptSteps.forEach((step: any) => {
                ;(originalExecution as any).steps.push(step)
                logger.debug('🔄 [DELEGATION] Propagated interrupt step from delegation to parent:', {
                  parentExecId: delegationData.sourceExecutionId,
                  childAgentId: delegationData.targetAgent,
                  interruptAction: step.metadata?.interrupt?.action_request?.action
                })
              })
            }
          }
          ;(originalExecution as any).metrics.executionTime += (delegationResult as any).executionTime || 0
          ;(originalExecution as any).metrics.tokensUsed += (delegationResult as any).tokensUsed || 0
          // Delegation promise resolution is handled by the 'delegation.completed' event handler.
          // Avoid resolving twice to prevent noisy "No resolver found" warnings.
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
      emitBrowserEvent('delegation-failed', {
        sourceAgent: delegationData.sourceAgent,
        targetAgent: delegationData.targetAgent,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Cleanup - remove event listeners if needed
   */
  dispose(): void {
    this.eventEmitter.removeAllListeners('delegation.completed')
    this.eventEmitter.removeAllListeners('delegation.progress')
  }
}

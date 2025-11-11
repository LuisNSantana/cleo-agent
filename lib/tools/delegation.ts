import { tool } from 'ai';
import { z } from 'zod';
import { getAgentOrchestrator } from '@/lib/agents/agent-orchestrator'
import { getCurrentUserId } from '@/lib/server/request-context'
import { logger } from '@/lib/utils/logger'
import { getAgentDisplayName } from '@/lib/agents/id-canonicalization'
import { resolveAgentCanonicalKey } from '@/lib/agents/alias-resolver'
import { actionSnapshotStore, ActionLifecycle, redactInput } from '@/lib/actions/snapshot-store'
import { circuitBreaker } from '@/lib/agents/circuit-breaker'
import { executeWithRetry, RETRY_PRESETS } from '@/lib/agents/retry-policy'

// Global event controller for pipeline streaming
let globalEventController: ReadableStreamDefaultController<Uint8Array> | null = null
let globalEventEncoder: TextEncoder | null = null

// Global delegation resolvers map for direct callback pattern
// This allows orchestrator to resolve delegation promises immediately when child completes
// Format: Map<delegationKey, { resolve: (result) => void, reject: (error) => void }>
if (!(globalThis as any).__delegationResolvers) {
  (globalThis as any).__delegationResolvers = new Map()
}

// Set the event controller for pipeline streaming
export function setPipelineEventController(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder) {
  globalEventController = controller
  globalEventEncoder = encoder
}

// Clear the event controller
export function clearPipelineEventController() {
  globalEventController = null
  globalEventEncoder = null
}

// Helper to emit pipeline events (legacy + new unified action_event wrapper)
function emitPipelineEvent(event: any) {
  if (globalEventController && globalEventEncoder) {
    try {
      globalEventController.enqueue(globalEventEncoder.encode(`data: ${JSON.stringify(event)}\n\n`))
    } catch (error) {
  // Non-fatal: keep warn level
  logger.warn('Failed to emit pipeline event:', error)
    }
  }
}

// Public export for other subsystems (confirmations, calendar, etc.)
export function emitPipelineEventExternal(event: any) {
  emitPipelineEvent(event)
}

// Display names now resolved via shared helper

// ✅ TASK DESCRIPTION PATTERN (LangGraph Best Practice)
// Instead of passing full message history, supervisor formulates explicit task description
// This reduces context contamination and gives delegated agent clear instructions
const delegationSchema = z.object({
  taskDescription: z.string().describe(
    'Clear, explicit description of what the specialist agent should do. ' +
    'Include all necessary details: who, what, where, when. ' +
    'Example: "Publish the message \'Team standup at 3pm\' to the Telegram channel @team-updates"'
  ),
  context: z.string().optional().describe('Additional background context if needed'),
  priority: z
    .enum(['low', 'normal', 'high', 'medium', 'urgent'])
    .optional()
    .default('normal')
    .transform((v) => (v === 'medium' ? 'normal' : v === 'urgent' ? 'high' : v))
    .describe('Task priority level'),
  requirements: z.string().optional().describe('Specific requirements or constraints'),
  userId: z.string().optional().describe('Explicit userId for context propagation (internal use)')
});

// Individual delegation tools for each specialist agent

// ✅ Shared helper to perform blocking handoff with explicit task description
// Following LangGraph supervisor pattern: https://langchain-ai.github.io/langgraph/tutorials/multi_agent/agent_supervisor/
async function runDelegation(params: {
  agentId: string
  taskDescription: string  // ✅ Changed from 'task' to align with LangGraph pattern
  context?: string
  priority?: 'low'|'normal'|'high'|'medium'|'urgent'
  requirements?: string
  userId?: string
}) {
  // CRITICAL DEBUG: Log entry immediately
  logger.info('🎬 [DELEGATION_ENTRY]', {
    rawAgentId: params.agentId,
    taskPreview: params.taskDescription?.slice(0, 80),
    hasContext: !!params.context,
    priority: params.priority,
    userId: params.userId
  })

  const { agentId: rawAgentId, taskDescription, context, priority, requirements } = params

  const agentId = await resolveAgentCanonicalKey(rawAgentId)
  // Normalize to valid set used by orchestrator/tools
  const normPriority: 'low'|'normal'|'high' = (priority === 'medium')
    ? 'normal'
    : (priority === 'urgent')
      ? 'high'
      : (priority || 'normal')
  const orchestrator = await getAgentOrchestrator() as any
  let userId = params.userId || getCurrentUserId?.() || '00000000-0000-0000-0000-000000000000'

  // Guard: late recovery if NIL UUID
  try {
    const NIL = '00000000-0000-0000-0000-000000000000'
    if (userId === NIL) {
      const globalUser = (globalThis as any).__activeUserId || (globalThis as any).__lastAuthenticatedUserId
      if (globalUser && typeof globalUser === 'string' && /[0-9a-fA-F-]{36}/.test(globalUser)) {
        userId = globalUser
      }
    }
  } catch {}

  // PHASE 2: Circuit breaker check
  const circuitCheck = circuitBreaker.canExecute(agentId)
  if (!circuitCheck.allowed) {
    logger.warn('🔴 [CIRCUIT_BREAKER] Delegation blocked', {
      agentId,
      reason: circuitCheck.reason
    })
    
    return {
      status: 'circuit_open',
      error: circuitCheck.reason || `Agent ${agentId} is temporarily unavailable`,
      agentId,
      timestamp: new Date().toISOString()
    }
  }

  logger.info('🔁 [DELEGATION_START]', {
    delegation_entry: 'tool_invocation',
    target_agent: agentId,
    context_user_id: userId,
    priority: normPriority,
    task_preview: taskDescription.slice(0, 120)
  })

  const input = [
    `Tarea: ${taskDescription}`,
    context ? `Contexto: ${context}` : null,
    requirements ? `Requisitos: ${requirements}` : null,
  normPriority ? `Prioridad: ${normPriority}` : null,
  ].filter(Boolean).join('\n')

  // Create snapshot for this delegation action
  const snapshot = actionSnapshotStore.create('delegation', {
    meta: { userId, agentId, delegationTarget: agentId },
    input: redactInput({ taskDescription, context, priority: normPriority, requirements })
  })
  const actionId = snapshot.id
  ActionLifecycle.start(actionId)
  const startedEvent = actionSnapshotStore.get(actionId)?.events.slice(-1)[0]
  emitPipelineEvent({
    type: 'delegation-start', // legacy event for current UI
    agentId,
    agentName: getAgentDisplayName(agentId),
    task: taskDescription,  // ✅ Legacy UI expects 'task' field
    actionId,
    timestamp: new Date().toISOString()
  })
  // New unified action event
  emitPipelineEvent({
    type: 'action_event',
    actionId,
    kind: 'delegation',
    status: 'running',
    event: startedEvent
  })

  // Start execution (UI variant propagates user/thread when present)
  // NOTE: startAgentExecutionForUI in the enhanced adapter is async; ensure we await to get the exec object (id/status)
  const exec = orchestrator.startAgentExecutionForUI
    ? await orchestrator.startAgentExecutionForUI(input, agentId, undefined, userId, [], true)
    : (orchestrator.startAgentExecution ? await orchestrator.startAgentExecution(input, agentId) : undefined)

  // Try to capture execution id; if missing, attempt a quick recovery from active executions
  let execId: string | undefined = exec?.id
  if (!execId) {
    try {
      const candidates: any[] = (orchestrator.getActiveExecutions?.() || orchestrator.getAllExecutions?.() || []) as any[]
      const match = candidates
        .filter((e) => e?.agentId === agentId && (!e?.userId || !userId || e?.userId === userId))
        .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime())[0]
      if (match?.id) {
        execId = match.id
      }
    } catch {}
  }
  
  // CRITICAL FIX: Register direct resolver for this delegation
  // This allows orchestrator to resolve the delegation immediately when child completes
  // Format: parentExecId:sourceAgent:canonicalTargetAgent
  let delegationKey: string | null = null
  let directResolverPromise: Promise<any> | null = null
  let parentExecId: string | undefined = undefined
  try {
    // Prefer a direct parent execution id from orchestrator, else search active executions
    let parentExecId = orchestrator.getCurrentExecutionId?.()

  if (!parentExecId) {
      try {
        const active = orchestrator.getActiveExecutions?.() || []
        // Find the most recent supervisor execution for this user
        const candidate = (active as any[])
          .filter(e => e?.agentId === 'cleo-supervisor' && (!e?.userId || e?.userId === userId) && e?.status === 'running')
          .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime())[0]
        if (candidate?.id) parentExecId = candidate.id
      } catch (err) {
        logger.warn('⚠️ [DELEGATION] Failed to lookup parent execution id from active executions:', err)
      }
    }

    // Use canonical agent id already resolved to `agentId` above
    if (parentExecId && execId) {
      delegationKey = `${parentExecId}:cleo-supervisor:${agentId}`
      logger.info('🔑 [DELEGATION] Registering direct resolver', {
        delegationKey,
        parentExecId,
        childExecId: execId,
        agentId
      })

      directResolverPromise = new Promise((resolve, reject) => {
        const resolvers = (globalThis as any).__delegationResolvers
        if (resolvers instanceof Map) {
          resolvers.set(delegationKey, { resolve, reject })
          // Also register a fallback under the raw agent id in case canonicalization mismatches
          try {
            if (rawAgentId && rawAgentId !== agentId) {
              const fallbackKey = `${parentExecId}:cleo-supervisor:${rawAgentId}`
              resolvers.set(fallbackKey, { resolve, reject })
              logger.debug('🔁 [DELEGATION] Registered fallback resolver key for raw agent id', { fallbackKey })
            }
          } catch (err) {}

          logger.info('✅ [DELEGATION] Direct resolver registered successfully', { delegationKey })
        } else {
          logger.warn('⚠️ [DELEGATION] Resolvers map not initialized')
          resolve(null) // Fallback to polling
        }
      })
    } else {
      logger.warn('⚠️ [DELEGATION] Cannot create delegation key:', {
        hasParentExecId: !!parentExecId,
        hasChildExecId: !!execId,
        attemptedAgent: agentId
      })
    }
  } catch (err) {
    logger.warn('⚠️ [DELEGATION] Failed to register direct resolver:', err)
  }
  
  const startedAt = Date.now()
  const { getRuntimeConfig } = await import('../agents/runtime-config')
  const runtime = getRuntimeConfig()
  
  // For scheduled tasks, use longer timeout to allow complex operations
  // Based on Azure Durable Functions sub-orchestration patterns
  const { getRequestContext } = await import('../server/request-context')
  const requestContext = getRequestContext()
  const isScheduledTask = requestContext?.requestId?.startsWith('task-')
  
  // UPDATED: Use 10 minutes for scheduled tasks (allows for complex Google Workspace operations)
  // This supports hierarchical multi-agent workflows as per LangGraph best practices
  // Increased from 7 to 10 min to allow: Research + Gmail API + attachments + multiple recipients
  let timeoutMs = isScheduledTask ? 600_000 : runtime.delegationTimeoutMs
  const POLL_MS = runtime.delegationPollMs
  let lastProgressAt = startedAt

  // Emit initial processing as progress (detail only)
  ActionLifecycle.progress(actionId, 0, 'starting')
  let lastActionEvent = actionSnapshotStore.get(actionId)?.events.slice(-1)[0]
  emitPipelineEvent({
    type: 'delegation-processing', // legacy
    agentId,
    agentName: getAgentDisplayName(agentId),
    status: 'running',
    actionId,
    timestamp: new Date().toISOString()
  })
  emitPipelineEvent({
    type: 'action_event',
    actionId,
    kind: 'delegation',
    status: 'running',
    event: lastActionEvent
  })

  // Poll until completion/timeout
  let finalResult: string | null = null
  let status: string = 'running'
  let lastStatus = ''
  let lastProgress = 0
  let extendedMs = 0
  
  // CRITICAL FIX: Listen for completion events to detect when delegated agent finishes
  let eventListenerAdded = false
  let detachListener: (() => void) | null = null
  const completionPromise = new Promise<string | null>((resolve) => {
    try {
      const legacy = (globalThis as any).__cleoOrchestrator
      if (legacy && typeof legacy.onEvent === 'function' && execId) {
        console.log('🎧 [DELEGATION] Registering completion listener for execution:', execId)
        const handler = (event: any) => {
          console.log('🎧 [DELEGATION] Event received:', {
            eventType: event.type,
            eventExecutionId: event.data?.executionId,
            targetExecutionId: execId,
            matches: event.type === 'execution_completed' && event.data?.executionId === execId
          })
          
          if (event.type === 'execution_completed' && event.data?.executionId === execId) {
            console.log('✅ [DELEGATION] Completion event matched! Resolving promise...')
            // Get final result from the completed execution (may need a brief drain window)
            let result = ''
            try {
              const snapshot = orchestrator.getExecution?.(execId)
              result = String(snapshot?.result || snapshot?.messages?.slice(-1)?.[0]?.content || '')
              console.log('✅ [DELEGATION] Extracted result:', result?.slice(0, 100))
            } catch {}
            resolve(result)
          }
        }
        legacy.onEvent(handler)
        eventListenerAdded = true
        detachListener = () => {
          try { legacy.offEvent?.(handler) } catch {}
        }
        console.log('✅ [DELEGATION] Listener registered successfully')
      } else {
        console.log('⚠️ [DELEGATION] Cannot register listener:', {
          hasLegacy: !!legacy,
          hasOnEvent: typeof legacy?.onEvent === 'function',
          hasExecId: !!execId
        })
        resolve(null) // Fallback to polling only
      }
    } catch (err) {
      logger.warn('⚠️ [DELEGATION] Failed to add completion listener:', err)
      resolve(null) // Fallback to polling only
    }
  })
  
  while (Date.now() - startedAt < timeoutMs) {
    // Small delay OR wait for completion event OR direct resolver callback
    const pollPromise = new Promise(r => setTimeout(r, POLL_MS))
    
    // Race between polling delay, legacy event listener, and direct resolver callback
    const racePromises = [
      pollPromise.then(() => null),
      completionPromise
    ]
    
    if (directResolverPromise) {
      racePromises.push(directResolverPromise)
    }
    
    const eventResult = await Promise.race(racePromises)
    
    // If we got a completion event or direct callback, use that result
    if (eventResult !== null && typeof eventResult === 'object' && 'success' in eventResult) {
      // Direct resolver callback (new pattern)
      logger.info('✅ [DELEGATION] Direct resolver fired!', {
        hasResult: !!(eventResult as any).result,
        delegationKey
      })
      status = 'completed'
      finalResult = (eventResult as any).result || ''
      break
    } else if (eventResult !== null) {
      // Legacy event listener
      logger.info('✅ [DELEGATION] Legacy event listener fired')
      status = 'completed'
      let resolvedText = String(eventResult || '')
      if ((!resolvedText || resolvedText.length === 0) && execId) {
        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 120))
          try {
            const snap = orchestrator.getExecution?.(execId)
            const candidate = String(snap?.result || snap?.messages?.slice(-1)?.[0]?.content || '')
            if (candidate) { resolvedText = candidate; break }
          } catch {}
        }
      }
      finalResult = resolvedText
      break
    }

    try {
      const snapshot = execId ? orchestrator.getExecution?.(execId) : null
      status = snapshot?.status || status
      
      // CRITICAL: Check for active interrupts in delegated execution
      // If the child agent has an interrupt (e.g., waiting for tool approval),
      // we need to wait for it to be resolved before considering the execution complete
      let hasActiveInterrupt = false
      if (execId) {
        try {
          const { InterruptManager } = await import('../agents/core/interrupt-manager')
          const interruptState = await InterruptManager.getInterrupt(execId)
          hasActiveInterrupt = !!(interruptState && interruptState.status === 'pending')
          
          if (hasActiveInterrupt) {
            logger.info('⏸️ [DELEGATION] Child execution has active interrupt, waiting for user response', {
              execId,
              interruptStatus: interruptState?.status,
              agentId
            })
            // Don't count interrupt wait time against delegation timeout
            // Similar to approval wait pause in execution-manager
            lastProgressAt = Date.now() // Reset progress timer
          }
        } catch (err) {
          logger.warn('⚠️ [DELEGATION] Failed to check interrupt status:', err)
        }
      }
      
      // Emit progress events when status changes
      if (status !== lastStatus) {
        // Map orchestrator status to progress detail
        ActionLifecycle.progress(actionId, snapshot?.progress ?? lastProgress, `status:${status}`)
        lastActionEvent = actionSnapshotStore.get(actionId)?.events.slice(-1)[0]
        emitPipelineEvent({
          type: 'delegation-progress', // legacy
          agentId,
          agentName: getAgentDisplayName(agentId),
          status,
          progress: snapshot?.progress || 0,
          actionId,
          timestamp: new Date().toISOString()
        })
        emitPipelineEvent({
          type: 'action_event',
          actionId,
            kind: 'delegation',
          status: 'running',
          event: lastActionEvent
        })
        lastStatus = status
      }
      // Extend timeout based on progress threshold and recent activity, capped by max extension
      const raw = Number(snapshot?.progress ?? 0)
      const progress = Math.max(0, Math.min(100, raw))
      const delta = progress - lastProgress
      const now = Date.now()
      const tooLongWithoutProgress = now - lastProgressAt >= runtime.noProgressNoExtendMs
      if (delta > 0) {
        lastProgress = progress
        lastProgressAt = now
      }
      if (delta >= runtime.progressMinDeltaPercent && extendedMs < runtime.delegationMaxExtensionMs) {
        const add = Math.min(runtime.delegationExtendOnProgressMs, runtime.delegationMaxExtensionMs - extendedMs)
        timeoutMs += add
        extendedMs += add
      } else if (!tooLongWithoutProgress && delta > 0 && extendedMs < runtime.delegationMaxExtensionMs) {
        // Small incremental progress: extend lightly
        const add = Math.min(Math.floor(runtime.delegationExtendOnProgressMs / 2), runtime.delegationMaxExtensionMs - extendedMs)
        timeoutMs += add
        extendedMs += add
      }
      
      if (snapshot?.status === 'completed') {
        finalResult = String(snapshot?.result || snapshot?.messages?.slice(-1)?.[0]?.content || '')
        logger.info('✅ [DELEGATION_COMPLETE]', { executionId: execId, target_agent: agentId, context_user_id: userId })
        
        // PHASE 2: Record success in circuit breaker
        circuitBreaker.recordSuccess(agentId)
        
        ActionLifecycle.result(actionId, { result: finalResult }, 'delegation completed')
        lastActionEvent = actionSnapshotStore.get(actionId)?.events.slice(-1)[0]
        // Emit completion events (legacy + new)
        emitPipelineEvent({
          type: 'delegation-complete',
          agentId,
          agentName: getAgentDisplayName(agentId),
          result: finalResult,
          actionId,
          timestamp: new Date().toISOString()
        })
        emitPipelineEvent({
          type: 'action_event',
          actionId,
          kind: 'delegation',
          status: 'completed',
          event: lastActionEvent
        })
        break
      }
      if (snapshot?.status === 'failed') {
        finalResult = `Delegation failed: ${snapshot?.error || 'unknown error'}`
        logger.error('❌ [DELEGATION_FAILED]', { executionId: execId, target_agent: agentId, context_user_id: userId, error: snapshot?.error })
        
        // PHASE 2: Record failure in circuit breaker
        circuitBreaker.recordFailure(agentId, snapshot?.error)
        
        ActionLifecycle.error(actionId, { message: finalResult, code: 'DELEGATION_FAILED' })
        lastActionEvent = actionSnapshotStore.get(actionId)?.events.slice(-1)[0]
        emitPipelineEvent({
          type: 'delegation-error',
          agentId,
          agentName: getAgentDisplayName(agentId),
          error: snapshot?.error || 'unknown error',
          actionId,
          timestamp: new Date().toISOString()
        })
        emitPipelineEvent({
          type: 'action_event',
          actionId,
          kind: 'delegation',
          status: 'error',
          event: lastActionEvent
        })
        break
      }
    } catch (e) {
      // Continue polling despite transient errors
    }
  }

  // Cleanup event listener if we attached one
  try { if (eventListenerAdded && detachListener) { (detachListener as () => void)() } } catch {}

  if (status !== 'completed') {
    const elapsed = Date.now() - startedAt
    const elapsedSec = Math.floor(elapsed / 1000)
    
    // IMPROVED: Better timeout messaging with specific diagnostics
    let timeoutReason = 'unknown'
    let userMessage = `Delegation timed out after ${elapsedSec}s.`
    
    try {
      const snapshot = execId ? orchestrator.getExecution?.(execId) : null
      const hasMessages = snapshot?.messages && snapshot.messages.length > 0
      const lastMessage = hasMessages ? snapshot.messages.slice(-1)[0] : null
      
      if (!hasMessages) {
        timeoutReason = 'no_response_from_model'
        userMessage = `The ${getAgentDisplayName(agentId)} agent did not respond within ${elapsedSec}s. This usually indicates the AI model (${snapshot?.agentId || agentId}) is overloaded or unavailable. Please try again, or use a different approach.`
      } else if (lastMessage && lastMessage.constructor?.name === 'ToolMessage') {
        timeoutReason = 'tool_execution_timeout'
        const toolName = (lastMessage as any)?.name || 'unknown tool'
        userMessage = `The ${getAgentDisplayName(agentId)} agent timed out while executing "${toolName}" after ${elapsedSec}s. The tool may be slow or unresponsive.`
      } else {
        timeoutReason = 'general_timeout'
        userMessage = `The ${getAgentDisplayName(agentId)} agent exceeded the ${elapsedSec}s limit while processing your request.`
      }
    } catch (diagErr) {
      logger.warn('Failed to diagnose timeout reason:', diagErr)
    }
    
    finalResult = userMessage
    logger.warn('⏱️ [DELEGATION_TIMEOUT]', { 
      executionId: execId, 
      target_agent: agentId, 
      context_user_id: userId, 
      elapsedMs: elapsed,
      timeoutReason,
      diagnosticMessage: userMessage
    })
    
    // PHASE 2: Record timeout as failure in circuit breaker
    circuitBreaker.recordFailure(agentId, `timeout:${timeoutReason}`)
    
    ActionLifecycle.timeout(actionId)
    lastActionEvent = actionSnapshotStore.get(actionId)?.events.slice(-1)[0]
    emitPipelineEvent({
      type: 'action_event',
      actionId,
      kind: 'delegation',
      status: 'timeout',
      event: lastActionEvent
    })
  }

  // CLEANUP: Remove direct resolver if still present
  if (delegationKey) {
    try {
      const resolvers = (globalThis as any).__delegationResolvers
      if (resolvers instanceof Map) {
        if (resolvers.has(delegationKey)) {
          resolvers.delete(delegationKey)
          logger.debug('🧹 [DELEGATION] Cleaned up direct resolver:', delegationKey)
        }
        try {
          if (parentExecId && rawAgentId && rawAgentId !== agentId) {
            const fallbackKey = `${parentExecId}:cleo-supervisor:${rawAgentId}`
            if (resolvers.has(fallbackKey)) {
              resolvers.delete(fallbackKey)
              logger.debug('🧹 [DELEGATION] Cleaned up fallback resolver:', fallbackKey)
            }
          }
        } catch (err) {
          logger.warn('⚠️ [DELEGATION] Failed to clean up fallback resolver key:', err)
        }
      }
    } catch (err) {
      logger.warn('⚠️ [DELEGATION] Failed to clean up resolver:', err)
    }
  }

  // CLEANUP: Detach legacy event listener if registered
  try {
    const cleanup = detachListener as (() => void) | null
    if (cleanup && typeof cleanup === 'function') {
      cleanup()
      logger.debug('🧹 [DELEGATION] Detached legacy event listener')
    }
  } catch (err) {
    logger.warn('⚠️ [DELEGATION] Failed to detach listener:', err)
  }

  return {
    status: 'delegated',
    targetAgent: agentId,
    delegatedTask: taskDescription,
    context: context || '',
  priority: normPriority,
    requirements: requirements || '',
    handoffMessage: `Task delegated to ${agentId}: ${taskDescription}${context ? ` - Context: ${context}` : ''}`,
    nextAction: 'handoff_to_agent',
    agentId,
    result: finalResult,
    executionId: execId,
    actionId
  }
}

export const delegateToTobyTool = tool({
  description: 'Delegate software/programming and IoT tasks to Toby: coding, debugging, architecture, APIs, databases, DevOps, and embedded/IoT (ESP32, Arduino, Raspberry Pi, MQTT, BLE). Use this for any technical question or implementation request related to software systems.',
  inputSchema: delegationSchema,
  execute: async ({ taskDescription, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'toby-technical', taskDescription, context, priority, requirements, userId })
  }
});

export const delegateToAmiTool = tool({
  description: 'Delegate executive assistant, organization, productivity, research, calendar, email management, or creative tasks to Ami specialist. Ami handles: scheduling, email triage, research, organization, productivity workflows, creative projects, and general assistance tasks. Use for anything requiring coordination, planning, or general assistant work.',
  inputSchema: delegationSchema,
  execute: async ({ taskDescription, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'ami-creative', taskDescription, context, priority, requirements, userId })
  }
});

export const delegateToPeterTool = tool({
  description: 'Delegate financial analysis and business strategy tasks to Peter, your financial advisor. ONLY use for: financial modeling, business plans, budgeting, investment analysis, crypto research, accounting support, tax planning, ROI calculations. Peter has tools: createGoogleSheet, readGoogleSheet, updateGoogleSheet, appendGoogleSheet, webSearch, cryptoPrices. DO NOT delegate general document creation, email, calendar, or non-financial tasks.',
  inputSchema: delegationSchema,
  execute: async ({ taskDescription, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'peter-financial', taskDescription, context, priority, requirements, userId })
  }
});
export const delegateToEmmaTool = tool({
  description: 'Delegate e-commerce and Shopify management tasks to Emma specialist. Use for online store operations, e-commerce sales analytics, Shopify product management, inventory optimization, or business operations related to online retail.',
  inputSchema: delegationSchema,
  execute: async ({ taskDescription, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'emma-ecommerce', taskDescription, context, priority, requirements, userId })
  }
});

export const delegateToApuTool = tool({
  description: 'Delegate web research, data gathering, news monitoring, and academic search tasks to Apu specialist. Use for collecting raw data, news articles, academic papers, company information, trend data, and structured findings. For strategic analysis or business insights synthesis, use delegate_to_wex instead.',
  inputSchema: delegationSchema,
  execute: async ({ taskDescription, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'apu-support', taskDescription, context, priority, requirements, userId })
  }
});



export const delegateToWexTool = tool({
  description: 'Delegate strategic market analysis, competitive intelligence, and actionable business insights synthesis to Wex specialist. Use for strategic analysis, market insights ("insights accionables"), executive summaries, SWOT analysis, competitive positioning, business frameworks (Porter Forces, opportunity matrices), and synthesis of complex market research into actionable recommendations.',
  inputSchema: delegationSchema,
  execute: async ({ taskDescription, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'wex-intelligence', taskDescription, context, priority, requirements, userId })
  }
});

export const delegateToAstraTool = tool({
  description: 'Delegate email management, composition, and communication tasks to Astra email specialist. Use for sending emails, drafting messages, managing inbox, email automation, and correspondence handling.',
  inputSchema: delegationSchema,
  execute: async ({ taskDescription, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'astra-email', taskDescription, context, priority, requirements, userId })
  }
});

export const delegateToNotionTool = tool({
  description: 'Delegate Notion workspace management, page creation, database operations, and knowledge organization tasks to Notion specialist. Use for creating pages, managing databases, organizing content, and workspace administration.',
  inputSchema: delegationSchema,
  execute: async ({ taskDescription, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'notion-agent', taskDescription, context, priority, requirements, userId })
  }
});

export const delegateToNoraTool = tool({
  description: 'Delegate medical information & triage requests to Nora (non-diagnostic). Use for evidence-informed guidance, risk flags, structured summaries with sources; not for emergencies or prescriptions.',
  inputSchema: delegationSchema,
  execute: async ({ taskDescription, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'nora-medical', taskDescription, context, priority, requirements, userId })
  }
});

export const delegateToJennTool = tool({
  description: 'Delegate community management, social media strategy, and Twitter/X operations to Jenn. Use for content calendars, thread drafts, publishing, analytics reporting, and social engagement workflows.',
  inputSchema: delegationSchema,
  execute: async ({ taskDescription, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'jenn-community', taskDescription, context, priority, requirements, userId })
  }
});

export const delegateToIrisTool = tool({
  description: 'Delegate insight synthesis and analysis to Iris. ONLY use for: analyzing documents/PDFs/attachments, generating executive summaries, identifying trends and patterns, risk assessment with severity/probability/confidence, evidence-based recommendations. Iris excels at turning messy inputs into structured insights with traceability. Use when user provides attachments or needs deep analysis of documents.',
  inputSchema: delegationSchema,
  execute: async ({ taskDescription, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'iris-insights', taskDescription, context, priority, requirements, userId })
  }
});

// Export all delegation tools
export const delegationTools = {
  delegate_to_toby: delegateToTobyTool,
  delegate_to_ami: delegateToAmiTool,
  delegate_to_peter: delegateToPeterTool,
  delegate_to_emma: delegateToEmmaTool,
  delegate_to_apu: delegateToApuTool,
  delegate_to_wex: delegateToWexTool,
  delegate_to_astra: delegateToAstraTool,
  delegate_to_notion_agent: delegateToNotionTool,
  delegate_to_nora: delegateToNoraTool,
  delegate_to_jenn: delegateToJennTool,
  delegate_to_iris: delegateToIrisTool,

};

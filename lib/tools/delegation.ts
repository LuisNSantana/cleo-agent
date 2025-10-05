import { tool } from 'ai';
import { z } from 'zod';
import { getAgentOrchestrator } from '@/lib/agents/orchestrator-adapter-enhanced'
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

// Delegation tool schema
const delegationSchema = z.object({
  task: z.string().describe('The specific task to delegate to the specialist agent'),
  context: z.string().optional().describe('Additional context for the delegated task'),
  // Accept medium/urgent from models and normalize to valid enum to avoid provider schema failures
  priority: z
    .enum(['low', 'normal', 'high', 'medium', 'urgent'])
    .optional()
    .default('normal')
    .transform((v) => (v === 'medium' ? 'normal' : v === 'urgent' ? 'high' : v))
    .describe('Task priority level'),
  requirements: z.string().optional().describe('Specific requirements or constraints for the task'),
  userId: z.string().optional().describe('Explicit userId for context propagation (internal use)')
});

// Individual delegation tools for each specialist agent

// Shared helper to perform a blocking handoff to the orchestrator and return the final result
async function runDelegation(params: {
  agentId: string
  task: string
  context?: string
  priority?: 'low'|'normal'|'high'|'medium'|'urgent'
  requirements?: string
  userId?: string
}) {
  const { agentId: rawAgentId, task, context, priority, requirements } = params

  const agentId = await resolveAgentCanonicalKey(rawAgentId)
  // Normalize to valid set used by orchestrator/tools
  const normPriority: 'low'|'normal'|'high' = (priority === 'medium')
    ? 'normal'
    : (priority === 'urgent')
      ? 'high'
      : (priority || 'normal')
  const orchestrator = getAgentOrchestrator() as any
  let userId = params.userId || getCurrentUserId?.() || '00000000-0000-0000-0000-000000000000'

  // Guard: late recovery if NIL UUID
  try {
    const NIL = '00000000-0000-0000-0000-000000000000'
    if (userId === NIL) {
      const globalUser = (globalThis as any).__activeUserId || (globalThis as any).__lastAuthenticatedUserId
      if (globalUser && typeof globalUser === 'string' && /[0-9a-fA-F-]{36}/.test(globalUser)) {
        userId = globalUser
        logger.debug('🛠️ [DELEGATION] Recovered userId from global fallback', { userId })
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
    task_preview: task.slice(0, 120)
  })

  const input = [
    `Tarea: ${task}`,
    context ? `Contexto: ${context}` : null,
    requirements ? `Requisitos: ${requirements}` : null,
  normPriority ? `Prioridad: ${normPriority}` : null,
  ].filter(Boolean).join('\n')

  // Create snapshot for this delegation action
  const snapshot = actionSnapshotStore.create('delegation', {
    meta: { userId, agentId, delegationTarget: agentId },
    input: redactInput({ task, context, priority: normPriority, requirements })
  })
  const actionId = snapshot.id
  ActionLifecycle.start(actionId)
  const startedEvent = actionSnapshotStore.get(actionId)?.events.slice(-1)[0]
  emitPipelineEvent({
    type: 'delegation-start', // legacy event for current UI
    agentId,
    agentName: getAgentDisplayName(agentId),
    task,
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
  const exec = orchestrator.startAgentExecutionForUI?.(input, agentId, undefined, userId, [], true)
    || orchestrator.startAgentExecution?.(input, agentId)

  const execId: string | undefined = exec?.id
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
  
  logger.debug('🔁 [DELEGATION] Timeout configuration', {
    isScheduledTask,
    timeoutMs,
    timeoutMinutes: timeoutMs / 60_000,
    requestId: requestContext?.requestId
  })

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
  
  while (Date.now() - startedAt < timeoutMs) {
    // Small delay
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, POLL_MS))

    try {
      const snapshot = execId ? orchestrator.getExecution?.(execId) : null
      status = snapshot?.status || status
      
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

  if (!finalResult) {
    const elapsed = Date.now() - startedAt
    finalResult = `Delegation timed out after ${elapsed} ms. Partial results may be available in the agent center.`
    logger.warn('⏱️ [DELEGATION_TIMEOUT]', { executionId: execId, target_agent: agentId, context_user_id: userId, elapsedMs: elapsed })
    
    // PHASE 2: Record timeout as failure in circuit breaker
    circuitBreaker.recordFailure(agentId, 'timeout')
    
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

  return {
    status: 'delegated',
    targetAgent: agentId,
    delegatedTask: task,
    context: context || '',
  priority: normPriority,
    requirements: requirements || '',
    handoffMessage: `Task delegated to ${agentId}: ${task}${context ? ` - Context: ${context}` : ''}`,
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
  execute: async ({ task, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'toby-technical', task, context, priority, requirements, userId })
  }
});

export const delegateToAmiTool = tool({
  description: 'Delegate executive assistant, organization, productivity, research, calendar, email management, or creative tasks to Ami specialist. Ami handles: scheduling, email triage, research, organization, productivity workflows, creative projects, and general assistance tasks. Use for anything requiring coordination, planning, or general assistant work.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'ami-creative', task, context, priority, requirements, userId })
  }
});

export const delegateToPeterTool = tool({
  description: 'Delegate financial analysis and business strategy tasks to Peter, your financial advisor. ONLY use for: financial modeling, business plans, budgeting, investment analysis, crypto research, accounting support, tax planning, ROI calculations. Peter has tools: createGoogleSheet, readGoogleSheet, updateGoogleSheet, appendGoogleSheet, webSearch, cryptoPrices. DO NOT delegate general document creation, email, calendar, or non-financial tasks.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'peter-financial', task, context, priority, requirements, userId })
  }
});
export const delegateToEmmaTool = tool({
  description: 'Delegate e-commerce and Shopify management tasks to Emma specialist. Use for online store operations, e-commerce sales analytics, Shopify product management, inventory optimization, or business operations related to online retail.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'emma-ecommerce', task, context, priority, requirements, userId })
  }
});

export const delegateToApuTool = tool({
  description: 'Delegate web research, data gathering, news monitoring, and academic search tasks to Apu specialist. Use for collecting raw data, news articles, academic papers, company information, trend data, and structured findings. For strategic analysis or business insights synthesis, use delegate_to_wex instead.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'apu-support', task, context, priority, requirements, userId })
  }
});



export const delegateToWexTool = tool({
  description: 'Delegate strategic market analysis, competitive intelligence, and actionable business insights synthesis to Wex specialist. Use for strategic analysis, market insights ("insights accionables"), executive summaries, SWOT analysis, competitive positioning, business frameworks (Porter Forces, opportunity matrices), and synthesis of complex market research into actionable recommendations.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'wex-intelligence', task, context, priority, requirements, userId })
  }
});

export const delegateToAstraTool = tool({
  description: 'Delegate email management, composition, and communication tasks to Astra email specialist. Use for sending emails, drafting messages, managing inbox, email automation, and correspondence handling.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'astra-email', task, context, priority, requirements, userId })
  }
});

export const delegateToNotionTool = tool({
  description: 'Delegate Notion workspace management, page creation, database operations, and knowledge organization tasks to Notion specialist. Use for creating pages, managing databases, organizing content, and workspace administration.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements, userId }) => {
    return runDelegation({ agentId: 'notion-agent', task, context, priority, requirements, userId })
  }
});

export const delegateToNoraTool = tool({
  description: 'Delegate community management, social media strategy, and comprehensive social platform coordination tasks to Nora specialist. Use for social media campaigns, community engagement strategies, Twitter/X management, cross-platform content coordination, brand social presence, and social media crisis management.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'nora-community', task, context, priority, requirements })
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

};

import { tool } from 'ai';
import { z } from 'zod';
import { getAgentOrchestrator } from '@/lib/agents/orchestrator-adapter-enhanced'
import { getCurrentUserId } from '@/lib/server/request-context'
import { logger } from '@/lib/utils/logger'
import { getAgentDisplayName } from '@/lib/agents/id-canonicalization'
import { resolveAgentCanonicalKey } from '@/lib/agents/alias-resolver'
import { actionSnapshotStore, ActionLifecycle, redactInput } from '@/lib/actions/snapshot-store'

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
  requirements: z.string().optional().describe('Specific requirements or constraints for the task')
});

// Individual delegation tools for each specialist agent

// Shared helper to perform a blocking handoff to the orchestrator and return the final result
async function runDelegation(params: {
  agentId: string
  task: string
  context?: string
  priority?: 'low'|'normal'|'high'|'medium'|'urgent'
  requirements?: string
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
  let userId = getCurrentUserId?.() || '00000000-0000-0000-0000-000000000000'

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
  let timeoutMs = runtime.delegationTimeoutMs
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
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'toby-technical', task, context, priority, requirements })
  }
});

export const delegateToAmiTool = tool({
  description: 'Delegate executive assistant, organization, productivity, research, calendar, email management, or creative tasks to Ami specialist. Ami handles: scheduling, email triage, research, organization, productivity workflows, creative projects, and general assistance tasks. Use for anything requiring coordination, planning, or general assistant work.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'ami-creative', task, context, priority, requirements })
  }
});

export const delegateToPeterTool = tool({
  description: 'Delegate Google Workspace tasks to Peter specialist. ONLY use for: Google Docs creation, Google Sheets creation, Google Slides, Drive file management. Peter has tools: createGoogleDoc, createGoogleSheet, createGoogleSlides, updateGoogleDoc, updateGoogleSheet, listDriveFiles, searchDriveFiles, getDriveFileDetails. DO NOT delegate email, calendar, scheduling, research, or general organization tasks.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'peter-google', task, context, priority, requirements })
  }
});
export const delegateToEmmaTool = tool({
  description: 'Delegate e-commerce and Shopify management tasks to Emma specialist. Use for online store operations, e-commerce sales analytics, Shopify product management, inventory optimization, or business operations related to online retail.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'emma-ecommerce', task, context, priority, requirements })
  }
});

export const delegateToApuTool = tool({
  description: 'Delegate advanced web research, financial market analysis, and comprehensive information gathering tasks to Apu specialist. Use for stock market research, financial analysis, competitive intelligence, web scraping, news analysis, academic research, or real-time information gathering about markets, companies, and trends.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'apu-research', task, context, priority, requirements })
  }
});

export const delegateToApuMarketsTool = tool({
  description: 'Delegate financial market analysis, stock research, and real-time market data tasks to Apu Markets sub-agent specialist. Use for stock quotes, market trends, financial news, investment analysis, portfolio tracking, and market intelligence.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'apu-markets', task, context, priority, requirements })
  }
});

export const delegateToAstraTool = tool({
  description: 'Delegate email management, composition, and communication tasks to Astra email specialist. Use for sending emails, drafting messages, managing inbox, email automation, and correspondence handling.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'astra-email', task, context, priority, requirements })
  }
});

export const delegateToNotionTool = tool({
  description: 'Delegate Notion workspace management, page creation, database operations, and knowledge organization tasks to Notion specialist. Use for creating pages, managing databases, organizing content, and workspace administration.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'notion-agent', task, context, priority, requirements })
  }
});

// Nora sub-agent delegation tools
export const delegateToLunaTool = tool({
  description: 'Delegate content creation, copywriting, and social media content tasks to Luna specialist. Use for creating tweets, developing engaging content, hashtag research, trend adaptation, and creative social media campaigns.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'luna-content-creator', task, context, priority, requirements })
  }
});

export const delegateToZaraTool = tool({
  description: 'Delegate analytics, metrics analysis, and trend research tasks to Zara specialist. Use for social media analytics, performance reporting, trend analysis, competitive intelligence, and data-driven insights.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'zara-analytics-specialist', task, context, priority, requirements })
  }
});

export const delegateToViktorTool = tool({
  description: 'Delegate publishing, scheduling, and community management tasks to Viktor specialist. Use for posting content, optimal timing strategies, community engagement, crisis management, and publication workflow optimization.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'viktor-publishing-specialist', task, context, priority, requirements })
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
  delegate_to_apu_markets: delegateToApuMarketsTool,
  delegate_to_astra: delegateToAstraTool,
  delegate_to_notion_agent: delegateToNotionTool,
  delegate_to_nora: delegateToNoraTool,
  delegate_to_luna: delegateToLunaTool,
  delegate_to_zara: delegateToZaraTool,
  delegate_to_viktor: delegateToViktorTool
};

import { tool } from 'ai';
import { z } from 'zod';
import { getAgentOrchestrator } from '@/lib/agents/orchestrator-adapter-enhanced'
import { getCurrentUserId } from '@/lib/server/request-context'

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

// Helper to emit pipeline events
function emitPipelineEvent(event: any) {
  if (globalEventController && globalEventEncoder) {
    try {
      globalEventController.enqueue(globalEventEncoder.encode(`data: ${JSON.stringify(event)}\n\n`))
    } catch (error) {
      console.warn('Failed to emit pipeline event:', error)
    }
  }
}

// Helper to get display name for agents
function getAgentDisplayName(agentId: string): string {
  const agentNames: Record<string, string> = {
    'toby-technical': 'Toby',
    'ami-assistant': 'Ami', 
    'peter-workspace': 'Peter',
    'emma-ecommerce': 'Emma',
    'apu-research': 'Apu',
    'wex-automation': 'Wex'
  }
  return agentNames[agentId] || agentId
}

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
  const { agentId, task, context, priority, requirements } = params
  // Normalize to valid set used by orchestrator/tools
  const normPriority: 'low'|'normal'|'high' = (priority === 'medium')
    ? 'normal'
    : (priority === 'urgent')
      ? 'high'
      : (priority || 'normal')
  const orchestrator = getAgentOrchestrator() as any
  const userId = getCurrentUserId?.() || (globalThis as any).__currentUserId || '00000000-0000-0000-0000-000000000000'

  const input = [
    `Tarea: ${task}`,
    context ? `Contexto: ${context}` : null,
    requirements ? `Requisitos: ${requirements}` : null,
  normPriority ? `Prioridad: ${normPriority}` : null,
  ].filter(Boolean).join('\n')

  // Emit delegation start event
  emitPipelineEvent({
    type: 'delegation-start',
    agentId,
    agentName: getAgentDisplayName(agentId),
    task,
    timestamp: new Date().toISOString()
  })

  // Start execution (UI variant propagates user/thread when present)
  const exec = orchestrator.startAgentExecutionForUI?.(input, agentId, undefined, userId, [], true)
    || orchestrator.startAgentExecution?.(input, agentId)

  const execId: string | undefined = exec?.id
  const startedAt = Date.now()
  const TIMEOUT_MS = 120_000
  const POLL_MS = 600

  // Emit processing event
  emitPipelineEvent({
    type: 'delegation-processing',
    agentId,
    agentName: getAgentDisplayName(agentId),
    status: 'running',
    timestamp: new Date().toISOString()
  })

  // Poll until completion/timeout
  let finalResult: string | null = null
  let status: string = 'running'
  let lastStatus = ''
  
  while (Date.now() - startedAt < TIMEOUT_MS) {
    // Small delay
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, POLL_MS))

    try {
      const snapshot = execId ? orchestrator.getExecution?.(execId) : null
      status = snapshot?.status || status
      
      // Emit progress events when status changes
      if (status !== lastStatus) {
        emitPipelineEvent({
          type: 'delegation-progress',
          agentId,
          agentName: getAgentDisplayName(agentId),
          status,
          progress: snapshot?.progress || 0,
          timestamp: new Date().toISOString()
        })
        lastStatus = status
      }
      
      if (snapshot?.status === 'completed') {
        finalResult = String(snapshot?.result || snapshot?.messages?.slice(-1)?.[0]?.content || '')
        
        // Emit completion event
        emitPipelineEvent({
          type: 'delegation-complete',
          agentId,
          agentName: getAgentDisplayName(agentId),
          result: finalResult,
          timestamp: new Date().toISOString()
        })
        break
      }
      if (snapshot?.status === 'failed') {
        finalResult = `Delegation failed: ${snapshot?.error || 'unknown error'}`
        
        // Emit failure event
        emitPipelineEvent({
          type: 'delegation-error',
          agentId,
          agentName: getAgentDisplayName(agentId),
          error: snapshot?.error || 'unknown error',
          timestamp: new Date().toISOString()
        })
        break
      }
    } catch (e) {
      // Continue polling despite transient errors
    }
  }

  if (!finalResult) {
    finalResult = 'Delegation timed out. Partial results may be available in the agent center.'
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
  }
}

export const delegateToTobyTool = tool({
  description: 'Delegate technical, data analysis, or research tasks to Toby specialist. Use for programming, debugging, system architecture, data processing, or technical problem-solving.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'toby-technical', task, context, priority, requirements })
  }
});

export const delegateToAmiTool = tool({
  description: 'Delegate creative, design, or visual content tasks to Ami specialist. Use for graphic design, creative writing, UI/UX design, branding, or artistic projects.',
  inputSchema: delegationSchema,
  execute: async ({ task, context, priority, requirements }) => {
    return runDelegation({ agentId: 'ami-creative', task, context, priority, requirements })
  }
});

export const delegateToPeterTool = tool({
  description: 'Delegate Google Workspace tasks to Peter specialist. Use for Google Docs, Sheets, Drive, Calendar management, document creation, spreadsheet analysis, or productivity automation.',
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

// Export all delegation tools
export const delegationTools = {
  delegate_to_toby: delegateToTobyTool,
  delegate_to_ami: delegateToAmiTool,
  delegate_to_peter: delegateToPeterTool,
  delegate_to_emma: delegateToEmmaTool,
  delegate_to_apu: delegateToApuTool
};

/**
 * Orchestrator Compatibility Adapter
 * Provides legacy API surface (getAgentOrchestrator, registerRuntimeAgent, startAgentExecution[WithHistory])
 * while delegating to the modular core orchestrator in lib/agents/core/orchestrator.
 */

import { BaseMessage, AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { AgentOrchestrator as CoreOrchestrator, ExecutionContext, ExecutionOptions as CoreExecOptions } from '@/lib/agents/core/orchestrator'
// Lazy-init legacy orchestrator when needed for delegation/tooling parity
import { getAgentOrchestrator as getLegacyOrchestrator } from '@/lib/agents/agent-orchestrator'
import type { AgentConfig, AgentExecution } from '@/lib/agents/types'
import { ALL_PREDEFINED_AGENTS } from '@/lib/agents/predefined'
import { getRuntimeConfig } from '@/lib/agents/runtime-config'
import { getCurrentUserId } from '@/lib/server/request-context'

// Singleton core orchestrator (globalThis to survive route reloads)
let coreInstance: CoreOrchestrator | null = null
const g = globalThis as any
if (!g.__cleoRuntimeAgents) g.__cleoRuntimeAgents = new Map<string, AgentConfig>()
if (!g.__cleoExecRegistry) g.__cleoExecRegistry = [] as AgentExecution[]
if (!g.__cleoAdapterListeners) g.__cleoAdapterListeners = [] as Array<(event: any) => void>

const runtimeAgents = g.__cleoRuntimeAgents as Map<string, AgentConfig>
const execRegistry = g.__cleoExecRegistry as AgentExecution[]
const listeners = g.__cleoAdapterListeners as Array<(event: any) => void>

function getCore(): CoreOrchestrator {
  const g = globalThis as any
  if (!g.__cleoCoreOrchestrator) {
    g.__cleoCoreOrchestrator = new CoreOrchestrator({ enableMetrics: true, enableMemory: true })
  }
  coreInstance = g.__cleoCoreOrchestrator as CoreOrchestrator
  return coreInstance
}

export function getAgentOrchestrator() {
  // Minimal wrapper exposing a subset of the legacy methods used by routes
  const core = getCore()
  return {
    __id: 'core-adapter',
    // Legacy imperative execute used by agent-store
    executeAgent(input: string, agentId?: string) {
      return createAndRunExecution(input, agentId, [])
    },
    // Fire-and-forget style for compatibility; here we synthesize an AgentExecution stub
    startAgentExecution(input: string, agentId?: string) {
      return createAndRunExecution(input, agentId, [])
    },
    startAgentExecutionWithHistory(input: string, agentId: string | undefined, prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>) {
      return createAndRunExecution(input, agentId, prior)
    },
    // Dual-mode execution for UI: accept threadId & userId to propagate request context
    startAgentExecutionForUI(
      input: string,
      agentId?: string,
      threadId?: string,
      userId?: string,
      prior?: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>,
      _forceSupervised?: boolean
    ) {
      return createAndRunExecution(input, agentId, prior || [], threadId, userId)
    },
    // Execution getters for polling endpoints
    getExecution(executionId: string) {
      // Prefer legacy orchestrator (authoritative), then adapter registry, then core
      try {
        const lorch = (globalThis as any).__cleoOrchestrator
        if (lorch && typeof lorch.getExecution === 'function') {
          const e = lorch.getExecution(executionId)
          if (e) return e as AgentExecution
        }
      } catch {}
      const found = execRegistry.find(e => e.id === executionId)
      if (found) return found
      return core.getExecutionStatus(executionId) as unknown as AgentExecution | null
    },
    getAllExecutions(): AgentExecution[] {
      const list: AgentExecution[] = []
      try {
        const lorch = (globalThis as any).__cleoOrchestrator
        if (lorch && typeof lorch.getAllExecutions === 'function') {
          list.push(...lorch.getAllExecutions())
        }
      } catch {}
      // Merge with adapter registry (dedupe by id)
      const map = new Map<string, AgentExecution>()
      list.forEach(e => map.set(e.id, e))
      execRegistry.forEach(e => map.set(e.id, e))
      return Array.from(map.values())
    },
    getActiveExecutions(): AgentExecution[] {
      return this.getAllExecutions().filter((e: AgentExecution) => e.status === 'running')
    },
    // Agent runtime management (adapter-local)
    getAgentConfigs(): Map<string, AgentConfig> {
      const builtIns = [...ALL_PREDEFINED_AGENTS]
      const map = new Map<string, AgentConfig>()
      builtIns.forEach(a => map.set(a.id, a))
      Array.from(runtimeAgents.values()).forEach(a => map.set(a.id, a))
      return map
    },
    // Runtime registration passthrough if Core supports it via graphBuilder
    registerRuntimeAgent(agentConfig: AgentConfig) {
      runtimeAgents.set(agentConfig.id, agentConfig)
      return true
    },
    removeRuntimeAgent(agentId: string) {
      return runtimeAgents.delete(agentId)
    },
    getModelInfo(agentId?: string) {
      // First try to get model info from core orchestrator
      const targetId = agentId || 'cleo-supervisor'
      const { getAllAgents } = require('./config')
      const agentConfig = getAllAgents().find((a: any) => a.id === targetId)
      
      if (agentConfig) {
        let provider = 'openai'
        let modelName = 'gpt-4o-mini'
        
        // Simple model resolution (can be enhanced)
        switch (agentConfig.model) {
          case 'gpt-4o': provider = 'openai'; modelName = 'gpt-4o'; break
          case 'gpt-4o-mini': provider = 'openai'; modelName = 'gpt-4o-mini'; break
          case 'claude-3-haiku-20240307': provider = 'anthropic'; modelName = 'claude-3-haiku-20240307'; break
          default: provider = 'openai'; modelName = 'gpt-4o-mini'; break
        }
        
        return {
          agentId: targetId,
          provider,
          modelName,
          configured: agentConfig.model,
          timestamp: new Date().toISOString()
        }
      }

      // Fallback to legacy orchestrator if available
      try {
        let lorch = (globalThis as any).__cleoOrchestrator
        if (!lorch) {
          lorch = getLegacyOrchestrator()
        }
        if (lorch && typeof lorch.getModelInfo === 'function') {
          return lorch.getModelInfo(agentId)
        }
      } catch {}
      
      return null
    },
    onEvent(fn: (event: any) => void) {
      listeners.push(fn)
    },
    offEvent(fn: (event: any) => void) {
      const idx = listeners.indexOf(fn)
      if (idx >= 0) listeners.splice(idx, 1)
    },
    cleanup() {
      listeners.splice(0, listeners.length)
    }
  }
}

// Convenience wrapper to keep legacy named export working
export function registerRuntimeAgent(agentConfig: AgentConfig) {
  const orch = getAgentOrchestrator() as any
  if (typeof orch.registerRuntimeAgent === 'function') {
    return orch.registerRuntimeAgent(agentConfig)
  }
  return true
}

function toBaseMessages(prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>): BaseMessage[] {
  return (prior || []).map(m => {
    switch (m.role) {
      case 'user': return new HumanMessage(m.content)
      case 'assistant': return new AIMessage(m.content)
      case 'system': return new SystemMessage(m.content)
      case 'tool': return new ToolMessage({ content: m.content, tool_call_id: m.metadata?.tool_call_id || 'tool' })
      default: return new HumanMessage(String(m.content || ''))
    }
  })
}

function createAndRunExecution(
  input: string,
  agentId: string | undefined,
  prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>,
  threadId?: string,
  userId?: string
): AgentExecution {
  const core = getCore()
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  
  // Create execution stub for immediate response
  // Determine a safe userId for execution context
  const NIL_UUID = '00000000-0000-0000-0000-000000000000'
  const ctxUser = getCurrentUserId()
  const effectiveUserId = userId || ctxUser || NIL_UUID

  const exec: AgentExecution = {
    id: executionId,
    agentId: agentId || 'cleo-supervisor',
    threadId: threadId || 'default',
    userId: effectiveUserId,
    status: 'running',
    startTime: new Date(),
    messages: [],
    metrics: { totalTokens: 0, inputTokens: 0, outputTokens: 0, executionTime: 0, executionTimeMs: 0, tokensUsed: 0, toolCallsCount: 0, handoffsCount: 0, errorCount: 0, retryCount: 0, cost: 0 },
    steps: []
  }

  // Use core orchestrator for execution with full agent delegation
  const ctx: ExecutionContext = { 
    threadId: exec.threadId, 
    userId: exec.userId, 
    agentId: exec.agentId, 
    messageHistory: [...toBaseMessages(prior || []), new HumanMessage(input)], 
    metadata: { source: 'adapter', executionId } 
  }
  
  // Get target agent config for core execution
  const targetAgentList: AgentConfig[] = [...ALL_PREDEFINED_AGENTS]
  const targetAgent = targetAgentList.find((a: AgentConfig) => a.id === (agentId || 'cleo-supervisor')) || targetAgentList.find((a: AgentConfig) => a.id === 'cleo-supervisor')!
  
  console.log(`[Adapter] Starting core execution for agent: ${targetAgent.name} (${targetAgent.id})`)
  
  // Execute with core orchestrator (includes delegation logic, tools, etc.)
  const runtime = getRuntimeConfig()
  const execTimeout = targetAgent.role === 'supervisor' ? runtime.maxExecutionMsSupervisor : runtime.maxExecutionMsSpecialist
  core.executeAgent(targetAgent, ctx, { timeout: execTimeout }).then(res => {
    exec.status = 'completed'
    exec.endTime = new Date()
    exec.result = (res && (res as any).content) || ''
    exec.messages = exec.messages || []
    
    // DEBUG: Check who actually processed the message
    console.log(`🔍 [DEBUG] Final message metadata:`, {
      originalAgentId: exec.agentId,
      targetAgentId: targetAgent.id,
      resultSender: (res && (res as any).metadata?.sender),
      finalSender: (res && (res as any).metadata?.sender) || targetAgent.id,
      messageContent: String(exec.result || '').substring(0, 100),
      fullResult: res,
      resultType: typeof res,
      resultKeys: res ? Object.keys(res) : [],
      metadataKeys: res && (res as any).metadata ? Object.keys((res as any).metadata) : []
    })
    
    exec.messages.push({ 
      id: `${exec.id}_final`, 
      type: 'ai', 
      content: String(exec.result || ''), 
      timestamp: new Date(),
      metadata: { 
        sender: (res && (res as any).metadata?.sender) || targetAgent.id, 
        source: 'core',
        originalAgentId: exec.agentId,
        targetAgentId: targetAgent.id
      }
    })
    listeners.forEach(fn => fn({ type: 'execution_completed', agentId: exec.agentId, timestamp: new Date(), data: { executionId: exec.id } }))
  console.log(`[Adapter] Core execution completed for ${targetAgent.id}: ${String(exec.result || '').substring(0, 100)}`)
  }).catch(err => {
    console.error(`[Adapter] Core execution failed for ${targetAgent.id}:`, err)
    // Fallback to legacy orchestrator for critical scenarios
    const legacyOrch = (globalThis as any).__cleoOrchestrator
    if (legacyOrch) {
      console.log('[Adapter] Falling back to legacy orchestrator')
      if (typeof legacyOrch.startAgentExecutionWithHistory === 'function') {
        const legacyExec = legacyOrch.startAgentExecutionWithHistory(input, agentId, prior)
        Object.assign(exec, legacyExec)
        return
      }
    }
    
    exec.status = 'failed'
    exec.endTime = new Date()
    exec.error = err instanceof Error ? err.message : String(err)
    listeners.forEach(fn => fn({ type: 'error', agentId: exec.agentId, timestamp: new Date(), data: { executionId: exec.id, error: exec.error } }))
  })
  
  execRegistry.push(exec)
  return exec
}

export function recreateAgentOrchestrator() {
  const g = globalThis as any
  if (g.__cleoCoreOrchestrator) {
    try { g.__cleoCoreOrchestrator.shutdown?.() } catch {}
    delete g.__cleoCoreOrchestrator
  }
  coreInstance = null
  return getAgentOrchestrator()
}

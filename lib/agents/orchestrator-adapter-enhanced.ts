/**
 * Enhanced Orchestrator Adapter
 * Integrates modular core components with legacy functionality for full delegation support
 */

import { BaseMessage, AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import type { AgentConfig, AgentExecution } from '@/lib/agents/types'
import { ALL_PREDEFINED_AGENTS } from '@/lib/agents/predefined'
import { getCurrentUserId } from '@/lib/server/request-context'

// Import legacy orchestrator as backup for complex delegation logic
import { getAgentOrchestrator as getLegacyOrchestrator } from '@/lib/agents/agent-orchestrator'

// Simple core components for optimized execution
class CoreModelFactory {
  resolveModelInfo(agentConfig: AgentConfig) {
    const provider = agentConfig.model.includes('gpt-') ? 'openai' : 
                   agentConfig.model.includes('claude-') ? 'anthropic' : 'openai'
    const modelName = agentConfig.model === 'gpt-4o-mini' ? 'gpt-4o-mini' : 
                     agentConfig.model === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini'
    return { provider, modelName, configured: agentConfig.model }
  }
}

class CoreEventEmitter {
  private listeners: Array<(event: any) => void> = []
  
  emit(type: string, data: any) {
    this.listeners.forEach(fn => fn({ type, data, timestamp: new Date() }))
  }
  
  on(fn: (event: any) => void) {
    this.listeners.push(fn)
  }
  
  off(fn: (event: any) => void) {
    const idx = this.listeners.indexOf(fn)
    if (idx >= 0) this.listeners.splice(idx, 1)
  }
}

// Core orchestrator with delegation support
class EnhancedCoreOrchestrator {
  private modelFactory = new CoreModelFactory()
  private eventEmitter = new CoreEventEmitter()
  private agentConfigs = new Map<string, AgentConfig>()
  
  constructor() {
    // Load built-in agents
    ;[...ALL_PREDEFINED_AGENTS].forEach((agent: AgentConfig) => this.agentConfigs.set(agent.id, agent))
  }
  
  getModelInfo(agentId?: string) {
    const targetId = agentId && this.agentConfigs.has(agentId) ? agentId : 'cleo-supervisor'
    const config = this.agentConfigs.get(targetId)
    if (!config) return null
    
    const info = this.modelFactory.resolveModelInfo(config)
    return { agentId: targetId, ...info, timestamp: new Date().toISOString() }
  }
  
  registerAgent(agentConfig: AgentConfig) {
    this.agentConfigs.set(agentConfig.id, agentConfig)
  }
  
  getAgentConfigs() {
    return this.agentConfigs
  }
  
  onEvent(fn: (event: any) => void) {
    this.eventEmitter.on(fn)
  }
  
  offEvent(fn: (event: any) => void) {
    this.eventEmitter.off(fn)
  }
}

// Global state
const g = globalThis as any
if (!g.__cleoRuntimeAgents) g.__cleoRuntimeAgents = new Map<string, AgentConfig>()
if (!g.__cleoExecRegistry) g.__cleoExecRegistry = [] as AgentExecution[]
if (!g.__cleoAdapterListeners) g.__cleoAdapterListeners = [] as Array<(event: any) => void>
if (!g.__cleoCoreOrchestrator) g.__cleoCoreOrchestrator = new EnhancedCoreOrchestrator()

const runtimeAgents = g.__cleoRuntimeAgents as Map<string, AgentConfig>
const execRegistry = g.__cleoExecRegistry as AgentExecution[]
const listeners = g.__cleoAdapterListeners as Array<(event: any) => void>
const coreOrchestrator = g.__cleoCoreOrchestrator as EnhancedCoreOrchestrator

export function getAgentOrchestrator() {
  return {
    __id: 'enhanced-core-adapter',
    // Execution methods - delegate to legacy for complex delegation logic
    executeAgent(input: string, agentId?: string) {
      return createAndRunExecution(input, agentId, [])
    },
    startAgentExecution(input: string, agentId?: string) {
      return createAndRunExecution(input, agentId, [])
    },
    startAgentExecutionWithHistory(input: string, agentId: string | undefined, prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>) {
      return createAndRunExecution(input, agentId, prior)
    },

    // Dual-mode execution for UI with enhanced context
    startAgentExecutionForUI(
      input: string, 
      agentId?: string, 
      _threadId?: string, 
      _userId?: string, 
      prior?: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>,
      _forceSupervised?: boolean
    ) {
      // If userId is explicitly provided, use it in a new request context
      if (_userId) {
        return createAndRunExecutionWithContext(input, agentId, prior || [], _userId)
      }
      // Fallback to existing context
      return createAndRunExecution(input, agentId, prior || [])
    },
    // Execution getters - combine legacy and core
    getExecution(executionId: string) {
      console.log('🔍 [ENHANCED ADAPTER] getExecution called:', {
        executionId,
        registrySize: execRegistry.length,
        registryIds: execRegistry.map(e => e.id),
        globalOrchestratorExists: !!(globalThis as any).__cleoOrchestrator
      })
      
      // Try legacy orchestrator first (where delegation executions are stored)
      try {
        const legacyOrch = (globalThis as any).__cleoOrchestrator
        if (legacyOrch && typeof legacyOrch.getExecution === 'function') {
          const e = legacyOrch.getExecution(executionId)
          
          console.log('🔍 [ENHANCED ADAPTER] Legacy result:', {
            executionId,
            legacyExecutionExists: !!e,
            hasSteps: !!(e && e.steps && e.steps.length > 0),
            legacyStatus: e?.status,
            hasMessages: !!(e && e.messages && e.messages.length > 0)
          })
          
          if (e) {
            return e as AgentExecution
          }
        }
      } catch (err) {
        console.error('Error getting execution from legacy:', err)
      }
      
      // Fallback to adapter registry
      return execRegistry.find(e => e.id === executionId) || null
    },
    getAllExecutions(): AgentExecution[] {
      const list: AgentExecution[] = []
      // Get from legacy orchestrator
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
    // Agent management - use core for simplicity
    getAgentConfigs(): Map<string, AgentConfig> {
      const map = new Map<string, AgentConfig>()
      coreOrchestrator.getAgentConfigs().forEach((config, id) => map.set(id, config))
      runtimeAgents.forEach((config, id) => map.set(id, config))
      return map
    },
    registerRuntimeAgent(agentConfig: AgentConfig) {
      coreOrchestrator.registerAgent(agentConfig)
      runtimeAgents.set(agentConfig.id, agentConfig)
      return true
    },
    removeRuntimeAgent(agentId: string) {
      return runtimeAgents.delete(agentId)
    },
    // Model info - use enhanced core
    getModelInfo(agentId?: string) {
      return coreOrchestrator.getModelInfo(agentId)
    },
    // Events - use core
    onEvent(fn: (event: any) => void) {
      coreOrchestrator.onEvent(fn)
      listeners.push(fn)
    },
    offEvent(fn: (event: any) => void) {
      coreOrchestrator.offEvent(fn)
      const idx = listeners.indexOf(fn)
      if (idx >= 0) listeners.splice(idx, 1)
    },
    cleanup() {
      listeners.splice(0, listeners.length)
    }
  }
}

// Convenience wrapper
export function registerRuntimeAgent(agentConfig: AgentConfig) {
  const orch = getAgentOrchestrator() as any
  return orch.registerRuntimeAgent(agentConfig)
}

function toBaseMessages(prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>): BaseMessage[] {
  // Avoid injecting stale ToolMessages which must follow same-turn tool_calls; convert to system breadcrumbs
  return (prior || []).flatMap(m => {
    switch (m.role) {
      case 'user': return [new HumanMessage(m.content)]
      case 'assistant': return [new AIMessage(m.content)]
      case 'system': return [new SystemMessage(m.content)]
      case 'tool': {
        const note = `[tool:${m?.metadata?.name || m?.metadata?.tool_name || 'unknown'}] ${String(m.content).slice(0, 400)}`
        return [new SystemMessage(note)]
      }
      default: return [new HumanMessage(String(m.content || ''))]
    }
  })
}

function createAndRunExecutionWithContext(
  input: string, 
  agentId: string | undefined, 
  prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>,
  userId: string
): AgentExecution {
  // Import request context utilities
  const { withRequestContext } = require('@/lib/server/request-context')
  
  // Run execution within the specified user context
  return withRequestContext({ userId, requestId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }, () => {
    return createAndRunExecution(input, agentId, prior)
  })
}

function createAndRunExecution(input: string, agentId: string | undefined, prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>): AgentExecution {
  // Filter ToolMessages to prevent LangChain errors before delegating
  const filteredPrior = prior ? (prior || []).filter(m => m.role !== 'tool').concat(
    (prior || []).filter(m => m.role === 'tool').map(m => ({
      role: 'system' as const,
      content: `[tool:${m?.metadata?.name || m?.metadata?.tool_name || 'unknown'}] ${String(m.content).slice(0, 400)}`,
      metadata: m.metadata
    }))
  ) : []
  
  // For full delegation functionality, use legacy orchestrator
  let legacyOrch = (globalThis as any).__cleoOrchestrator
  if (!legacyOrch) {
    try {
      legacyOrch = getLegacyOrchestrator()
      console.log('[Enhanced Adapter] Initialized legacy orchestrator for delegation')
    } catch (e) {
      console.warn('[Enhanced Adapter] Failed to initialize legacy orchestrator, using basic core:', e)
    }
  }
  
  if (legacyOrch) {
    let exec: AgentExecution | null = null
    if (typeof legacyOrch.startAgentExecutionWithHistory === 'function') {
      exec = legacyOrch.startAgentExecutionWithHistory(input, agentId, filteredPrior)
    } else if (typeof legacyOrch.startAgentExecution === 'function') {
      exec = legacyOrch.startAgentExecution(input, agentId)
    }
    if (exec) {
      // Ensure steps array exists and push initial synthetic step for UI polling consistency
      try {
        exec.steps = exec.steps || []
        exec.steps.push({
          id: `step_${Date.now()}_start`,
          timestamp: new Date(),
          agent: exec.agentId,
          action: 'routing',
          content: `Execution started (enhanced adapter) for ${exec.agentId}`,
          progress: 0,
          metadata: {
            started: true,
            delegation_entry: prior?.some(m => /delegate_to_/i.test(m.content)) ? 'delegation_chain' : 'direct',
            context_user_id: exec.userId,
            execution_mode: 'enhanced-adapter',
            adapter: 'enhanced'
          }
        })
      } catch {}
      const attachOptions = (target: AgentExecution, attempt: number) => {
        if (!target.options) target.options = {}
        const opt = target.options as any // extend dynamically
        const envDefault = parseInt(process.env.AGENT_DEFAULT_TIMEOUT_MS || '', 10)
        const fromEnv = !isNaN(envDefault) ? envDefault : undefined
        const agentCfg = (coreOrchestrator.getAgentConfigs().get(target.agentId)) as any
        const agentTimeout = agentCfg?.options?.timeouts?.default || agentCfg?.timeouts?.default
        const longRunningToolsPatterns = [/calendar/i, /schedule/i, /meeting/i, /event/i]
        const possibleTools: string[] = Array.isArray(agentCfg?.tools) ? agentCfg.tools : []
        const hasLongRunningTool = possibleTools.some(t => longRunningToolsPatterns.some(r => r.test(t)))
        const bucket = hasLongRunningTool ? 90000 : 60000
        let resolved = opt.timeoutMs || agentTimeout || fromEnv || bucket
        const MAX_CAP = 300000
        if (resolved > MAX_CAP) resolved = MAX_CAP
        if (resolved < 10000) resolved = 10000
        opt.timeoutMs = resolved
        opt.__enhancedAttempt = attempt
      }

      const ensureRegistry = (target: AgentExecution) => {
        if (!execRegistry.find(e => e.id === target.id)) execRegistry.push(target)
      }

      const scheduleGuards = (target: AgentExecution) => {
  attachOptions(target, ((target.options as any)?.__enhancedAttempt as number) || 1)
        ensureRegistry(target)
  const timeoutMs = (target.options as any)!.timeoutMs as number
        const startTs = Date.now()
        ;(target as any).originalStartTime = (target as any).originalStartTime || target.startTime
        let warned = false
        let activityCount = 0
        let lastActivityTs = Date.now()
        const recordActivity = () => { lastActivityTs = Date.now(); activityCount++ }

        // Hook to detect external mutations (poll every 5s)
        const pollInterval = setInterval(() => {
          if (target.status !== 'running') {
            clearInterval(pollInterval)
            clearTimeout(timeoutHandle)
            return
          }
          // Detect new messages or steps growth as activity
          if ((target.messages && target.messages.length > activityCount) || (target.steps && target.steps.length > 0)) {
            recordActivity()
            try {
              listeners.forEach(fn => fn({ type: 'execution_activity', agentId: target.agentId, timestamp: new Date(), data: { executionId: target.id, messages: target.messages.length, steps: target.steps?.length || 0 } }))
            } catch {}
          }
          const elapsed = Date.now() - startTs
          // Update metrics
          try {
            target.metrics.executionTimeMs = elapsed
            target.metrics.executionTime = Math.round(elapsed / 1000)
          } catch {}
          // Warning at 80%
            if (!warned && elapsed >= timeoutMs * 0.8) {
              warned = true
              target.messages.push({ id: `${target.id}_timeout_warn`, type: 'system', content: `Aviso: la ejecución se aproxima al límite de tiempo (${Math.round(timeoutMs/1000)}s).`, timestamp: new Date() })
              listeners.forEach(fn => fn({ type: 'execution_timeout_warning', agentId: target.agentId, timestamp: new Date(), data: { executionId: target.id, timeoutMs } }))
            }
          // Idle progress event cada 15s sin actividad
          if (Date.now() - lastActivityTs >= 15000) {
            listeners.forEach(fn => fn({ type: 'execution_progress', agentId: target.agentId, timestamp: new Date(), data: { executionId: target.id, idle: true, elapsedMs: elapsed } }))
            lastActivityTs = Date.now()
          }
        }, 5000)

        const timeoutHandle = setTimeout(() => {
          if (target.status === 'running') {
            // Timeout
            const attempt = ((target.options as any)?.__enhancedAttempt as number) || 1
            if (!target.messages) target.messages = []
            target.status = 'failed'
            target.endTime = new Date()
            target.error = 'timeout'
            target.result = 'Execution timed out (legacy orchestrator no respondió a tiempo)'
            target.messages.push({ id: `${target.id}_timeout_final`, type: 'system', content: String(target.result), timestamp: new Date() })
            listeners.forEach(fn => fn({ type: 'execution_failed', agentId: target.agentId, timestamp: new Date(), data: { executionId: target.id, error: 'timeout', attempt } }))
            clearInterval(pollInterval)

            // Reintento automático si attempt == 1 y no hubo pasos ni mensajes AI
            const hasAIMessage = (target.messages || []).some(m => m.type === 'ai')
            const hasSteps = Array.isArray(target.steps) && target.steps.length > 0
            if (attempt === 1 && !hasAIMessage && !hasSteps) {
              const retryExec = restartExecution(target, 2)
              listeners.forEach(fn => fn({ type: 'execution_retry', agentId: retryExec.agentId, timestamp: new Date(), data: { executionId: retryExec.id, previousExecutionId: target.id, attempt: 2 } }))
            }
          }
        }, timeoutMs)
      }

      const restartExecution = (prev: AgentExecution, attempt: number): AgentExecution => {
        // Lanzar un nuevo intento usando legacy orchestrator de nuevo
        let newExec: AgentExecution | null = null
        try {
          if (typeof legacyOrch.startAgentExecutionWithHistory === 'function') {
            // Pasamos histórico filtrado (prev.input puede existir)
            newExec = legacyOrch.startAgentExecutionWithHistory(prev.input || input, agentId, filteredPrior)
          } else if (typeof legacyOrch.startAgentExecution === 'function') {
            newExec = legacyOrch.startAgentExecution(prev.input || input, agentId)
          }
        } catch (e) {
          prev.messages.push({ id: `${prev.id}_retry_failed_immediate`, type: 'system', content: 'Reintento falló al iniciar: ' + (e as Error).message, timestamp: new Date() })
          return prev
        }
        if (!newExec) return prev
        newExec.metrics = newExec.metrics || prev.metrics
        newExec.metrics.retryCount = (prev.metrics.retryCount || 0) + 1
        newExec.messages = newExec.messages || []
        newExec.messages.push({ id: `${newExec.id}_retry_notice`, type: 'system', content: 'Retrying execution after timeout (attempt ' + attempt + '/2)', timestamp: new Date() })
  attachOptions(newExec, attempt)
        ensureRegistry(newExec)
        scheduleGuards(newExec)
        return newExec
      }

      // Inicialización del primer intento
      exec.input = input
      exec.metrics = exec.metrics || { totalTokens: 0, inputTokens: 0, outputTokens: 0, executionTime: 0, executionTimeMs: 0, tokensUsed: 0, toolCallsCount: 0, handoffsCount: 0, errorCount: 0, retryCount: 0, cost: 0 }
      attachOptions(exec, 1)
      scheduleGuards(exec)
      return exec
    }
  }
  
  // Fallback: simple core execution (without delegation)
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const NIL_UUID = '00000000-0000-0000-0000-000000000000'
  const ctxUser = getCurrentUserId()
  const effectiveUserId = ctxUser || NIL_UUID
  const exec: AgentExecution = {
    id: executionId,
    agentId: agentId || 'cleo-supervisor',
  threadId: 'default',
    userId: effectiveUserId,
    status: 'running',
    startTime: new Date(),
    messages: [],
    metrics: { totalTokens: 0, inputTokens: 0, outputTokens: 0, executionTime: 0, executionTimeMs: 0, tokensUsed: 0, toolCallsCount: 0, handoffsCount: 0, errorCount: 0, retryCount: 0, cost: 0 },
    steps: []
  }
  try {
    exec.steps!.push({
      id: `step_${Date.now()}_start`,
      timestamp: new Date(),
      agent: exec.agentId,
      action: 'routing',
      content: `Execution started (fallback core) for ${exec.agentId}`,
      progress: 0,
      metadata: {
        started: true,
        delegation_entry: prior?.some(m => /delegate_to_/i.test(m.content)) ? 'delegation_chain' : 'direct',
        context_user_id: exec.userId,
        execution_mode: 'enhanced-adapter-fallback'
      }
    })
  } catch {}
  
  // Simple core execution (no delegation, direct response)
  setTimeout(() => {
  exec.status = 'completed'
  exec.endTime = new Date()
  exec.result = 'Core orchestrator response (basic mode - no delegation)'
  exec.messages.push({ id: `${exec.id}_final`, type: 'ai', content: String(exec.result || ''), timestamp: new Date() })
    listeners.forEach(fn => fn({ type: 'execution_completed', agentId: exec.agentId, timestamp: new Date(), data: { executionId: exec.id } }))
  }, 1000)
  
  execRegistry.push(exec)
  return exec
}

export function recreateAgentOrchestrator() {
  // Reset core components
  const g = globalThis as any
  if (g.__cleoCoreOrchestrator) {
    delete g.__cleoCoreOrchestrator
  }
  g.__cleoCoreOrchestrator = new EnhancedCoreOrchestrator()
  
  // Also try to reset legacy if needed
  if (g.__cleoOrchestrator) {
    try { 
      if (typeof g.__cleoOrchestrator.cleanup === 'function') {
        g.__cleoOrchestrator.cleanup()
      }
      delete g.__cleoOrchestrator 
    } catch {}
  }
  
  return getAgentOrchestrator()
}

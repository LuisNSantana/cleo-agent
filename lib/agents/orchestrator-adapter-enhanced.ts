/**
 * Enhanced Orchestrator Adapter
 * Integrates modular core components with legacy functionality for full delegation support
 */

import { BaseMessage, AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import type { AgentConfig, AgentExecution } from '@/lib/agents/types'
import { ALL_PREDEFINED_AGENTS } from '@/lib/agents/predefined'
import { getCurrentUserId } from '@/lib/server/request-context'

// Import legacy orchestrator as backup for complex delegation logic
// IMPORTANT: Avoid early static import side-effects if bundler tree-shakes; we'll dynamic-load safely
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

// Track whether we've successfully subscribed to legacy events
if (!(g as any).__enhancedAdapterLegacySubscribed) {
  (g as any).__enhancedAdapterLegacySubscribed = false
}

function ensureLegacySubscription() {
  const gAny = globalThis as any
  if (gAny.__enhancedAdapterLegacySubscribed) return
  try {
    const legacy = gAny.__cleoOrchestrator
    if (legacy && typeof legacy.onEvent === 'function') {
      legacy.onEvent((event: any) => {
        if (event.type === 'execution_completed' && event.data?.executionId) {
          const execId = event.data.executionId
          let exec = execRegistry.find(e => e.id === execId)
          if (exec) {
            exec.status = 'completed'
            exec.endTime = new Date()
            console.log('🔍 [ENHANCED ADAPTER] Synced completion from legacy (late):', execId)
          }
        }
      })
      gAny.__enhancedAdapterLegacySubscribed = true
      console.log('🔍 [ENHANCED ADAPTER] Subscribed to legacy orchestrator events (late)')
    }
  } catch (err) {
    console.warn('⚠️ [ENHANCED ADAPTER] ensureLegacySubscription failed:', err)
  }
}

export function getAgentOrchestrator() {
  const orchestrator = {
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
    async startAgentExecutionForUI(
      input: string, 
      agentId?: string, 
      _threadId?: string, 
      _userId?: string, 
      prior?: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>,
      _forceSupervised?: boolean
    ) {
      // If starting Cleo, refresh with dynamic configuration
      if (agentId === 'cleo-supervisor' || agentId === 'cleo') {
        try {
          const { getCleoDynamicConfig } = await import('./predefined/cleo-dynamic')
          const dynamicCleo = await getCleoDynamicConfig(_userId)
          
          // Re-register Cleo with updated configuration
          this.registerRuntimeAgent(dynamicCleo)
          console.log('✅ [ENHANCED ADAPTER] Cleo updated with dynamic config:', {
            toolCount: dynamicCleo.tools.length,
            userId: _userId
          })
        } catch (error) {
          console.warn('⚠️ [ENHANCED ADAPTER] Failed to update Cleo with dynamic config, using static:', error)
        }
      }
      
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
      
      // Helper to shallow-merge executions from legacy + core to surface delegation steps/messages consistently
      const mergeExecutions = (legacyExec: any | null, coreExec: any | null): any | null => {
        if (!legacyExec && !coreExec) return null
        if (legacyExec && !coreExec) return legacyExec
        if (!legacyExec && coreExec) return coreExec
        // Both exist: prefer completed status/endTime from core; merge steps/messages de-duped by id
        const merged: any = { ...legacyExec }
        if (coreExec?.status === 'completed' && merged.status !== 'completed') {
          merged.status = 'completed'
          merged.endTime = coreExec.endTime || new Date()
        }
        // Merge messages
        try {
          const lMsgs = Array.isArray(legacyExec.messages) ? legacyExec.messages : []
          const cMsgs = Array.isArray(coreExec.messages) ? coreExec.messages : []
          const byId = new Map<string, any>()
          ;[...lMsgs, ...cMsgs].forEach((m: any, idx: number) => {
            const id = String(m?.id ?? `m_${idx}`)
            if (!byId.has(id)) byId.set(id, m)
          })
          merged.messages = Array.from(byId.values())
        } catch {}
        // Merge steps (surface 'delegating' steps from core)
        try {
          const lSteps = Array.isArray(legacyExec.steps) ? legacyExec.steps : []
          const cSteps = Array.isArray(coreExec.steps) ? coreExec.steps : []
          const byId = new Map<string, any>()
          ;[...lSteps, ...cSteps].forEach((s: any, idx: number) => {
            const id = String(s?.id ?? `s_${idx}`)
            if (!byId.has(id)) byId.set(id, s)
          })
          merged.steps = Array.from(byId.values()).sort((a: any, b: any) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime())
        } catch {}
        return merged
      }

      // Try legacy orchestrator first (where many executions are stored)
      try {
        const legacyOrch = (globalThis as any).__cleoOrchestrator
        if (legacyOrch && typeof legacyOrch.getExecution === 'function') {
          const e = legacyOrch.getExecution(executionId)
          // Also query core status for merge
          let coreExec: any = null
          try {
            coreExec = legacyOrch?.core?.getExecutionStatus?.(executionId) || null
          } catch {}

          console.log('🔍 [ENHANCED ADAPTER] Legacy result:', {
            executionId,
            legacyExecutionExists: !!e,
            hasSteps: !!(e && e.steps && e.steps.length > 0),
            legacyStatus: e?.status,
            hasMessages: !!(e && e.messages && e.messages.length > 0),
            coreExecExists: !!coreExec,
            coreStatus: coreExec?.status
          })
          
          if (e || coreExec) {
            return mergeExecutions(e as AgentExecution, coreExec as AgentExecution) as AgentExecution
          }
        }
      } catch (err) {
        console.error('Error getting execution from legacy:', err)
      }
      
      // Fallback to adapter registry (no merge available)
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
    },
    handleExecutionCompletion(execution: any) {
      console.log('🔍 [ENHANCED ADAPTER] Received execution completion from core:', execution.id)
      
      // Find the execution in our registry and mark it completed
      let exec = execRegistry.find((e: any) => e.id === execution.id)
      
      if (!exec) {
        console.log('🔍 [ENHANCED ADAPTER] Execution not found in registry, creating new entry:', execution.id)
        // Create a new execution entry for delegated executions that weren't tracked
        const newExec: AgentExecution = {
          id: execution.id,
          agentId: execution.agentId || 'unknown',
          threadId: execution.threadId || 'unknown',
          userId: execution.userId || 'unknown', 
          status: 'completed' as const,
          startTime: execution.startTime || new Date(),
          endTime: execution.endTime || new Date(),
          messages: execution.messages || [],
          steps: execution.steps || [],
          metrics: execution.metrics || { totalTokens: 0, inputTokens: 0, outputTokens: 0, executionTime: 0, executionTimeMs: 0, tokensUsed: 0, toolCallsCount: 0, handoffsCount: 0, errorCount: 0, retryCount: 0, cost: 0 }
        }
        execRegistry.push(newExec)
        exec = newExec
      } else {
        exec.status = 'completed'
        exec.endTime = execution.endTime || new Date()
      }
      
      // Ensure final message is included
      if (execution.messages && execution.messages.length > 0) {
        const lastMessage = execution.messages[execution.messages.length - 1]
        if (lastMessage.type === 'ai' && lastMessage.content && exec) {
          // Check if we already have this message
          const existingMessage = exec.messages.find((m: any) => m.id === lastMessage.id)
          if (!existingMessage) {
            exec.messages.push(lastMessage)
            console.log('🔍 [ENHANCED ADAPTER] Added final AI message to execution')
          }
        }
      }
      
      // Notify listeners of completion
      if (exec) {
        try {
          listeners.forEach(fn => fn({ 
            type: 'execution_completed', 
            agentId: exec!.agentId, 
            timestamp: new Date(), 
            data: { executionId: exec!.id } 
          }))
          console.log('🔍 [ENHANCED ADAPTER] Listeners notified of completion for:', exec.id)
        } catch (error) {
          console.error('🔍 [ENHANCED ADAPTER] Error notifying listeners:', error)
        }
      }
    }
  }

  // CRITICAL: Subscribe to legacy orchestrator execution events to stay in sync
  // This is essential for marking executions as completed when legacy orchestrator finishes
  try {
    const legacy = (globalThis as any).__cleoOrchestrator
    if (legacy && typeof legacy.onEvent === 'function') {
      legacy.onEvent((event: any) => {
        if (event.type === 'execution_completed' && event.data?.executionId) {
          // Sync completion to enhanced adapter registry
          const execId = event.data.executionId
          let exec = execRegistry.find(e => e.id === execId)
          if (exec) {
            exec.status = 'completed'
            exec.endTime = new Date()
            console.log('🔍 [ENHANCED ADAPTER] Synced completion from legacy:', execId)
          }
        }
      })
      console.log('🔍 [ENHANCED ADAPTER] Successfully subscribed to legacy orchestrator events')
    } else {
      console.warn('⚠️ [ENHANCED ADAPTER] Legacy orchestrator not available for event subscription')
    }
  } catch (err) {
    console.warn('⚠️ [ENHANCED ADAPTER] Failed to subscribe to legacy events:', err)
  }

  return orchestrator
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
  // Persist a global fallback for userId in case async boundaries lose context
  try {
    const g = globalThis as any
    g.__cleoLastUserId = userId
  } catch {}
  
  // Run execution within the specified user context
  return withRequestContext({
    userId,
    model: agentId || 'agent:unknown',
    requestId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, () => {
    return createAndRunExecution(input, agentId, prior)
  })
}

function createAndRunExecution(input: string, agentId: string | undefined, prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>): AgentExecution {
  const attemptLegacy = (): any => {
    // Priority 1: existing global (already initialized)
    let legacy = (globalThis as any).__cleoOrchestrator
    if (legacy) return legacy
    try {
      // Direct call ensures initialization (getAgentOrchestrator sets global)
      legacy = getLegacyOrchestrator()
      console.log('🔍 [ENHANCED ADAPTER] Legacy orchestrator initialized via direct call', {
        hasStartWithHistory: typeof legacy.startAgentExecutionWithHistory,
        keys: Object.keys(legacy || {})
      })
      return legacy
    } catch (err) {
      console.error('❌ [ENHANCED ADAPTER] Direct legacy initialization failed', err)
    }
    return null
  }

  try {
    console.log('🔍 [ENHANCED ADAPTER] Delegation entrypoint invoked')
    let legacy = attemptLegacy()
    // Attempt to subscribe after lazy init
    ensureLegacySubscription()

    // Background non-blocking quick retries (upgrade path) if method missing
    if (!legacy || typeof legacy.startAgentExecutionWithHistory !== 'function') {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const late = attemptLegacy()
          if (late && typeof late.startAgentExecutionWithHistory === 'function' && !legacy) {
            console.log('🔍 [ENHANCED ADAPTER] Late legacy orchestrator availability detected (upgrade will not retro-run current exec)')
            legacy = late
            ensureLegacySubscription()
          }
        }, 50 * (i + 1))
      }
    }

    if (legacy) {
      // Prefer UI variant to propagate user/thread context to legacy orchestrator
      const currentUserId = (() => {
        try { return getCurrentUserId() } catch { return undefined }
      })()
      // Compute effective user id with global fallback to survive async boundaries
      const gAny = globalThis as any
      const effectiveUserId = currentUserId || gAny.__cleoLastUserId
      if (effectiveUserId && (!gAny.__cleoLastUserId || gAny.__cleoLastUserId !== effectiveUserId)) {
        try { gAny.__cleoLastUserId = effectiveUserId } catch {}
      }

      if (typeof legacy.startAgentExecutionForUI === 'function') {
        try {
          const { withRequestContext } = require('@/lib/server/request-context')
          console.log('🔍 [ENHANCED ADAPTER] startAgentExecutionForUI OK', { priorLen: prior?.length || 0, agentId, userId: effectiveUserId })
          return withRequestContext({
            userId: effectiveUserId,
            model: agentId || 'cleo-supervisor',
            requestId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }, () => legacy.startAgentExecutionForUI(input, agentId, 'default', effectiveUserId, prior || [])) as AgentExecution
        } catch (ctxErr) {
          console.warn('⚠️ [ENHANCED ADAPTER] Failed to wrap startAgentExecutionForUI with context, attempting direct call', ctxErr)
          return legacy.startAgentExecutionForUI(input, agentId, 'default', effectiveUserId, prior || []) as AgentExecution
        }
      }

      // Fallback: use WithHistory if ForUI is not available
      if (typeof legacy.startAgentExecutionWithHistory === 'function') {
        console.log('🔍 [ENHANCED ADAPTER] startAgentExecutionWithHistory OK (fallback path)', { priorLen: prior?.length || 0, agentId, userId: effectiveUserId })
        // Ensure a request context for tools even in fallback path
        try {
          const { withRequestContext } = require('@/lib/server/request-context')
          const exec = withRequestContext({
            userId: effectiveUserId,
            model: agentId || 'cleo-supervisor',
            requestId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }, () => legacy.startAgentExecutionWithHistory(input, agentId, prior || [])) as AgentExecution
          
          if (exec && Array.isArray(exec.steps) && exec.steps.length === 0) {
            try {
              exec.steps.push({
                id: `step_${Date.now()}_bootstrap`,
                timestamp: new Date(),
                agent: exec.agentId,
                action: 'routing',
                content: `Execution bootstrap (enhanced unified) for ${exec.agentId}`,
                progress: 0,
                metadata: { unified_entrypoint: true, adapter: 'enhanced', context_user_id: exec.userId || effectiveUserId }
              })
            } catch (e) {
              console.warn('⚠️ [ENHANCED ADAPTER] Failed to add bootstrap step', e)
            }
          }
          return exec
        } catch (wrapErr) {
          console.warn('⚠️ [ENHANCED ADAPTER] Failed to wrap WithHistory with context, calling directly', wrapErr)
          const exec = legacy.startAgentExecutionWithHistory(input, agentId, prior || []) as AgentExecution
          
          if (exec && Array.isArray(exec.steps) && exec.steps.length === 0) {
            try {
              exec.steps.push({
                id: `step_${Date.now()}_bootstrap`,
                timestamp: new Date(),
                agent: exec.agentId,
                action: 'routing',
                content: `Execution bootstrap (enhanced unified) for ${exec.agentId}`,
                progress: 0,
                metadata: { unified_entrypoint: true, adapter: 'enhanced', context_user_id: exec.userId || effectiveUserId }
              })
            } catch (e) {
              console.warn('⚠️ [ENHANCED ADAPTER] Failed to add bootstrap step (direct)', e)
            }
          }
          return exec
        }
      }
    }
    console.error('❌ [ENHANCED ADAPTER] Legacy orchestrator missing startAgentExecutionWithHistory after retries')
  } catch (e) {
    console.error('❌ [ENHANCED ADAPTER] Exception in orchestrator delegation', e)
    try {
       
      const { emitExecutionEvent } = require('@/lib/agents/logging-events')
      emitExecutionEvent({
        trace_id: `fallback_${Date.now()}`,
        execution_id: `fallback_${Date.now()}`,
        agent_id: agentId || 'cleo-supervisor',
        event: 'adapter.fallback',
        level: 'warn',
        state: 'running',
        data: { error: e instanceof Error ? e.message : String(e), path: 'enhanced_adapter_createAndRunExecution' }
      })
    } catch {}
  }

  // Controlled fallback
  const exec: AgentExecution = {
    id: `exec_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    agentId: agentId || 'cleo-supervisor',
    threadId: 'default',
    userId: getCurrentUserId() || '00000000-0000-0000-0000-000000000000',
    status: 'running',
    startTime: new Date(),
    messages: [],
    steps: [ { id: `step_${Date.now()}_bootstrap`, timestamp: new Date(), agent: agentId || 'cleo-supervisor', action: 'routing', content: 'Enhanced fallback unified execution started', progress: 0, metadata: { unified_entrypoint: true, fallback: true } } ],
    metrics: { totalTokens: 0, inputTokens: 0, outputTokens: 0, executionTime: 0, executionTimeMs: 0, tokensUsed: 0, toolCallsCount: 0, handoffsCount: 0, errorCount: 0, retryCount: 0, cost: 0 }
  }
  execRegistry.push(exec)
  setTimeout(() => {
    exec.status = 'completed'
    exec.endTime = new Date()
    exec.result = 'Enhanced unified fallback response'
    exec.messages.push({ id: `${exec.id}_final`, type: 'ai', content: String(exec.result), timestamp: new Date() })
  }, 150)
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

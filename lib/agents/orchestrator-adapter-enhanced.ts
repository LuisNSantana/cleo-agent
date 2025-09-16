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
      // Use the same execution logic; thread/user are read from request-context
      return createAndRunExecution(input, agentId, prior || [])
    },
    // Execution getters - combine legacy and core
    getExecution(executionId: string) {
      // Try core orchestrator first (where delegation steps are stored)
      try {
        const legacyOrch = (globalThis as any).__cleoOrchestrator
        const coreInstance = legacyOrch?.core // Access core directly
        
        if (coreInstance && typeof coreInstance.getExecutionStatus === 'function') {
          const e = coreInstance.getExecutionStatus(executionId)
          
          // If found in core AND has steps, return it
          if (e && e.steps && e.steps.length > 0) {
            return e as AgentExecution
          }
          // If found in core but no steps, merge with legacy for messages
          if (e) {
            try {
              const legacyE = legacyOrch.getExecution(executionId)
              console.log('🟡 [ENHANCED ADAPTER] Merging core with legacy:', {
                executionId,
                coreHasSteps: !!(e.steps && e.steps.length > 0),
                legacyExists: !!legacyE,
                legacyMessagesCount: legacyE?.messages?.length || 0,
                legacyStatus: legacyE?.status,
                coreStatus: e.status
              })
              
              if (legacyE && legacyE.messages) {
                const merged = {
                  ...e,
                  messages: legacyE.messages,
                  status: legacyE.status || e.status
                } as AgentExecution
                
                console.log('🟡 [ENHANCED ADAPTER] Returning merged execution:', {
                  executionId,
                  finalMessagesCount: merged.messages?.length || 0,
                  finalStatus: merged.status
                })
                
                return merged
              }
            } catch (mergeError) {
              console.error('🟡 [ENHANCED ADAPTER] Merge failed:', mergeError)
            }
            return e as AgentExecution
          }
        }
      } catch (err) {
        console.error('Error getting execution from core:', err)
      }
      
      // Try legacy as fallback
      try {
        const lorch = (globalThis as any).__cleoOrchestrator
        if (lorch && typeof lorch.getExecution === 'function') {
          const e = lorch.getExecution(executionId)
          if (e) return e as AgentExecution
        }
      } catch {}
      
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
    if (typeof legacyOrch.startAgentExecutionWithHistory === 'function') {
      const exec = legacyOrch.startAgentExecutionWithHistory(input, agentId, filteredPrior)
      execRegistry.push(exec)
      return exec
    }
    if (typeof legacyOrch.startAgentExecution === 'function') {
      const exec = legacyOrch.startAgentExecution(input, agentId)
      execRegistry.push(exec)
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

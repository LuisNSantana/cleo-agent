/**
 * Client Agent Store
 * Zustand store for client-side agent management without LangGraph dependencies
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import {
  AgentConfig,
  AgentExecution,
  AgentNode,
  AgentEdge,
  SystemMetrics,
  AgentActivity
} from './types'
import { getAllAgents } from './config'

interface ClientAgentStore {
  // State
  agents: AgentConfig[]
  executions: AgentExecution[]
  currentExecution: AgentExecution | null
  selectedAgent: AgentConfig | null
  nodes: AgentNode[]
  edges: AgentEdge[]
  metrics: SystemMetrics
  isLoading: boolean
  error: string | null
  delegationEvents: Array<{
    from: string
    to: string
    reason: string
    query: string
    timestamp: string
  }>

  // Actions
  initializeAgents: () => Promise<void>
  syncAgents: () => Promise<void>
  executeAgent: (input: string, agentId?: string, forceSupervised?: boolean) => Promise<void>
  // Thread mapping per agent to keep conversation context across confirms
  _agentThreadMap?: Record<string, string>
  // Map execution id -> thread id used for that run (to persist final message reliably)
  _executionThreadMap?: Record<string, string>
  // Track which executions have already posted their final assistant message
  _finalPosted?: Record<string, boolean>
  selectAgent: (agent: AgentConfig | null) => void
  updateGraphData: () => void
  clearError: () => void
  setLoading: (loading: boolean) => void
  addExecution: (execution: AgentExecution) => void
  updateMetrics: (metrics: Partial<SystemMetrics>) => void
  pollExecutionStatus: (executionId: string) => Promise<void>
  persistFinalAssistantMessage: (execution: AgentExecution) => Promise<void>
  addAgent: (agent: AgentConfig) => void
  addDelegationEvent: (event: any) => void
  resetGraph: () => void
  // Graph layout persistence
  setNodePosition: (nodeId: string, position: { x: number; y: number }) => void
  setNodePositions: (positions: Record<string, { x: number; y: number }>) => void
  resetGraphLayout: () => void
}

export const useClientAgentStore = create<ClientAgentStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    agents: [],
    executions: [],
    currentExecution: null,
    selectedAgent: null,
    nodes: [],
    edges: [],
    metrics: {
      totalExecutions: 0,
      errorRate: 0,
      averageResponseTime: 0,
      activeAgents: 0,
      memoryUsage: 0,
      activeConnections: 0
    },
    isLoading: false,
    error: null,
    delegationEvents: [],
  _agentThreadMap: {},
    _executionThreadMap: {},
  _finalPosted: {},

    // Actions
    initializeAgents: async () => {
      // Start with built-ins, then merge with server runtime agents
      const builtIns = getAllAgents()
      set({ agents: builtIns })
      try {
        await get().syncAgents()
      } catch (e) {
        // keep built-ins if sync fails
        get().updateGraphData()
      }
    },

    syncAgents: async () => {
      // Skip sync on server-side rendering to avoid URL parse errors
      if (typeof window === 'undefined') {
        console.log('Skipping agent sync on server-side')
        get().updateGraphData()
        return
      }

      try {
        const res = await fetch('/api/agents/sync', { method: 'GET', credentials: 'same-origin' })
        if (!res.ok) throw new Error('Failed to fetch agents from server')
        const data = await res.json()
        const builtIns = getAllAgents()
        const runtime = (data.agents || []).filter((a: AgentConfig) => /^custom_\d+$/.test(a.id))
        const merged: AgentConfig[] = [...builtIns, ...runtime]
        set({ agents: merged })
        get().updateGraphData()
      } catch (err) {
        console.warn('Agent sync failed, showing built-ins only:', err)
        get().updateGraphData()
      }
    },

  executeAgent: async (input: string, agentId?: string, forceSupervised?: boolean) => {
      set({ isLoading: true, error: null })

      try {
        // Helper: read CSRF token from cookie if present
        const getCsrfToken = () => {
          if (typeof document === 'undefined') return undefined
          const m = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)
          return m ? decodeURIComponent(m[1]) : undefined
        }

        // Abort if the network is stuck
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

  // Use composite key so direct/supervised conversations don't mix
  const map = get()._agentThreadMap || {}
  const key = agentId ? `${agentId}_${forceSupervised ? 'supervised' : 'direct'}` : undefined
  const threadId = key ? map[key] : undefined
        // Call API with dual-mode support
        const response = await fetch('/api/agents/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(getCsrfToken() ? { 'x-csrf-token': getCsrfToken()! } : {})
          },
          credentials: 'same-origin',
          body: JSON.stringify({ 
            input, 
            agentId, 
            threadId, 
            forceSupervised: forceSupervised || false 
          }),
          signal: controller.signal
        })
        clearTimeout(timeout)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Execution failed')
        }

        set((state) => ({
          executions: [...state.executions, data.execution],
          currentExecution: data.execution,
          isLoading: false
        }))

        // Persist thread mapping per agent for subsequent messages
        if (data.thread?.id && agentId) {
          // Persist mapping under composite key
          const newMap = { ...(get()._agentThreadMap || {}) }
          const composite = `${agentId}_${forceSupervised ? 'supervised' : 'direct'}`
          newMap[composite] = data.thread.id
          // Track execution -> thread mapping for final message persistence
          const execMap = { ...(get()._executionThreadMap || {}) }
          execMap[data.execution.id] = data.thread.id
          set({ _agentThreadMap: newMap, _executionThreadMap: execMap })
        }

        // Start polling for execution updates if it's running
        if (data.execution.status === 'running') {
          get().pollExecutionStatus(data.execution.id)
        } else if (data.execution.status === 'completed') {
          // Persist assistant final message immediately when already completed
          try { await get().persistFinalAssistantMessage(data.execution) } catch (e) { console.warn('Persist final message failed:', e) }
        }

        get().updateMetrics({
          totalExecutions: get().executions.length,
          activeAgents: get().agents.filter(a => a.role === 'supervisor' || a.role === 'specialist').length
        })

      } catch (error) {
        console.error('Error executing agent:', error)
        const message = (error instanceof DOMException && error.name === 'AbortError')
          ? 'Request timed out'
          : (error instanceof TypeError && /Failed to fetch/i.test(error.message))
            ? 'Network error: Failed to fetch'
            : (error instanceof Error ? error.message : 'Unknown error occurred')
        set({ 
          error: message,
          isLoading: false 
        })
      }
    },

    selectAgent: (agent) => {
      set({ selectedAgent: agent })
    },

    updateGraphData: () => {
      const { agents, executions } = get()
      // Read persisted positions from localStorage
      let persisted: Record<string, { x: number; y: number }> = {}
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem('cleo:agent-graph:positions')
          if (raw) persisted = JSON.parse(raw)
        } catch (_) {
          // ignore
        }
      }
      
      // Create nodes from agents
      const nodes: AgentNode[] = agents.map((agent, index) => {
        const sortedForAgent = executions
          .filter(e => e.agentId === agent.id)
          .sort((a, b) => new Date(b.startTime as any).getTime() - new Date(a.startTime as any).getTime())
        const last = sortedForAgent[0]
        const lastExecDate = last ? new Date(last.startTime as any) : undefined

        // Default grid position
        const defaultPos = {
          x: (index % 2) * 300 + 100,
          y: Math.floor(index / 2) * 200 + 100
        }

        // Use persisted position if available, else keep existing store position, else default
        const existing = get().nodes.find(n => n.id === agent.id)?.position
        const persistedPos = persisted[agent.id]
        const position = persistedPos || existing || defaultPos

        return {
          id: agent.id,
          type: 'agent',
          position,
          data: {
            label: agent.name,
            agent,
            status: 'pending',
            executionCount: sortedForAgent.length,
            lastExecution: lastExecDate as any,
            connections: [] as string[]
          }
        }
      })

      // Create edges from handoffs (simplified for client)
      const edges: AgentEdge[] = []
      
      // Add static connections based on agent roles
      const cleoAgent = agents.find(a => a.role === 'supervisor')
      const specialists = agents.filter(a => a.role === 'specialist')
      
      if (cleoAgent) {
        specialists.forEach(specialist => {
          edges.push({
            id: `${cleoAgent.id}-${specialist.id}`,
            source: cleoAgent.id,
            target: specialist.id,
            type: 'delegation',
            animated: false,
            label: 'delegate'
          })
        })
      }

      // Update connections in nodes
      nodes.forEach(node => {
        node.data.connections = edges
          .filter(edge => edge.source === node.id || edge.target === node.id)
          .map(edge => edge.source === node.id ? edge.target : edge.source)
      })

      set({ nodes, edges })
    },

    clearError: () => {
      set({ error: null })
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading })
    },

    addExecution: (execution: AgentExecution) => {
      set((state) => ({
        executions: [...state.executions, execution],
        currentExecution: execution
      }))
    },

    updateMetrics: (newMetrics: Partial<SystemMetrics>) => {
      set((state) => ({
        metrics: { ...state.metrics, ...newMetrics }
      }))
    },

    pollExecutionStatus: async (executionId: string) => {
      let pollCount = 0
      const maxPolls = 60 // Increase to 60 seconds of polling for longer tasks
      
      const pollInterval = setInterval(async () => {
        pollCount++
        
        try {
          const response = await fetch(`/api/agents/execution/${executionId}`, { credentials: 'same-origin' })
          if (response.ok) {
            const data = await response.json()
            if (data.execution) {
              console.log(`📊 Polling execution ${executionId} [${pollCount}/${maxPolls}]:`, {
                status: data.execution.status,
                messageCount: data.execution.messages?.length || 0,
                stepCount: data.execution.steps?.length || 0,
                currentStep: data.execution.currentStep,
                lastMessageType: data.execution.messages?.[data.execution.messages?.length - 1]?.type,
                lastMessageContent: data.execution.messages?.[data.execution.messages?.length - 1]?.content?.slice(0, 100)
              })
              
              set((state) => ({
                executions: state.executions.map(e => 
                  e.id === executionId ? data.execution : e
                ),
                currentExecution: data.execution.status === 'running' ? data.execution : 
                                 (data.execution.status === 'completed' ? data.execution : null)
              }))

              // Stop polling if execution is complete or failed
              if (data.execution.status !== 'running') {
                clearInterval(pollInterval)
                console.log(`✅ Polling stopped for ${executionId}: ${data.execution.status}`)

                // On completion, persist assistant final message to the thread
                if (data.execution.status === 'completed') {
                  try {
                    await get().persistFinalAssistantMessage(data.execution)
                  } catch (e) {
                    console.warn('Persist final message failed:', e)
                  }
                }
              }
            }
          } else {
            console.warn(`⚠️ Polling failed for ${executionId}: ${response.status}`)
          }
        } catch (error) {
          console.error('Error polling execution status:', error)
          clearInterval(pollInterval)
        }
        
        // Auto-stop after max polls to prevent infinite polling
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval)
          console.log(`⏰ Polling timeout for ${executionId} after ${maxPolls} attempts`)
        }
      }, 1000) // Poll every second
    }

    ,

    // Persist the assistant's final AI message into the current agent thread
    persistFinalAssistantMessage: async (execution) => {
      const posted = get()._finalPosted || {}
      if (posted[execution.id]) return
      // Prefer exact execution -> thread mapping
      const execMap = get()._executionThreadMap || {}
      let threadId = execMap[execution.id]
      // Fallback to composite map if missing (best-effort)
      if (!threadId && execution.agentId) {
        const m = get()._agentThreadMap || {}
        threadId = m[`${execution.agentId}_supervised`] || m[`${execution.agentId}_direct`]
      }
      if (!threadId) return

      // Find the last AI message
      const aiMessages = (execution.messages || []).filter(m => m.type === 'ai')
      const last = aiMessages[aiMessages.length - 1]
      if (!last || !last.content) {
        // Mark as posted to avoid repeated attempts
        set({ _finalPosted: { ...posted, [execution.id]: true } })
        return
      }
      console.log('🔍 [CLIENT-STORE DEBUG] Persisting final message:', {
        executionId: execution.id,
        executionAgentId: execution.agentId,
        lastMessageType: last.type,
        lastMessageMetadata: last.metadata,
        finalSender: last.metadata?.sender || execution.agentId
      })

      try {
        const res = await fetch('/api/agents/threads/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // pass csrf token when available (future-proof if API adds CSRF)
            ...(typeof document !== 'undefined' && document.cookie.match(/(?:^|; )csrf_token=/)
              ? { 'x-csrf-token': (document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1] || '') }
              : {})
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            threadId,
            role: 'assistant',
            content: last.content,
            toolCalls: last.toolCalls || null,
            metadata: { sender: last.metadata?.sender || execution.agentId, executionId: execution.id }
          })
        })
        if (!res.ok) {
          const msg = await res.text().catch(() => '')
          console.warn('Failed to append assistant message:', res.status, msg)
        }
      } catch (e) {
        console.warn('Error posting assistant message:', e)
      } finally {
        set({ _finalPosted: { ...posted, [execution.id]: true } })
      }
    },

    addAgent: (agent: AgentConfig) => {
      set((state) => ({ agents: [...state.agents, agent] }))
      // Rebuild graph and metrics after adding
      get().updateGraphData()
      get().updateMetrics({
        totalExecutions: get().executions.length,
        activeAgents: get().agents.filter(a => a.role === 'supervisor' || a.role === 'specialist').length
      })
    },

    addDelegationEvent: (event: any) => {
      set((state) => ({
        delegationEvents: [...state.delegationEvents.slice(-9), event] // Keep last 10 events
      }))
    },

    // Reset graph visual state: clear current execution and local history so nodes return to idle
    resetGraph: () => {
      set({ currentExecution: null, executions: [] })
      get().updateGraphData()
    },

    // Persist a single node position and update store state
    setNodePosition: (nodeId, position) => {
      set((state) => {
        const nextNodes = state.nodes.map(n => n.id === nodeId ? { ...n, position } : n)
        // Write to localStorage
        if (typeof window !== 'undefined') {
          try {
            const raw = window.localStorage.getItem('cleo:agent-graph:positions')
            const map = raw ? JSON.parse(raw) : {}
            map[nodeId] = position
            window.localStorage.setItem('cleo:agent-graph:positions', JSON.stringify(map))
          } catch (_) { /* ignore */ }
        }
        return { nodes: nextNodes }
      })
    },

    // Bulk set positions (used for potential future features)
    setNodePositions: (positions) => {
      set((state) => {
        const nextNodes = state.nodes.map(n => positions[n.id] ? { ...n, position: positions[n.id] } : n)
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem('cleo:agent-graph:positions', JSON.stringify(positions))
          } catch (_) { /* ignore */ }
        }
        return { nodes: nextNodes }
      })
    },

    // Reset graph layout positions: clear persistence and re-grid nodes
    resetGraphLayout: () => {
      if (typeof window !== 'undefined') {
        try { window.localStorage.removeItem('cleo:agent-graph:positions') } catch (_) { /* ignore */ }
      }
      const { agents } = get()
      set(() => {
        const nodes: AgentNode[] = agents.map((agent, index) => ({
          id: agent.id,
          type: 'agent',
          position: {
            x: (index % 2) * 300 + 100,
            y: Math.floor(index / 2) * 200 + 100
          },
          data: {
            label: agent.name,
            agent,
            status: 'pending',
            executionCount: 0,
            lastExecution: undefined as any,
            connections: []
          }
        }))
        return { nodes }
      })
    }
  }))
)

// Initialize agents on store creation (client-only to avoid server fetch of relative URLs)
if (typeof window !== 'undefined') {
  useClientAgentStore.getState().initializeAgents()
}

// Listen for delegation events from the orchestrator
if (typeof window !== 'undefined') {
  window.addEventListener('agent-delegation', (event: any) => {
    console.log('🎯 UI received delegation event:', event.detail)
    useClientAgentStore.getState().addDelegationEvent(event.detail)
  })
}

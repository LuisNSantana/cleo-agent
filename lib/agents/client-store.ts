/**
 * Client Agent Store
 * Zustand   // Actions
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
  addAgent: (agent: AgentConfig) => void
  updateAgent: (id: string, updates: Partial<AgentConfig>) => void
  deleteAgent: (id: string) => voidnt-side agent management without LangGraph dependencies
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import {
  AgentConfig,
  AgentExecution,
  AgentNode,
  AgentEdge,
  SystemMetrics,
  AgentActivity,
  DelegationProgress,
  DelegationTimelineEvent,
  DelegationStatus,
  DelegationStage
} from './types'
import { getAgentMetadata } from './agent-metadata'
import { getAllAgents } from './unified-config'

interface ClientAgentStore {
  // State
  agents: AgentConfig[]
  parentCandidates: Array<{ id: string; name: string; isDefault?: boolean }>
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
  // Delegation Progress State
  activeDelegations: Record<string, DelegationProgress>
  currentDelegationId: string | null
  // Thread mapping per agent to keep conversation context across confirms
  _agentThreadMap?: Record<string, string>
  // Map execution id -> thread id used for that run (to persist final message reliably)
  _executionThreadMap?: Record<string, string>
  // Track which executions have already posted their final assistant message
  _finalPosted?: Record<string, boolean>
  // Force re-render trigger
  _lastUpdate?: number

  // Actions
  initializeAgents: () => Promise<void>
  syncAgents: () => Promise<void>
  refreshCleoDelegation: () => Promise<void>
  executeAgent: (input: string, agentId?: string, forceSupervised?: boolean) => Promise<void>
  selectAgent: (agent: AgentConfig | null) => void
  updateGraphData: () => void
  clearError: () => void
  setLoading: (loading: boolean) => void
  addExecution: (execution: AgentExecution) => void
  updateMetrics: (metrics: Partial<SystemMetrics>) => void
  pollExecutionStatus: (executionId: string) => Promise<void>
  // Fallback: finalize an execution from its thread if polling fails/timeouts
  finalizeExecutionFromThread: (executionId: string) => Promise<void>
  persistFinalAssistantMessage: (execution: AgentExecution) => Promise<void>
  addAgent: (agent: AgentConfig) => void
  updateAgent: (id: string, updates: Partial<AgentConfig>) => void
  deleteAgent: (id: string) => void
  addDelegationEvent: (event: any) => void
  resetGraph: () => void
  // Delegation Progress Actions
  startDelegation: (delegation: Omit<DelegationProgress, 'id' | 'timeline' | 'lastUpdate' | 'progress'>) => string
  updateDelegationStatus: (delegationId: string, status: DelegationStatus, stage?: DelegationStage) => void
  addDelegationTimelineEvent: (delegationId: string, event: Omit<DelegationTimelineEvent, 'id' | 'timestamp'>) => void
  completeDelegation: (delegationId: string, success: boolean) => void
  clearActiveDelegations: () => void
  processDelegationSteps: (steps: any[]) => void
  // Graph layout persistence
  setNodePosition: (nodeId: string, position: { x: number; y: number }) => void
  setNodePositions: (positions: Record<string, { x: number; y: number }>) => void
  resetGraphLayout: () => void
}

export const useClientAgentStore = create<ClientAgentStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    agents: [],
  parentCandidates: [],
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
    activeDelegations: {},
    currentDelegationId: null,
  _agentThreadMap: {},
    _executionThreadMap: {},
  _finalPosted: {},
    _lastUpdate: 0,

    // Actions
    initializeAgents: async () => {
      // Load from server first; only fall back to built-ins if the sync fails
      set({ agents: [], isLoading: true })
      try {
        await get().syncAgents()
      } catch (e) {
        const builtIns = await getAllAgents()
        set({ agents: builtIns })
      } finally {
        get().updateGraphData()
        set({ isLoading: false })
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
  const res = await fetch('/api/agents?includeSubAgents=1', { method: 'GET', credentials: 'same-origin' })
        if (!res.ok) throw new Error('Failed to fetch agents from server')
        const payload = await res.json()
        // Support both shapes: array or { agents: [...] }
        const list = Array.isArray(payload) ? payload : (payload?.agents || [])
        const parentCandidates = Array.isArray(payload?.parentCandidates) ? payload.parentCandidates : []

        // Map API to AgentConfig (preserving sub-agent hints)
  const isUUID = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)
        let agents: AgentConfig[] = list.map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          role: (agent.role ?? agent.agent_role) as any,
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens ?? agent.max_tokens,
          color: agent.color,
          icon: agent.icon,
          tags: agent.tags || [],
          prompt: agent.prompt ?? agent.system_prompt,
          tools: agent.tools || [],
          isDefault: agent.isDefault ?? agent.is_default,
          priority: agent.priority,
          createdAt: agent.createdAt ?? agent.created_at,
          updatedAt: agent.updatedAt ?? agent.updated_at,
          // Preserve parentAgentId even if not UUID for predefined agents
          // DB-created agents will naturally provide UUIDs here
          parentAgentId: (agent.parent_agent_id ?? agent.parentAgentId ?? '') as string,
          isSubAgent: agent.isSubAgent ?? agent.is_sub_agent ?? false
        }))

        // DB is the source of truth; do not merge built-ins to avoid duplicates and hardcoded defaults
        // If API returned no agents (empty account), keep array empty and let initializer/migrations populate defaults
        if (!agents || agents.length === 0) {
          console.info('No agents returned from API; waiting for DB seeding/migrations')
        }

        console.log('📋 Synced agents from database:', agents.length)
        set({ agents, parentCandidates })
        get().updateGraphData()
        
        // Actualizar delegación de Cleo después del sync
        await get().refreshCleoDelegation()
      } catch (err) {
        console.warn('Agent sync failed:', err)
        // Fallback to built-ins only if API fails
        const builtIns = await getAllAgents()
  set({ agents: builtIns, parentCandidates: [] })
        get().updateGraphData()
      }
    },

    refreshCleoDelegation: async () => {
      try {
        const response = await fetch('/api/agents/refresh-delegation', {
          method: 'POST',
          credentials: 'same-origin'
        })
        
        if (!response.ok) {
          console.warn('Failed to refresh Cleo delegation:', response.statusText)
        } else {
          console.log('✅ Cleo delegation refreshed successfully')
        }
      } catch (error) {
        console.error('Error refreshing Cleo delegation:', error)
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
    // For supervised (no agentId provided), use 'cleo-supervisor' as effective agent id
    const map = get()._agentThreadMap || {}
    const effectiveAgentId = agentId || 'cleo-supervisor'
    const key = `${effectiveAgentId}_${forceSupervised ? 'supervised' : 'direct'}`
    const threadId = map[key]

        // Create a provisional running execution immediately to drive UI progress
        const pendingId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const pendingExec = {
          id: pendingId,
          agentId: effectiveAgentId,
          threadId: threadId || 'pending',
          userId: 'unknown',
          status: 'running' as const,
          startTime: new Date(),
          messages: [],
          metrics: {
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            executionTime: 0,
            executionTimeMs: 0,
            tokensUsed: 0,
            toolCallsCount: 0,
            handoffsCount: 0,
            errorCount: 0,
            retryCount: 0,
            cost: 0
          }
        }
        set((state) => ({
          executions: [...state.executions, pendingExec as any],
          currentExecution: pendingExec as any,
          _lastUpdate: Date.now()
        }))
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

        // Replace provisional execution with real one (or append if not found)
        set((state) => {
          const newExecution = { ...data.execution }
          const idx = state.executions.findIndex(e => e.id === pendingId)
          const nextExecutions = idx >= 0
            ? state.executions.map(e => (e.id === pendingId ? newExecution : e))
            : [...state.executions, newExecution]
          return {
            executions: nextExecutions,
            currentExecution: newExecution,
            isLoading: newExecution.status === 'running',
            _lastUpdate: Date.now()
          }
        })

        // Persist thread mapping per agent for subsequent messages
        if (data.thread?.id) {
          // Persist mapping under composite key (use effective agent id so supervised chats map to cleo-supervisor)
          const newMap = { ...(get()._agentThreadMap || {}) }
          const composite = `${effectiveAgentId}_${forceSupervised ? 'supervised' : 'direct'}`
          newMap[composite] = data.thread.id
          // Track execution -> thread mapping for final message persistence (always)
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
        // Mark provisional pending execution as failed to clear UI state
        set((state) => ({
          executions: state.executions.map(e => e.id.startsWith('pending_') ? { ...e, status: 'failed' as const, endTime: new Date() } : e),
          currentExecution: null,
          error: message,
          isLoading: false,
          _lastUpdate: Date.now()
        }))
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
      
  // Create nodes from agents (skip supervisor: represented by Router node)
  const visibleAgents = agents.filter(a => a.role !== 'supervisor')
  const nodes: AgentNode[] = visibleAgents.map((agent, index) => {
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

  // Create edges array; we'll add only explicit parent → sub-agent relationships
  const edges: AgentEdge[] = []

  // Add explicit parent → sub-agent relationships (e.g., Nora → Luna/Zara)
      agents.forEach(child => {
        if (child.isSubAgent && child.parentAgentId) {
          edges.push({
            id: `${child.parentAgentId}-${child.id}`,
            source: child.parentAgentId,
            target: child.id,
            type: 'delegation',
            animated: false,
            label: 'sub-agent'
          })
        }
      })

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

    // Fallback finalization: inspect the execution's thread for an assistant message and mark execution as completed
    finalizeExecutionFromThread: async (executionId: string) => {
      try {
        const execs = get().executions
        const exec = execs.find(e => e.id === executionId)
        if (!exec) return
        // If it's already completed, nothing to do
        if (exec.status === 'completed') return
        const execMap = get()._executionThreadMap || {}
        const threadId = execMap[executionId]
        if (!threadId) return

        const mr = await fetch(`/api/agents/threads/${threadId}/messages?limit=10`, { credentials: 'same-origin' })
        if (!mr.ok) return
        const md = await mr.json()
        const msgs: any[] = md?.messages || []
        const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant' && (m.content || '').trim().length > 0)
        if (!lastAssistant) return

        const aiMessage: any = {
          id: String(lastAssistant.id || `${executionId}_final`),
          type: 'ai',
          content: lastAssistant.content || '',
          timestamp: new Date(lastAssistant.created_at || Date.now()),
          metadata: {
            sender: lastAssistant.metadata?.sender || exec.agentId,
            source: 'thread_fallback'
          },
          toolCalls: lastAssistant.tool_calls || []
        }

        set((state) => ({
          executions: state.executions.map(e => e.id === executionId ? {
            ...e,
            status: 'completed',
            endTime: new Date(),
            messages: [...(e.messages || []), aiMessage]
          } : e),
          currentExecution: {
            ...(exec as any),
            status: 'completed',
            endTime: new Date(),
            messages: [...(exec.messages || []), aiMessage]
          }
        }))
  // Clear any lingering delegation UI since execution has finalized
  try { get().clearActiveDelegations() } catch {}
      } catch (err) {
        console.warn('finalizeExecutionFromThread failed:', err)
      }
    },

    pollExecutionStatus: async (executionId: string) => {
      let attempt = 0
      const maxAttempts = 20 // Reasonable cap to prevent infinite polling
      let backoffDelay = 1000 // Start with 1 second
      const maxDelay = 30000 // Max 30 seconds between polls
      
      const poll = async (): Promise<void> => {
        attempt++
        
        try {
          const response = await fetch(`/api/agents/execution/${executionId}`, { credentials: 'same-origin' })
          if (response.ok) {
            const data = await response.json()
            if (data.execution) {
              console.log(`📊 [POLL-${attempt}] Execution ${executionId}:`, {
                status: data.execution.status,
                messages: data.execution.messages?.length || 0,
                steps: data.execution.steps?.length || 0,
                delay: backoffDelay
              })
              
              // Process delegation steps from execution to update delegation state
              if (data.execution.steps && data.execution.steps.length > 0) {
                const delegationSteps = data.execution.steps.filter((step: any) => step.action === 'delegating')
                if (delegationSteps.length > 0) {
                  get().processDelegationSteps(delegationSteps)
                }
              }
              
              // Force state update using Zustand's explicit setter
              set((state) => {
                const updatedExecution = { ...data.execution }
                return {
                  executions: state.executions.map(e => 
                    e.id === executionId ? updatedExecution : e
                  ),
                  currentExecution: updatedExecution,
                  isLoading: data.execution.status === 'running',
                  // Force timestamp to trigger subscribers
                  _lastUpdate: Date.now()
                }
              })

              // Process delegation steps from execution to update delegation state
              if (data.execution.steps && data.execution.steps.length > 0) {
                const delegationSteps = data.execution.steps.filter((step: any) => step.action === 'delegating')
                if (delegationSteps.length > 0) {
                  get().processDelegationSteps(delegationSteps)
                }
              }

              // Stop polling if execution is complete
              if (data.execution.status !== 'running') {
                console.log(`✅ [POLL-COMPLETE] Execution ${executionId}: ${data.execution.status}`)
                
                // Force final state update to ensure UI shows completion
                set((state) => ({
                  ...state,
                  currentExecution: { ...data.execution },
                  isLoading: false,
                  _lastUpdate: Date.now()
                }))
                
                if (data.execution.status === 'completed') {
                  try {
                    await get().persistFinalAssistantMessage(data.execution)
                    get().clearActiveDelegations()
                  } catch (e) {
                    console.warn('Persist final message failed:', e)
                  }
                }
                return // Stop polling
              }
              
              // Continue polling with exponential backoff
              if (attempt < maxAttempts) {
                setTimeout(poll, backoffDelay)
                backoffDelay = Math.min(backoffDelay * 2, maxDelay) // Double delay, max 30s
              }
            } else {
              console.warn(`⚠️ [POLL-${attempt}] No execution data found for ${executionId}`)
              // Try fallback after several failed attempts
              if (attempt > 3) {
                try { 
                  await get().finalizeExecutionFromThread(executionId) 
                } catch {}
              }
            }
          } else {
            console.warn(`⚠️ [POLL-${attempt}] API error ${response.status} for ${executionId}`)
            if (attempt > 3) {
              try { 
                await get().finalizeExecutionFromThread(executionId) 
              } catch {}
            }
          }
        } catch (error) {
          console.error(`❌ [POLL-${attempt}] Network error:`, error)
          try { 
            await get().finalizeExecutionFromThread(executionId) 
          } catch {}
          return // Stop on network errors
        }
        
        // Auto-stop after max attempts
        if (attempt >= maxAttempts) {
          console.log(`⏰ [POLL-TIMEOUT] Max attempts reached for ${executionId}`)
          try { 
            await get().finalizeExecutionFromThread(executionId) 
          } catch {}
        }
      }
      
      // Start polling immediately
      poll()
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

      const postOnce = async (): Promise<boolean> => {
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
            return false
          }
          return true
        } catch (e) {
          console.warn('Error posting assistant message:', e)
          return false
        }
      }

      // Try immediately; on failure, retry once after a short delay
      let ok = await postOnce()
      if (!ok) {
        // Give DB/thread consistency a moment, then retry
        await new Promise(r => setTimeout(r, 1200))
        ok = await postOnce()
        if (!ok) {
          // As a last resort, attempt to finalize from thread to hydrate UI
          try { await get().finalizeExecutionFromThread(execution.id) } catch {}
        }
      }

      // Mark as posted after success or after retry attempts to avoid duplicates
      set({ _finalPosted: { ...posted, [execution.id]: true } })
    },

    addAgent: (agent: AgentConfig) => {
      set((state) => ({ agents: [...state.agents, agent] }))
      // Rebuild graph and metrics after adding
      get().updateGraphData()
      get().updateMetrics({
        totalExecutions: get().executions.length,
        activeAgents: get().agents.filter(a => a.role === 'supervisor' || a.role === 'specialist').length
      })
      // Lightweight UX: if Cleo exists, append a dynamic tool name locally for immediate UX (server will persist too)
      const agents = get().agents
      const cleo = agents.find(a => a.id === 'cleo-supervisor')
      if (cleo) {
        const suffix = agent.id.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        const toolName = `delegate_to_${suffix}`
        if (!cleo.tools.includes(toolName)) {
          cleo.tools = [...cleo.tools, toolName]
        }
      }
    },

    updateAgent: (id: string, updates: Partial<AgentConfig>) => {
      set((state) => ({
        agents: state.agents.map(agent => 
          agent.id === id ? { ...agent, ...updates } : agent
        )
      }))
      get().updateGraphData()
    },

    deleteAgent: (id: string) => {
      set((state) => ({
        agents: state.agents.filter(agent => agent.id !== id),
        selectedAgent: state.selectedAgent?.id === id ? null : state.selectedAgent
      }))
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
    },

    // Delegation Progress Actions
    startDelegation: (delegation) => {
      const id = `delegation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const now = new Date()
      
      // Get agent metadata for display names
      const sourceMetadata = getAgentMetadata(delegation.sourceAgent)
      const targetMetadata = getAgentMetadata(delegation.targetAgent)
      
      const fullDelegation: DelegationProgress = {
        ...delegation,
        id,
        status: 'requested',
        stage: 'initializing',
        lastUpdate: now,
        progress: 0,
        timeline: [{
          id: `event-${Date.now()}`,
          timestamp: now,
          stage: 'initializing',
          message: `${sourceMetadata.name} delegating task to ${targetMetadata.name}`,
          agent: delegation.sourceAgent,
          icon: '🔄',
          progress: 0
        }]
      }

      set((state) => ({
        activeDelegations: {
          ...state.activeDelegations,
          [id]: fullDelegation
        },
        currentDelegationId: id
      }))

      return id
    },

    updateDelegationStatus: (delegationId, status, stage) => {
      set((state) => {
        const delegation = state.activeDelegations[delegationId]
        if (!delegation) return state

        const now = new Date()
        let progress = delegation.progress

        // Update progress based on status
        switch (status) {
          case 'accepted': progress = 10; break
          case 'in_progress': progress = Math.max(progress, 25); break
          case 'completing': progress = 80; break
          case 'completed': progress = 100; break
          case 'failed': 
          case 'timeout': progress = delegation.progress; break
        }

        const updatedDelegation = {
          ...delegation,
          status,
          stage: stage || delegation.stage,
          lastUpdate: now,
          progress
        }

        return {
          activeDelegations: {
            ...state.activeDelegations,
            [delegationId]: updatedDelegation
          }
        }
      })
    },

    addDelegationTimelineEvent: (delegationId, event) => {
      set((state) => {
        const delegation = state.activeDelegations[delegationId]
        if (!delegation) return state

        const newEvent: DelegationTimelineEvent = {
          ...event,
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: new Date()
        }

        const updatedDelegation = {
          ...delegation,
          timeline: [...delegation.timeline, newEvent],
          lastUpdate: new Date()
        }

        return {
          activeDelegations: {
            ...state.activeDelegations,
            [delegationId]: updatedDelegation
          }
        }
      })
    },

    completeDelegation: (delegationId, success) => {
      const state = get()
      const delegation = state.activeDelegations[delegationId]
      if (!delegation) return

      // Add final timeline event
      state.addDelegationTimelineEvent(delegationId, {
        stage: 'finalizing',
  message: success ? 'Task completed successfully' : 'Task failed',
        agent: delegation.targetAgent,
        icon: success ? '✅' : '❌',
        progress: success ? 100 : delegation.progress
      })

      // Update final status
      state.updateDelegationStatus(delegationId, success ? 'completed' : 'failed')

      // Clear current delegation after a delay
      setTimeout(() => {
        set((state) => ({
          currentDelegationId: state.currentDelegationId === delegationId ? null : state.currentDelegationId
        }))
      }, 3000)
    },

    clearActiveDelegations: () => {
      set({
        activeDelegations: {},
        currentDelegationId: null
      })
    },

    processDelegationSteps: (steps) => {
      const store = get()
      let currentDelegationId = store.currentDelegationId
      
      // Process steps in chronological order
      steps.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      for (const step of steps) {
        const metadata = step.metadata || {}
        
        // Create new delegation if this is the first step
        if (metadata.status === 'requested' && metadata.stage === 'initializing') {
          // Get agent metadata for display names
          const sourceMetadata = getAgentMetadata(metadata.sourceAgent || step.agent)
          const targetMetadata = getAgentMetadata(metadata.delegatedTo)
          
          currentDelegationId = store.startDelegation({
            sourceAgent: metadata.sourceAgent || step.agent,
            targetAgent: metadata.delegatedTo,
            task: metadata.task || step.content,
            status: 'requested',
            stage: 'initializing',
            startTime: new Date(step.timestamp)
          })
          
          if (process.env.NODE_ENV === 'development') {
            console.log('🆕 [DELEGATION] Created:', `${sourceMetadata.name} → ${targetMetadata.name}`)
          }
        } 
        // Update existing delegation
        else if (currentDelegationId && metadata.status && metadata.stage) {
          store.updateDelegationStatus(currentDelegationId, metadata.status, metadata.stage)
          
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 [DELEGATION] Updated:', currentDelegationId, metadata.status, metadata.stage)
          }
        }
        
        // Complete delegation if this is the final step
        if (metadata.status === 'completed') {
          if (currentDelegationId) {
            store.completeDelegation(currentDelegationId, metadata.result || 'Task completed')
            
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ [DELEGATION] Completed:', currentDelegationId)
            }
          }
        }
      }
    }
  }))
)

// Initialize agents on store creation (client-only to avoid server fetch of relative URLs)
if (typeof window !== 'undefined') {
  useClientAgentStore.getState().initializeAgents()

  // Set up delegation event listeners to capture backend events
  window.addEventListener('delegation-progress', (event: any) => {
    const detail = event.detail
    console.log('🔥 [CLIENT-STORE] Received delegation-progress:', detail)
    
    const store = useClientAgentStore.getState()
    
    if (detail.stage === 'initializing' && detail.status === 'requested') {
      // Create new delegation
      const delegationId = store.startDelegation({
        sourceAgent: detail.sourceAgent,
        targetAgent: detail.targetAgent,
        task: detail.task || 'Delegated task',
        status: 'requested',
        stage: 'initializing',
        startTime: new Date()
      })
      console.log('🆕 [CLIENT-STORE] Created delegation:', delegationId)
    } else {
      // Update existing delegation
      const currentDelegationId = store.currentDelegationId
      if (currentDelegationId) {
        store.updateDelegationStatus(currentDelegationId, detail.status, detail.stage)
        console.log('🔄 [CLIENT-STORE] Updated delegation:', currentDelegationId, detail.status, detail.stage)
      }
    }
  })

  window.addEventListener('delegation-completed', (event: any) => {
    const detail = event.detail
    console.log('✅ [CLIENT-STORE] Received delegation-completed:', detail)
    
    const store = useClientAgentStore.getState()
    const currentDelegationId = store.currentDelegationId
    if (currentDelegationId) {
      store.completeDelegation(currentDelegationId, detail.result || 'Task completed')
      console.log('✅ [CLIENT-STORE] Completed delegation:', currentDelegationId)
    }
  })

  window.addEventListener('delegation-failed', (event: any) => {
    const detail = event.detail
    console.log('❌ [CLIENT-STORE] Received delegation-failed:', detail)
    
    const store = useClientAgentStore.getState()
    const currentDelegationId = store.currentDelegationId
    if (currentDelegationId) {
      store.updateDelegationStatus(currentDelegationId, 'failed', 'finalizing')
      console.log('❌ [CLIENT-STORE] Failed delegation:', currentDelegationId)
    }
  })

  console.log('🎧 [CLIENT-STORE] Delegation event listeners registered')
}

function getStageIcon(stage: string): string {
  switch (stage) {
    case 'initializing': return '🔄'
    case 'analyzing': return '🔍'
    case 'researching': return '📚'
    case 'processing': return '⚙️'
    case 'synthesizing': return '🧠'
    case 'finalizing': return '✨'
    default: return '⏳'
  }
}

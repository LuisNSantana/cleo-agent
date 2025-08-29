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
  executeAgent: (input: string, agentId?: string) => Promise<void>
  selectAgent: (agent: AgentConfig | null) => void
  updateGraphData: () => void
  clearError: () => void
  setLoading: (loading: boolean) => void
  addExecution: (execution: AgentExecution) => void
  updateMetrics: (metrics: Partial<SystemMetrics>) => void
  pollExecutionStatus: (executionId: string) => Promise<void>
  addAgent: (agent: AgentConfig) => void
  addDelegationEvent: (event: any) => void
  resetGraph: () => void
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
      try {
        const res = await fetch('/api/agents/sync', { method: 'GET' })
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

    executeAgent: async (input: string, agentId?: string) => {
      set({ isLoading: true, error: null })

      try {
        // Call API instead of direct orchestrator
        const response = await fetch('/api/agents/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, agentId })
        })

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

        // Start polling for execution updates if it's running
        if (data.execution.status === 'running') {
          get().pollExecutionStatus(data.execution.id)
        }

        get().updateMetrics({
          totalExecutions: get().executions.length,
          activeAgents: get().agents.filter(a => a.role === 'supervisor' || a.role === 'specialist').length
        })

      } catch (error) {
        console.error('Error executing agent:', error)
        set({ 
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          isLoading: false 
        })
      }
    },

    selectAgent: (agent) => {
      set({ selectedAgent: agent })
    },

    updateGraphData: () => {
      const { agents, executions } = get()
      
      // Create nodes from agents
      const nodes: AgentNode[] = agents.map((agent, index) => {
        const sortedForAgent = executions
          .filter(e => e.agentId === agent.id)
          .sort((a, b) => new Date(b.startTime as any).getTime() - new Date(a.startTime as any).getTime())
        const last = sortedForAgent[0]
        const lastExecDate = last ? new Date(last.startTime as any) : undefined

        return {
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
      const maxPolls = 30 // Maximum 30 seconds of polling
      
      const pollInterval = setInterval(async () => {
        pollCount++
        
        try {
          const response = await fetch(`/api/agents/execution/${executionId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.execution) {
              console.log(`📊 Polling execution ${executionId} [${pollCount}/${maxPolls}]:`, {
                status: data.execution.status,
                messageCount: data.execution.messages?.length || 0,
                stepCount: data.execution.steps?.length || 0,
                currentStep: data.execution.currentStep
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
    }
  }))
)

// Initialize agents on store creation
useClientAgentStore.getState().initializeAgents()

// Listen for delegation events from the orchestrator
if (typeof window !== 'undefined') {
  window.addEventListener('agent-delegation', (event: any) => {
    console.log('🎯 UI received delegation event:', event.detail)
    useClientAgentStore.getState().addDelegationEvent(event.detail)
  })
}

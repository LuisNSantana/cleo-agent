/**
 * Agent Store
 * Zustand store for managing agent state and real-time updates
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
  AgentStore as AgentStoreType
} from './types'
import { ALL_PREDEFINED_AGENTS } from './predefined'
// import { getAgentOrchestrator } from './agent-orchestrator' // Moved to dynamic import

interface AgentStoreState extends AgentStoreType {
  // Actions
  initializeAgents: () => Promise<void>
  executeAgent: (input: string, agentId?: string) => Promise<AgentExecution>
  getExecution: (executionId: string) => AgentExecution | undefined
  updateGraphData: () => void
  subscribeToEvents: () => void
  unsubscribeFromEvents: () => void
  syncAgents: () => Promise<void>
  cleanupStaleAgents: () => Promise<void>
}

export const useAgentStore = create<AgentStoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    agents: [],
    executions: [],
    currentExecution: null,
    graphData: {
      nodes: [],
      edges: []
    },
    metrics: {
      activeAgents: 0,
      totalExecutions: 0,
      averageResponseTime: 0,
      errorRate: 0,
      memoryUsage: 0,
      activeConnections: 0
    },
    isLoading: false,
    error: null,

    // Actions
    initializeAgents: async () => {
      try {
        // Get built-in agents
  const builtInAgents = [...ALL_PREDEFINED_AGENTS]
        
        // Get runtime agents from orchestrator
  const { getAgentOrchestrator } = await import('./orchestrator-adapter')
        const orchestrator = getAgentOrchestrator()
        const agentConfigs = orchestrator.getAgentConfigs()
        const runtimeAgents = Array.from(agentConfigs.values()).filter(config => {
          // Runtime agents have ID pattern: custom_{timestamp}
          return /^custom_\d+$/.test(config.id)
        })
        
        // Combine both built-in and runtime agents
        const allAgents = [...builtInAgents, ...runtimeAgents]
        
        set({ agents: allAgents })
        get().updateGraphData()
      } catch (error) {
        console.error('Error initializing agents:', error)
        // Fallback to built-in agents only
  const agents = [...ALL_PREDEFINED_AGENTS]
        set({ agents })
        get().updateGraphData()
      }
    },

    executeAgent: async (input: string, agentId?: string) => {
      set({ isLoading: true, error: null })

      try {
  const { getAgentOrchestrator } = await import('./orchestrator-adapter')
        const orchestrator = getAgentOrchestrator()
        const execution = await orchestrator.executeAgent(input, agentId)

        set((state) => ({
          executions: [...state.executions, execution],
          currentExecution: execution,
          isLoading: false
        }))

        get().updateGraphData()
        return execution
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        set({
          error: errorMessage,
          isLoading: false
        })
        throw error
      }
    },

    getExecution: (executionId: string) => {
      const { executions } = get()
      return executions.find(exec => exec.id === executionId)
    },

    updateGraphData: () => {
      const { agents, executions } = get()

      // Create nodes from agents
      const agentNodes: AgentNode[] = agents.map((agent, index) => ({
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
          executionCount: executions.filter(e => e.agentId === agent.id).length,
          lastExecution: executions
            .filter(e => e.agentId === agent.id)
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]?.startTime,
          connections: []
        }
      }))

      // Create edges from executions (showing handoffs)
      const agentEdges: AgentEdge[] = []
      executions.forEach(execution => {
        // Find handoff patterns in messages
        for (let i = 0; i < (execution.messages || []).length - 1; i++) {
          const currentMessage = (execution.messages || [])[i]
          const nextMessage = (execution.messages || [])[i + 1]

          if (currentMessage.type === 'ai' && nextMessage.type === 'human') {
            // Potential handoff detected
            if (currentMessage.content.toLowerCase().includes('delegat') ||
                currentMessage.content.toLowerCase().includes('transfer')) {

              const targetAgent = agents.find(a =>
                currentMessage.content.toLowerCase().includes(a.name.toLowerCase())
              )

              if (targetAgent) {
                agentEdges.push({
                  id: `edge_${execution.id}_${i}`,
                  source: execution.agentId,
                  target: targetAgent.id,
                  type: 'handoff',
                  animated: true,
                  label: 'Handoff',
                  data: {
                    messageCount: 1,
                    lastMessage: nextMessage.timestamp,
                    errorCount: 0
                  }
                })
              }
            }
          }
        }
      })

      // Update connections in nodes
      agentNodes.forEach(node => {
        node.data.connections = agentEdges
          .filter(edge => edge.source === node.id || edge.target === node.id)
          .map(edge => edge.source === node.id ? edge.target : edge.source)
      })

      set({
        graphData: {
          nodes: agentNodes,
          edges: agentEdges
        }
      })
    },

    subscribeToEvents: async () => {
  const { getAgentOrchestrator } = await import('./orchestrator-adapter')
      const orchestrator = getAgentOrchestrator()

      const handleEvent = (event: AgentActivity) => {
        set((state) => {
          const newExecutions = [...state.executions]
          const executionIndex = newExecutions.findIndex(e => e.id === event.data.executionId)

          if (executionIndex >= 0) {
            const execution = newExecutions[executionIndex]

            switch (event.type) {
              case 'execution_completed':
                execution.status = 'completed'
                execution.endTime = event.timestamp
                break
              case 'error':
                execution.status = 'failed'
                execution.error = event.data.error
                execution.endTime = event.timestamp
                break
            }

            newExecutions[executionIndex] = execution
          }

          return {
            executions: newExecutions,
            metrics: {
              ...state.metrics,
              totalExecutions: newExecutions.length,
              activeAgents: newExecutions.filter(e => e.status === 'running').length
            }
          }
        })

        get().updateGraphData()
      }

      orchestrator.onEvent(handleEvent)
    },

    unsubscribeFromEvents: async () => {
  const { getAgentOrchestrator } = await import('./orchestrator-adapter')
      const orchestrator = getAgentOrchestrator()
      // Note: In a real implementation, you'd want to pass the specific listener
      // For now, we'll clear all listeners
      orchestrator.cleanup()
    },

    syncAgents: async () => {
      try {
        console.log('🔄 Starting agent synchronization...')
        
        // First, get agent configs from server orchestrator
        const response = await fetch('/api/agents/sync', {
          method: 'GET',
        })

        if (!response.ok) {
          console.error('Failed to sync agents with server')
          return
        }

        const result = await response.json()
        console.log(`🔄 Agent sync completed: ${result.message || 'Sync successful'}`)
        console.log(`📋 Server agents:`, result.agents)

        // Get built-in agents
  const builtInAgents = [...ALL_PREDEFINED_AGENTS]
        
        // Get runtime agents from server response
        const runtimeAgents = result.agents?.filter((config: AgentConfig) => {
          // Runtime agents have ID pattern: custom_{timestamp}
          return /^custom_\d+$/.test(config.id)
        }) || []
        
        // Combine both built-in and runtime agents
        const allAgents = [...builtInAgents, ...runtimeAgents]
        
        console.log(`🎯 Total agents after sync: ${allAgents.length} (${builtInAgents.length} built-in + ${runtimeAgents.length} runtime)`)
        
        // Update store with all agents
        set({ agents: allAgents })
        get().updateGraphData()
        
      } catch (error) {
        console.error('Error syncing agents:', error)
        // Fallback to just initialize agents normally
        get().initializeAgents()
      }
    },

    cleanupStaleAgents: async () => {
      try {
        const response = await fetch('/api/agents/sync', {
          method: 'GET',
        })

        if (!response.ok) {
          console.error('Failed to cleanup stale agents')
          return
        }

        const result = await response.json()
        console.log(`🧹 Agent cleanup completed: ${result.message}`)

        // Refresh agents and graph data
        get().initializeAgents()
      } catch (error) {
        console.error('Error cleaning up agents:', error)
      }
    }
  }))
)

// Initialize agents on store creation (async)
if (typeof window !== 'undefined') {
  // Only run in browser to avoid SSR issues
  // First initialize with built-in agents, then sync runtime agents
  useAgentStore.getState().syncAgents()
}
// Note: subscribeToEvents is now async, so we don't call it here
// It will be called when needed in the components

// Cleanup on unmount (for SSR safety)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useAgentStore.getState().unsubscribeFromEvents()
  })
  
  // Auto-sync agents on page load/refresh
  window.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Auto-syncing agents on page load...')
    await useAgentStore.getState().syncAgents()
  })
}

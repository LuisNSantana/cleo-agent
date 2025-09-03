'use client'

/**
 * Agent Graph Component
 * Interactive visualization of the multi-agent system using React Flow
 */

import React, { useCallback, useMemo, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel
} from 'reactflow'
import 'reactflow/dist/style.css'

import { AgentNodeComponent } from './AgentNode'
import ResponseNode from './ResponseNode'
import StateNode from './StateNode'
import DecisionNode from './DecisionNode'
import RouterNode from './RouterNode'
import FinalizeNode from './FinalizeNode'
import { AgentEdgeComponent } from './AgentEdge'
import { ExecutionTrace } from './ExecutionTrace'
import { RealTimeExecutionMonitor } from './RealTimeMonitor'
import { AgentThinkingVisualizer } from './AgentThinkingVisualizer'
import { LangChainFlowVisualizer } from './LangChainFlowVisualizer'
import { ReasoningFlowPanel } from './ReasoningFlowPanel'
import { useClientAgentStore } from '@/lib/agents/client-store'
import { useRealTimeExecution } from '@/lib/agents/use-realtime-execution'
import { AgentConfig, AgentExecution } from '@/lib/agents/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResponseModal } from './ResponseModal'

// Define node types for React Flow
const nodeTypes = {
  agent: AgentNodeComponent,
  response: ResponseNode,
  state: StateNode,
  decision: DecisionNode,
  router: RouterNode,
  finalize: FinalizeNode,
}

const edgeTypes = {
  handoff: AgentEdgeComponent,
}

interface AgentGraphProps {
  onNodeClick?: (node: Node) => void
  onEdgeClick?: (edge: Edge) => void
  className?: string
}

export function AgentGraph({
  onNodeClick,
  onEdgeClick,
  className = "w-full h-full"
}: AgentGraphProps) {
  const { nodes: storeNodes, edges: storeEdges, agents, executions, executeAgent, selectAgent, currentExecution, setNodePosition, resetGraphLayout, updateGraphData } = useClientAgentStore()
  const { currentStep, agentThoughts, isLive } = useRealTimeExecution()
  const [selectedExecution, setSelectedExecution] = useState<AgentExecution | null>(null)
  const [showLangChainFlow, setShowLangChainFlow] = useState(false)
  const [responseModal, setResponseModal] = useState<{ title?: string; content: string } | null>(null)
  const [fitOnInit, setFitOnInit] = useState(true)
  const [minimalMode, setMinimalMode] = useState(true)
  const rfRef = React.useRef<any>(null)

  // Only fit the view once on mount, to avoid resetting the viewport on updates
  React.useEffect(() => {
    const id = setTimeout(() => setFitOnInit(false), 0)
    return () => clearTimeout(id)
  }, [])

  // Convert our data to React Flow format
  const initialNodes: Node[] = useMemo(() => {
    const baseNodes = storeNodes.map((nodeData) => {
      // Determine status based on current execution and execution steps
      let nodeStatus = 'idle'
      
      if (currentExecution?.status === 'running') {
        // Check if this agent is currently active based on the agentId from logs or current step
        if (nodeData.id === currentExecution.agentId || currentStep?.agent === nodeData.id) {
          nodeStatus = 'active'
        }
      } else if (currentExecution?.status === 'completed') {
        // Show trail effect for agents that were used in the execution steps
        const wasUsedInExecution = currentExecution.steps?.some(step => 
          step.agent === nodeData.id || 
          step.metadata?.agentId === nodeData.id ||
          step.metadata?.delegatedTo === nodeData.id
        )
        if (wasUsedInExecution) {
          nodeStatus = 'trail'
        }
      }
      
      // Also check recent executions for trail effect (2 minutes window)
      if (nodeStatus === 'idle') {
        const recentExecution = executions
          .filter(e => e.status === 'completed')
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]
        
        if (recentExecution && Date.now() - new Date(recentExecution.startTime).getTime() < 120000) {
          const wasUsedInRecentExecution = recentExecution.steps?.some(step => 
            step.agent === nodeData.id || 
            step.metadata?.agentId === nodeData.id ||
            step.metadata?.delegatedTo === nodeData.id
          )
          if (wasUsedInRecentExecution) {
            nodeStatus = 'trail'
          }
        }
      }

      return {
        id: nodeData.id,
        type: 'agent',
        position: nodeData.position,
        data: {
          ...nodeData.data,
          compact: minimalMode,
          status: nodeStatus,
          onExecute: (input: string) => executeAgent(input, nodeData.id),
          onShowExecution: (execution: AgentExecution) => {
            setSelectedExecution(execution)
          },
          executions: executions.filter(e => e.agentId === nodeData.id)
        },
        style: {
          background: 'transparent',
          border: 'none',
        }
      }
    })

    // Add Router node (entry point)
  const routerNode: Node = {
      id: 'router-node',
      type: 'router',
      position: { x: 50, y: 150 },
      data: {
    label: 'Cleo · Supervisando',
        compact: minimalMode,
        status: (() => {
          if (currentExecution?.status === 'running') {
            if (currentStep?.action === 'analyzing' || currentStep?.action === 'routing' || currentStep?.action === 'thinking' || currentStep?.action === 'delegating' || !currentStep) {
              return 'active'
            }
          }
          // Show trail effect for completed executions if router was involved
          if (currentExecution?.status === 'completed') {
            const routerWasUsed = currentExecution.steps?.some(step => 
              step.agent === 'cleo-supervisor' || step.metadata?.phase === 'routing'
            )
            if (routerWasUsed) return 'trail'
          }
          // Also show trail for any recent execution
          const recentExecution = executions
            .filter(e => e.status === 'completed')
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]
          if (recentExecution && Date.now() - new Date(recentExecution.startTime).getTime() < 120000) {
            const routerWasUsed = recentExecution.steps?.some(step => 
              step.agent === 'cleo-supervisor' || step.metadata?.phase === 'routing'
            )
            if (routerWasUsed) return 'trail'
          }
          return 'idle'
        })()
      }
    }

    // Add Finalize node (final step)
    const finalizeNode: Node = {
      id: 'finalize-node',
      type: 'finalize',
      position: { x: 650, y: 250 },
      data: {
        label: 'Cleo - Finalizando',
        compact: minimalMode,
        status: (() => {
          if (currentExecution?.status === 'running') {
            if (currentStep?.action === 'completing') return 'active'
          }
          // Show trail effect for completed executions if finalize was involved
          if (currentExecution?.status === 'completed') {
            const finalizeWasUsed = currentExecution.steps?.some(step => 
              step.metadata?.phase === 'finalizing' || step.metadata?.phase === 'finalized'
            )
            if (finalizeWasUsed) return 'trail'
          }
          // Also show trail for any recent execution
          const recentExecution = executions
            .filter(e => e.status === 'completed')
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]
          if (recentExecution && Date.now() - new Date(recentExecution.startTime).getTime() < 120000) {
            const finalizeWasUsed = recentExecution.steps?.some(step => 
              step.metadata?.phase === 'finalizing' || step.metadata?.phase === 'finalized'
            )
            if (finalizeWasUsed) return 'trail'
          }
          return 'idle'
        })()
      }
    }

    // Response node showing latest AI message (always visible)
    const responseNode: Node = (() => {
      const exec = currentExecution || executions[0]
      const lastAi = exec ? [...(exec.messages || [])].reverse().find(m => m.type === 'ai') : undefined
      const isCompleted = exec?.status === 'completed'
      const content = lastAi?.content
        || (isCompleted
          ? 'Respuesta generada. Haz clic para ver el contenido completo.'
          : 'La respuesta final aparecerá aquí cuando esté lista.')

      return {
        id: 'response-node',
        type: 'response',
        position: { x: 900, y: 250 }, // Fixed position to the right of finalize
        data: { 
          title: 'Respuesta Final', 
          content: String(content),
          compact: minimalMode,
          onOpen: () => {
            if (lastAi?.content) {
              setResponseModal({
                title: 'Respuesta de Cleo',
                content: lastAi.content
              })
            }
          },
          // Show typing animation only when running and without AI yet
          isTyping: Boolean(exec?.status === 'running' && !lastAi)
        }
      }
    })()

  // No breadcrumb/state bubbles; keep the canvas minimal
  const stateNode: Node | null = null

  return [...baseNodes, routerNode, finalizeNode, responseNode]
  }, [storeNodes, executeAgent, executions, currentExecution, currentStep, minimalMode])

  const initialEdges: Edge[] = useMemo(() => {
    // Base edges from store, but hide noisy tool/handoff edges (e.g., delegate, complete_task)
    const baseEdges = storeEdges
      .filter((edgeData) => {
        const label = String(edgeData.label || '').toLowerCase()
        // Hide delegation and tool edges to avoid duplicate/ambiguous paths
        if (edgeData.type === 'handoff') return false
        if (label.includes('delegate') || label.includes('delegar')) return false
        if (label.includes('complete_task') || label.includes('complete')) return false
        return true
      })
  .map((edgeData) => ({
      id: edgeData.id,
      source: edgeData.source,
      target: edgeData.target,
      type: edgeData.type === 'handoff' ? 'handoff' : 'default',
      animated: edgeData.animated,
  label: minimalMode ? undefined : edgeData.label,
  data: { ...(edgeData.data || {}), minimal: minimalMode },
      style: {
        stroke: edgeData.type === 'handoff' ? '#FF6B6B' : '#64748B',
        strokeWidth: edgeData.type === 'handoff' ? 3 : 2,
      }
    }))

    // Add router edges: router -> specialists (highlight if used recently)
    const routerEdges: Edge[] = []
    const specialistNodes = storeNodes.filter(n => n.data.agent?.role === 'specialist')
    specialistNodes.forEach(specialist => {
      const recentlyUsed = (() => {
        // Check if this specialist was used in recent executions via steps
        const recentExecution = executions
          .filter(e => e.status === 'completed')
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]
        
        if (recentExecution && Date.now() - new Date(recentExecution.startTime).getTime() < 120000) {
          return recentExecution.steps?.some(step => 
            step.agent === specialist.id || 
            step.metadata?.agentId === specialist.id ||
            step.metadata?.delegatedTo === specialist.id
          )
        }
        return false
      })()

      const isDelegatingNow = (
        currentExecution?.status === 'running' &&
        (currentStep?.action === 'delegating' || currentStep?.action === 'routing') &&
        currentStep?.agent === specialist.id
      )
      routerEdges.push({
        id: `router-${specialist.id}`,
        source: 'router-node',
        target: specialist.id,
        type: 'handoff',
        animated: recentlyUsed || isDelegatingNow,
  data: { minimal: minimalMode },
        style: { 
          stroke: (recentlyUsed || isDelegatingNow) ? '#8b5cf6' : '#3b82f6', 
          strokeDasharray: (recentlyUsed || isDelegatingNow) ? '8 4' : '4 2',
          strokeWidth: (recentlyUsed || isDelegatingNow) ? 4 : 2
        },
  label: minimalMode ? undefined : (recentlyUsed ? '✓ asignado' : 'decidir')
      })
    })

    // Add finalize edges: specialists -> finalize (highlight if used recently)
    const finalizeEdges: Edge[] = []
    specialistNodes.forEach(specialist => {
      const recentlyUsed = (() => {
        // Check if this specialist was used in recent executions via steps
        const recentExecution = executions
          .filter(e => e.status === 'completed')
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]
        
        if (recentExecution && Date.now() - new Date(recentExecution.startTime).getTime() < 120000) {
          return recentExecution.steps?.some(step => 
            step.agent === specialist.id || 
            step.metadata?.agentId === specialist.id ||
            step.metadata?.delegatedTo === specialist.id
          )
        }
        return false
      })()

      const isCompletingNow = (
        currentExecution?.status === 'running' &&
        currentStep?.action === 'completing' &&
        currentStep?.agent === specialist.id
      )
      finalizeEdges.push({
        id: `${specialist.id}-finalize`,
        source: specialist.id,
        target: 'finalize-node',
        type: 'handoff',
        animated: recentlyUsed || isCompletingNow,
  data: { minimal: minimalMode },
        style: { 
          stroke: (recentlyUsed || isCompletingNow) ? '#8b5cf6' : '#10b981', 
          strokeDasharray: (recentlyUsed || isCompletingNow) ? '8 4' : '4 2',
          strokeWidth: (recentlyUsed || isCompletingNow) ? 4 : 2
        },
  label: minimalMode ? undefined : (recentlyUsed ? '✓ entrega' : 'entregar')
      })
    })

    // Direct router -> finalize for non-delegated queries (highlight if used recently)
    const hasRecentDelegation = executions
      .filter(e => e.status === 'completed')
      .some(e => {
        const timeDiff = Date.now() - new Date(e.startTime).getTime()
        if (timeDiff < 120000) {
          // Check if any specialists were used in the execution steps
          return e.steps?.some(step => 
            specialistNodes.some(s => 
              step.agent === s.id || 
              step.metadata?.agentId === s.id ||
              step.metadata?.delegatedTo === s.id
            )
          )
        }
        return false
      })

    const directEdge: Edge = {
      id: 'router-finalize-direct',
      source: 'router-node',
      target: 'finalize-node',
      type: 'handoff',
      animated: false, // This path is rarely used for now
  data: { minimal: minimalMode },
      style: { 
        stroke: hasRecentDelegation ? '#94a3b8' : '#10b981', 
        strokeDasharray: '4 2',
        strokeWidth: hasRecentDelegation ? 1 : 2,
        opacity: hasRecentDelegation ? 0.5 : 1
      },
  label: minimalMode ? undefined : 'responder'
    }

    const entryEdge: Edge = {
      id: 'cleo-to-router',
      source: 'cleo-supervisor',
      target: 'router-node',
      type: 'handoff',
      animated: Boolean(currentExecution?.status === 'running' && (!currentStep || ['analyzing','routing','thinking','delegating'].includes(currentStep.action as any))),
  data: { minimal: minimalMode },
      style: {
        stroke: '#64748B',
        strokeDasharray: '4 2',
        strokeWidth: 2,
      },
  label: minimalMode ? undefined : 'mensaje'
    }

    // Finalize → Response edge (always visible)
  const respEdge: Edge = (() => {
      const exec = currentExecution || executions[0]
      const hasAiMessage = !!exec?.messages?.some(m => m.type === 'ai')
      const isCompleted = exec?.status === 'completed'
      const isRecentlyCompleted = Boolean(isCompleted && exec && Date.now() - new Date(exec.startTime).getTime() < 120000)

      const animated = hasAiMessage && isRecentlyCompleted
      const stroke = animated ? '#8b5cf6' : hasAiMessage ? '#10b981' : '#94a3b8'
      const strokeWidth = animated ? 4 : hasAiMessage ? 3 : 2
      const opacity = hasAiMessage || isCompleted ? 1 : 0.8

      return {
        id: 'edge-to-response',
        source: 'finalize-node',
        target: 'response-node',
    type: 'handoff',
  data: { minimal: minimalMode },
        animated,
        style: { 
          stroke,
          strokeDasharray: '8 4',
          strokeWidth,
          opacity
        },
        label: 'respuesta'
      }
    })()

    return [...baseEdges, entryEdge, ...routerEdges, ...finalizeEdges, directEdge, respEdge]
  }, [storeEdges, currentExecution, executions, storeNodes, minimalMode])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // Persist node position during drag/move
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    if (node?.id && node?.position) {
      setNodePosition(node.id, node.position as any)
    }
  }, [setNodePosition])

  const onNodesDelete = useCallback(() => {
    // no-op for now
  }, [])

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onNodeClick?.(node)
  }, [onNodeClick])

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    onEdgeClick?.(edge)
  }, [onEdgeClick])

  // Update nodes/edges without resetting positions/viewport – shallow merge by id
  React.useEffect(() => {
    setNodes((prev) => {
      const byId = new Map(prev.map(n => [n.id, n]))
      const next = initialNodes.map(n => ({ ...(byId.get(n.id) || n), data: n.data }))
      return next
    })
  }, [initialNodes, setNodes])

  React.useEffect(() => {
    setEdges((prev) => {
      const byId = new Map(prev.map(e => [e.id, e]))
      const next = initialEdges.map(e => ({ ...(byId.get(e.id) || e), data: { ...(byId.get(e.id)?.data || {}), ...(e.data || {}) } }))
      return next
    })
  }, [initialEdges, setEdges])

  // Edge highlighting based on current/selected execution handoffs
  React.useEffect(() => {
    if (!currentExecution && !selectedExecution) return
    const exec = currentExecution || selectedExecution!

    // Extract handoff pairs from messages (source -> target) with timestamps
    const pairs: Array<{ from: string; to: string; at: number }> = []
    for (const m of exec.messages) {
      const to = (m.metadata as any)?.handoff_to
      const from = (m.metadata as any)?.handoff_from
      if (from && to) {
        const at = new Date((m as any).timestamp || Date.now()).getTime()
        pairs.push({ from, to, at })
      }
    }

    // Build last timestamp per pair and counts
    const lastAtByPair = new Map<string, number>()
    const countByPair = new Map<string, number>()
    for (const p of pairs) {
      const key = `${p.from}->${p.to}`
      countByPair.set(key, (countByPair.get(key) || 0) + 1)
      lastAtByPair.set(key, Math.max(lastAtByPair.get(key) || 0, p.at))
    }

    // Also infer used specialists from pairs to enable specialist->finalize trailing
    const usedSpecialists = new Set<string>(pairs.map(p => p.to))

    // Determine if we should show entry and response edges as used
    const hasAiMessage = !!exec?.messages?.some(m => m.type === 'ai')
    const execStart = new Date(exec.startTime || Date.now()).getTime()
    const now = Date.now()
    const TRAIL_WINDOW = 120000 // 2 min trail
    const ACTIVE_WINDOW = 12000 // 12s active glow

  const updateStyles = () => {
      const nowTick = Date.now()
      setEdges((eds) => eds.map((e) => {
        const key = `${e.source}->${e.target}`
        const lastAt = lastAtByPair.get(key)
        // Base on last message time
        let isActive = lastAt ? (nowTick - lastAt < ACTIVE_WINDOW) : false
        // Live activation based on current step
        if (currentExecution?.status === 'running' && currentStep) {
          if (e.id.startsWith('router-') && currentStep.action === 'delegating') {
            isActive = true
          }
          if (e.id.endsWith('-finalize') && currentStep.action === 'completing') {
            isActive = true
          }
          if (e.id === 'edge-to-response' && currentStep.action === 'completing') {
            isActive = true
          }
        }
        // Consider entry and response edges specially
        const isEntry = e.id === 'cleo-to-router'
        const isResponse = e.id === 'edge-to-response'
        const wasUsedPair = lastAt !== undefined
        const wasUsedByHeuristic = (
          // If specialist was used, mark its finalize delivery edge as used
          (e.target === 'finalize-node' && usedSpecialists.has(e.source)) ||
          // Entry is always part of the flow while running or recently after
          (isEntry && (exec.status === 'running' || (now - execStart) < TRAIL_WINDOW)) ||
          // Router to a specific specialist during routing/delegating
          (e.id.startsWith('router-') && exec.status === 'running' && (currentStep?.action === 'routing' || currentStep?.action === 'delegating') && e.target === currentStep?.agent) ||
          // Specialist to finalize while completing
          (e.id.endsWith('-finalize') && exec.status === 'running' && currentStep?.action === 'completing' && e.source === currentStep?.agent) ||
          // Response edge is used when we have an AI message
          (isResponse && hasAiMessage)
        )
        const wasUsed = wasUsedPair || wasUsedByHeuristic

        // Compute style variants
        const baseStroke = (e.style as any)?.stroke || '#64748B'
        const styleActive = {
          stroke: '#a78bfa',
          strokeWidth: 4,
          strokeDasharray: '8 4',
          opacity: 1,
        }
        const styleTrail = {
          stroke: '#8b5cf6',
          strokeWidth: 3,
          strokeDasharray: '8 4',
          opacity: 0.95,
        }
        const styleNeutral = {
          stroke: baseStroke,
          strokeWidth: 2,
          strokeDasharray: '4 2',
          opacity: 0.85,
        }

        // Base next style
        let nextStyle = isActive ? styleActive : (wasUsed ? styleTrail : styleNeutral)
        const messageCount = countByPair.get(key) || 0

        // Live override: only the selected agent's connectors are active
        if (exec.status === 'running' && currentStep) {
          if (e.id.startsWith('router-')) {
            const selected = e.target === currentStep.agent
            nextStyle = selected ? styleActive : styleNeutral
          } else if (e.id.endsWith('-finalize')) {
            // Only the specialist that actually returned the result should glow
            const selected = e.source === currentStep.agent
            nextStyle = selected ? styleActive : styleNeutral
          }
        }

        // Labels: add checkmark only for the actually used edge
        let nextLabel = e.label as any
        const shouldCheck = wasUsed || (exec.status === 'running' && (
          (e.id.startsWith('router-') && e.target === currentStep?.agent) ||
          (e.id.endsWith('-finalize') && e.source === currentStep?.agent)
        ))
        if (shouldCheck && typeof nextLabel === 'string') {
          if (!nextLabel.trim().startsWith('✓')) nextLabel = `✓ ${nextLabel}`
        } else if (typeof nextLabel === 'string' && nextLabel.trim().startsWith('✓')) {
          nextLabel = nextLabel.replace(/^✓\s*/, '')
        }

        return {
          ...e,
          animated: Boolean(isActive),
          style: { ...(e.style || {}), ...nextStyle },
          label: nextLabel,
          data: {
            ...(e.data || {}),
            isActive,
            wasUsed,
            lastMessage: lastAt ? new Date(lastAt) : undefined,
            messageCount,
            onOpen: () => setSelectedExecution(exec),
          }
        }
      }))
    }

    // Initial update
    updateStyles()

    // Keep the active glow alive for a short time while streaming
    const mostRecentAt = Math.max(...Array.from(lastAtByPair.values()), execStart)
    const hasRecentActivity = (now - mostRecentAt) < ACTIVE_WINDOW

    let interval: any = null
    if (hasRecentActivity) {
      interval = setInterval(updateStyles, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentExecution, selectedExecution, currentStep, setEdges])

  return (
    <div className={`${className} touch-none overscroll-contain`}>
      <ReactFlow
  onInit={(inst) => { rfRef.current = inst }}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
  onNodeDragStop={onNodeDragStop}
  onNodesDelete={onNodesDelete}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={fitOnInit}
        fitViewOptions={{ padding: 0.15 }}
        // Mobile/touch optimizations
        panOnDrag
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        nodesConnectable={false}
        selectionOnDrag={false}
        minZoom={0.45}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <div className="hidden sm:block">
          <Controls />
        </div>
  <Background color="#f1f5f9" gap={14} />
  <div className="hidden sm:block">
  <MiniMap
          nodeColor={(node) => {
            const agent = node.data?.agent as AgentConfig
            return agent?.color || '#64748B'
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
  </div>

        {/* Status Panel */}
  <Panel position="top-left" className="hidden sm:block bg-white/90 p-2 rounded-md shadow max-w-xs w-64">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-gray-200 pb-1">
              <div className="text-xs font-semibold text-gray-800">
                Sistema Multi-Agente
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { try { rfRef.current?.fitView({ padding: 0.15 }) } catch (_) {} }}
                  className="text-[11px] h-6 px-2"
                  title="Fit"
                >
                  Fit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowLangChainFlow(!showLangChainFlow)}
                  className="text-[11px] h-6 px-2"
                >
                  {showLangChainFlow ? 'Ocultar' : 'Mostrar'} Flujo
                </Button>
                <Button
                  variant={minimalMode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMinimalMode(!minimalMode)}
                  className="text-[11px] h-6 px-2"
                  title="Minimal mode"
                >
                  Minimal
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resetGraphLayout()}
                  className="text-[11px] h-6 px-2"
                  title="Reset layout"
                >
                  Reset
                </Button>
              </div>
            </div>
            
            {/* Agent Thinking Visualizer */}
            {showLangChainFlow && (
              <div className="max-h-24 overflow-hidden scale-[0.95] origin-top-left">
                <AgentThinkingVisualizer 
                  currentStep={currentStep}
                  thoughts={agentThoughts}
                  isLive={isLive}
                />
              </div>
            )}
            
            {/* System Status */}
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-gray-700 uppercase tracking-wide">
                Estado del Sistema
              </div>
              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-mono text-green-600 font-semibold">
                    {executions.filter(e => e.status === 'running').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-mono text-blue-600 font-semibold">
                    {executions.filter(e => e.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-mono text-red-600 font-semibold">
                    {executions.filter(e => e.status === 'failed').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* LangChain Flow Visualizer Panel */}
        {showLangChainFlow && (
          <Panel position="top-right" className="bg-white p-4 rounded-lg shadow-lg max-w-md max-h-[80vh] overflow-y-auto">
            <LangChainFlowVisualizer 
              execution={currentExecution || selectedExecution}
              isVisible={showLangChainFlow}
            />
            <div className="mt-3">
              <ReasoningFlowPanel />
            </div>
          </Panel>
        )}

        {/* Tiny legend */}
        <Panel position="bottom-left" className="hidden sm:block bg-white/90 p-2 rounded-md shadow text-[10px]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-gray-400" /> Idle</div>
            <div className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-green-500" /> Running</div>
            <div className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-blue-500" /> Completed</div>
            <div className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-purple-500" /> Trail</div>
          </div>
        </Panel>

      </ReactFlow>

      {/* Execution Trace Modal */}
      {selectedExecution && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedExecution(null)
            }
          }}
        >
          <div 
            className="bg-background border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ExecutionTrace 
              execution={selectedExecution} 
              onClose={() => setSelectedExecution(null)} 
            />
          </div>
        </div>
      )}

      {/* Response full-screen modal */}
      {responseModal && (
        <ResponseModal 
          title={responseModal.title}
          content={responseModal.content}
          onClose={() => setResponseModal(null)}
        />
      )}

  {/* Real-time execution monitor */}
      <RealTimeExecutionMonitor />

    </div>
  )
}

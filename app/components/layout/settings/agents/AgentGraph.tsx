'use client'

/**
 * Agent Graph Component
 * Interactive visualization of the multi-agent system using React Flow
 */

import React, { useCallback, useMemo } from 'react'
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
import { AgentEdgeComponent } from './AgentEdge'
import { useClientAgentStore } from '@/lib/agents/client-store'
import { AgentConfig, AgentExecution } from '@/lib/agents/types'

// Define node types for React Flow
const nodeTypes = {
  agent: AgentNodeComponent,
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
  const { nodes: storeNodes, edges: storeEdges, agents, executions, executeAgent, selectAgent } = useClientAgentStore()

  // Convert our data to React Flow format
  const initialNodes: Node[] = useMemo(() => {
    return storeNodes.map(nodeData => ({
      id: nodeData.id,
      type: 'agent',
      position: nodeData.position,
      data: {
        ...nodeData.data,
        onExecute: (input: string) => executeAgent(input, nodeData.id)
      },
      style: {
        background: 'transparent',
        border: 'none',
      }
    }))
  }, [storeNodes, executeAgent])

  const initialEdges: Edge[] = useMemo(() => {
    return storeEdges.map(edgeData => ({
      id: edgeData.id,
      source: edgeData.source,
      target: edgeData.target,
      type: edgeData.type === 'handoff' ? 'handoff' : 'default',
      animated: edgeData.animated,
      label: edgeData.label,
      data: edgeData.data,
      style: {
        stroke: edgeData.type === 'handoff' ? '#FF6B6B' : '#64748B',
        strokeWidth: edgeData.type === 'handoff' ? 3 : 2,
      }
    }))
  }, [storeEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onNodeClick?.(node)
  }, [onNodeClick])

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    onEdgeClick?.(edge)
  }, [onEdgeClick])

  // Update nodes and edges when graph data changes
  React.useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  React.useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  return (
    <div className={className}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background color="#f1f5f9" gap={20} />
        <MiniMap
          nodeColor={(node) => {
            const agent = node.data?.agent as AgentConfig
            return agent?.color || '#64748B'
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />

        {/* Status Panel */}
        <Panel position="top-right">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
            <h3 className="font-semibold text-sm mb-2">System Status</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Active Agents:</span>
                <span className="font-mono">{agents.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Executions:</span>
                <span className="font-mono">{executions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Running:</span>
                <span className="font-mono text-green-600">
                  {executions.filter(e => e.status === 'running').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-mono text-blue-600">
                  {executions.filter(e => e.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Errors:</span>
                <span className="font-mono text-red-600">
                  {executions.filter(e => e.status === 'failed').length}
                </span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

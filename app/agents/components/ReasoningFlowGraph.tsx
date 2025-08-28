'use client'

import React, { useMemo } from 'react'
import ReactFlow, { Node, Edge, Background, Controls } from 'reactflow'
import 'reactflow/dist/style.css'
import { useRealTimeExecution } from '@/lib/agents/use-realtime-execution'

function StepNode({ data }: any) {
  const { label, status } = data as { label: string; status: 'past'|'current'|'future' }
  const color = status === 'current' ? 'border-blue-500 bg-blue-50' : status === 'past' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'
  return (
    <div className={`px-3 py-2 text-xs rounded-md border-2 shadow-sm ${color}`}>
      {label}
    </div>
  )
}

const nodeTypes = { step: StepNode }

export function ReasoningFlowGraph() {
  const { currentStep } = useRealTimeExecution()

  const steps = ['Analizando','Pensando','Delegando/Respondiendo','Completando']
  const currentIndex = currentStep ? (
    currentStep.action === 'analyzing' ? 0 :
    currentStep.action === 'thinking' ? 1 :
    currentStep.action === 'delegating' || currentStep.action === 'responding' ? 2 :
    currentStep.action === 'completing' ? 3 : -1
  ) : -1

  const nodes: Node[] = useMemo(() => steps.map((s, i) => ({
    id: `step_${i}`,
    type: 'step',
    position: { x: 40 + i * 170, y: 20 },
    data: {
      label: s,
      status: currentIndex < 0 ? 'future' : (i < currentIndex ? 'past' : i === currentIndex ? 'current' : 'future')
    }
  })), [currentIndex])

  const edges: Edge[] = useMemo(() => steps.slice(0, -1).map((_, i) => ({
    id: `e_${i}`,
    source: `step_${i}`,
    target: `step_${i+1}`,
    animated: i < currentIndex,
    style: { stroke: i < currentIndex ? '#10b981' : '#94a3b8' }
  })), [currentIndex])

  return (
    <div className="w-[720px] h-[120px]">
      <ReactFlow nodes={nodes} edges={edges} fitView nodeTypes={nodeTypes} panOnScroll={false} zoomOnScroll={false} zoomOnPinch={false} panOnDrag={false}>
        <Background color="#eef2f7" gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

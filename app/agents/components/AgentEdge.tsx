'use client'

/**
 * Agent Edge Component
 * Custom edge for visualizing handoffs between agents
 */

import React from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow'
import { Button } from '@/components/ui/button'

interface AgentEdgeData {
  messageCount?: number
  lastMessage?: Date | string
  errorCount?: number
  isActive?: boolean
  taskPreview?: string
  onOpen?: () => void
}

interface AgentEdgeProps extends EdgeProps {
  data?: AgentEdgeData
}

export function AgentEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style
}: AgentEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const { messageCount = 0, lastMessage, errorCount = 0, isActive = false, taskPreview, onOpen, /* extended */ wasUsed = false } = (data as any) || {}

  // Prefer style provided by graph; fallback by state
  const stroke = (style as any)?.stroke || (isActive ? '#22c55e' : (wasUsed ? '#8b5cf6' : '#64748B'))
  const strokeWidth = (style as any)?.strokeWidth || (isActive ? 4 : (wasUsed ? 3 : 2))
  const strokeDasharray = (style as any)?.strokeDasharray || (isActive || wasUsed ? '8 4' : '4 2')
  const opacity = (style as any)?.opacity ?? (isActive ? 1 : (wasUsed ? 0.95 : 0.85))

  return (
    <>
      {/* Base edge with dynamic style and subtle glow when active */}
      <BaseEdge path={edgePath} style={{ stroke, strokeWidth, opacity, strokeDasharray }} />

      {/* Edge Label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div 
            className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 shadow-sm border text-xs flex items-center gap-1 cursor-pointer hover:bg-white"
            onClick={() => onOpen?.()}
          >
            <span className="text-blue-600">📨</span>
            <span>{messageCount}</span>
            {errorCount > 0 && (
              <span className="text-red-500">({errorCount} err)</span>
            )}
      {lastMessage && (
              <span className="text-muted-foreground">
        {new Date(lastMessage as any).toLocaleTimeString()}
              </span>
            )}
            {taskPreview && (
              <span className="text-gray-600 max-w-[200px] truncate">{taskPreview}</span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>

      {/* Animated particles for active handoffs */}
      {(isActive || wasUsed || messageCount > 0) && (
        <circle
          r="3"
          fill={isActive ? '#22c55e' : '#8b5cf6'}
          className="animate-pulse"
        >
          <animateMotion
            dur={isActive ? '1.1s' : '2.4s'}
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
    </>
  )
}

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
  lastMessage?: Date
  errorCount?: number
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
  data
}: AgentEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const { messageCount = 0, lastMessage, errorCount = 0 } = data || {}

  return (
    <>
      <BaseEdge path={edgePath} />

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
          <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 shadow-sm border text-xs flex items-center gap-1">
            <span className="text-blue-600">📨</span>
            <span>{messageCount}</span>
            {errorCount > 0 && (
              <span className="text-red-500">({errorCount} err)</span>
            )}
            {lastMessage && (
              <span className="text-muted-foreground">
                {lastMessage.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>

      {/* Animated particles for active handoffs */}
      {messageCount > 0 && (
        <circle
          r="3"
          fill="#FF6B6B"
          className="animate-pulse"
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
    </>
  )
}

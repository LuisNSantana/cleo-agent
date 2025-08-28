'use client'

/**
 * Agent Node Component
 * Visual representation of an agent in the graph
 */

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { AgentConfig, ExecutionStatus } from '@/lib/agents/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface AgentNodeData {
  label: string
  agent: AgentConfig
  status: ExecutionStatus
  executionCount: number
  lastExecution?: Date
  connections: string[]
  onExecute: (input: string) => void
}

interface AgentNodeProps extends NodeProps {
  data: AgentNodeData
}

export function AgentNodeComponent({ data }: AgentNodeProps) {
  const { agent, status, executionCount, lastExecution, onExecute } = data

  const getStatusColor = (status: ExecutionStatus) => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'completed': return 'bg-blue-500'
      case 'failed': return 'bg-red-500'
      case 'paused': return 'bg-yellow-500'
      default: return 'bg-gray-400'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'supervisor': return '👑'
      case 'specialist': return '🔬'
      case 'worker': return '⚙️'
      case 'evaluator': return '📊'
      default: return '🤖'
    }
  }

  const handleExecute = () => {
    const input = prompt(`Ejecutar ${agent.name}:`)
    if (input) {
      onExecute(input)
    }
  }

  return (
    <Card className="w-64 shadow-lg border-2" style={{ borderColor: agent.color + '40' }}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getRoleIcon(agent.role)}</span>
            <h3 className="font-semibold text-sm">{agent.name}</h3>
          </div>
          <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {agent.description}
        </p>

        {/* Stats */}
        <div className="flex justify-between items-center mb-3">
          <Badge variant="secondary" className="text-xs">
            {executionCount} exec
          </Badge>
          {lastExecution && (
            <span className="text-xs text-muted-foreground">
              {lastExecution.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Tools */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {agent.tools.slice(0, 3).map((tool, index) => (
              <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                {tool}
              </Badge>
            ))}
            {agent.tools.length > 3 && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                +{agent.tools.length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button
          size="sm"
          className="w-full text-xs"
          style={{ backgroundColor: agent.color }}
          onClick={handleExecute}
        >
          Ejecutar
        </Button>

        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-blue-500"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-blue-500"
        />
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-green-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-green-500"
        />
      </CardContent>
    </Card>
  )
}

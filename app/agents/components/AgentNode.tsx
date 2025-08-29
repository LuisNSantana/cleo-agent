'use client'

/**
 * Agent Node Component
 * Visual representation of an agent in the graph
 */

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { AgentConfig, ExecutionStatus, AgentExecution } from '@/lib/agents/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, CheckCircle, XCircle, Play, Activity, Loader2, Zap } from 'lucide-react'
import { useClientAgentStore } from '@/lib/agents/client-store'

interface AgentNodeData {
  label: string
  agent: AgentConfig
  status: ExecutionStatus | 'trail'
  executionCount: number
  lastExecution?: Date
  connections: string[]
  onExecute: (input: string) => void
  onShowExecution?: (execution: AgentExecution) => void
  executions?: AgentExecution[]
}

interface AgentNodeProps extends NodeProps {
  data: AgentNodeData
}

export function AgentNodeComponent({ data }: AgentNodeProps) {
  const { currentExecution } = useClientAgentStore()
  const { agent, status, executionCount, lastExecution, onExecute, onShowExecution, executions = [] } = data
  
  // Check if this agent is currently active
  const isCurrentlyActive = currentExecution?.agentId === agent.id && currentExecution?.status === 'running'
  const isTrail = status === 'trail'

  const getStatusColor = (status: ExecutionStatus | 'trail') => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'completed': return 'bg-blue-500'
      case 'failed': return 'bg-red-500'
      case 'paused': return 'bg-yellow-500'
      case 'trail': return 'bg-purple-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    // Show active animation if this agent is currently processing
    if (isCurrentlyActive) {
      return <Loader2 className="size-3 text-blue-600 animate-spin" />
    }
    
    switch (status) {
      case 'running':
        return <Clock className="size-3 text-yellow-600" />
      case 'completed':
        return <CheckCircle className="size-3 text-green-600" />
      case 'failed':
        return <XCircle className="size-3 text-red-600" />
      default:
        return <Activity className="size-3 text-gray-600" />
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

  const recentExecutions = executions
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 3)

  const handleExecute = () => {
    const input = prompt(`Ejecutar ${agent.name}:`)
    if (input) {
      onExecute(input)
    }
  }

  return (
    <div className="relative">
      {/* Trail effect glow */}
      {isTrail && !isCurrentlyActive && (
        <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-purple-300/30 via-blue-300/30 to-purple-300/30 blur-sm" />
      )}
      
      <Card className={`w-64 shadow-lg border-2 transition-all duration-500 relative ${
        isCurrentlyActive 
          ? 'border-blue-400 shadow-blue-200 shadow-lg scale-105 bg-blue-700/10 dark:bg-blue-700/20 backdrop-blur'
          : status === 'trail'
          ? 'border-purple-300 shadow-purple-200 shadow-md bg-purple-700/10 dark:bg-purple-700/20 backdrop-blur'
          : 'bg-background'
      }`} style={{ 
        borderColor: isCurrentlyActive ? '#3b82f6' : status === 'trail' ? '#a855f7' : agent.color + '40' 
      }}>
      <CardContent className="p-4">
        {/* Active indicator */}
        {isCurrentlyActive && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-pulse">
            <Zap className="size-3" />
            ACTIVO
          </div>
        )}

        {/* Trail effect indicator */}
        {isTrail && !isCurrentlyActive && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-purple-600 text-white text-xs px-2 py-1 rounded-full shadow-lg">
            <CheckCircle className="size-3" />
            USADO
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getRoleIcon(agent.role)}</span>
            <h3 className="font-semibold text-sm text-foreground">{agent.name}</h3>
          </div>
          <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} ${
            isCurrentlyActive ? 'animate-pulse' : ''
          }`} />
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
              {lastExecution instanceof Date
                ? lastExecution.toLocaleTimeString()
                : new Date(lastExecution as any).toLocaleTimeString()}
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

        {/* Recent Executions */}
        {recentExecutions.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Recent Executions</h4>
            <div className="space-y-1">
              {recentExecutions.map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-1 rounded bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => onShowExecution?.(execution)}
                >
                  <div className="flex items-center gap-1">
                    {getStatusIcon(execution.status)}
                    <span className="text-xs text-gray-600 truncate">
                      {new Date(execution.startTime).toLocaleTimeString()}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {execution.messages.length}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          size="sm"
          className="w-full text-xs flex items-center gap-1 text-white hover:opacity-90"
          style={{ backgroundColor: agent.color || '#64748B' }}
          onClick={handleExecute}
        >
          <Play className="size-3" />
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
    </div>
  )
}

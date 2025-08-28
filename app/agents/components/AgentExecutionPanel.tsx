'use client'

/**
 * Agent Execution Panel
 * Detailed view of an agent execution with messages and metrics
 */

import React from 'react'
import { AgentExecution, AgentConfig, AgentMessage } from '@/lib/agents/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { XIcon, ClockIcon, CpuIcon, TriangleIcon } from '@phosphor-icons/react'

interface AgentExecutionPanelProps {
  execution: AgentExecution
  agents: AgentConfig[]
  onClose: () => void
}

export function AgentExecutionPanel({
  execution,
  agents,
  onClose
}: AgentExecutionPanelProps) {
  const agent = agents.find(a => a.id === execution.agentId)

  const getMessageIcon = (type: AgentMessage['type']) => {
    switch (type) {
      case 'human': return '👤'
      case 'ai': return '🤖'
      case 'system': return '⚙️'
      case 'tool': return '🔧'
      default: return '💬'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'running': return 'text-blue-600 bg-blue-100'
      case 'paused': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date()
    const duration = endTime.getTime() - start.getTime()
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <Card className="fixed inset-4 z-50 bg-white shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span>{agent?.name || execution.agentId}</span>
            <Badge className={getStatusColor(execution.status)}>
              {execution.status}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            ID: {execution.id}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Execution Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <ClockIcon className="size-5 mx-auto mb-1 text-blue-500" />
            <div className="text-sm font-medium">
              {formatDuration(execution.startTime, execution.endTime)}
            </div>
            <div className="text-xs text-muted-foreground">Duración</div>
          </div>

          <div className="text-center">
            <CpuIcon className="size-5 mx-auto mb-1 text-green-500" />
            <div className="text-sm font-medium">
              {execution.metrics.totalTokens.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Tokens</div>
          </div>

          <div className="text-center">
            <span className="text-lg">🔧</span>
            <div className="text-sm font-medium">
              {execution.metrics.toolCallsCount}
            </div>
            <div className="text-xs text-muted-foreground">Herramientas</div>
          </div>

          <div className="text-center">
            <span className="text-lg">🔄</span>
            <div className="text-sm font-medium">
              {execution.metrics.handoffsCount}
            </div>
            <div className="text-xs text-muted-foreground">Handoffs</div>
          </div>
        </div>

        {/* Error Display */}
        {execution.error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TriangleIcon className="size-4 text-red-600" />
                <span className="font-medium text-red-800">Error de Ejecución</span>
              </div>
              <p className="text-red-700 text-sm">{execution.error}</p>
            </CardContent>
          </Card>
        )}

        {/* Messages Timeline */}
        <div>
          <h3 className="font-medium mb-3">Timeline de Mensajes</h3>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {execution.messages.map((message, index) => (
                <div key={message.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                    {getMessageIcon(message.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {message.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {message.toolCalls.length} tools
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                      {message.content}
                    </div>
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="space-y-2">
                        {message.toolCalls.map((toolCall, toolIndex) => (
                          <div key={toolIndex} className="bg-blue-50 rounded-lg p-2 text-xs">
                            <div className="font-medium text-blue-800">
                              {toolCall.name}
                            </div>
                            {toolCall.args && Object.keys(toolCall.args).length > 0 && (
                              <pre className="text-blue-700 mt-1">
                                {JSON.stringify(toolCall.args, null, 2)}
                              </pre>
                            )}
                            {toolCall.result && (
                              <div className="mt-2 text-green-700">
                                Resultado: {JSON.stringify(toolCall.result)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Execution Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Información General</h4>
            <div className="space-y-1">
              <div><strong>Agente:</strong> {agent?.name || execution.agentId}</div>
              <div><strong>Inicio:</strong> {execution.startTime.toLocaleString()}</div>
              {execution.endTime && (
                <div><strong>Fin:</strong> {execution.endTime.toLocaleString()}</div>
              )}
              <div><strong>Estado:</strong> {execution.status}</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Métricas Detalladas</h4>
            <div className="space-y-1">
              <div><strong>Input Tokens:</strong> {execution.metrics.inputTokens.toLocaleString()}</div>
              <div><strong>Output Tokens:</strong> {execution.metrics.outputTokens.toLocaleString()}</div>
              <div><strong>Tiempo de Ejecución:</strong> {execution.metrics.executionTime}ms</div>
              <div><strong>Llamadas a Herramientas:</strong> {execution.metrics.toolCallsCount}</div>
              <div><strong>Handoffs:</strong> {execution.metrics.handoffsCount}</div>
              <div><strong>Errores:</strong> {execution.metrics.errorCount}</div>
              <div><strong>Costo:</strong> ${execution.metrics.cost.toFixed(4)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

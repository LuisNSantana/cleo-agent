'use client'

/**
 * Execution Trace Component
 * Shows the step-by-step execution flow of agent interactions
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AgentExecution, AgentMessage } from '@/lib/agents/types'
import { 
  User, 
  Bot, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  MessageSquare,
  Brain,
  Zap
} from 'lucide-react'

interface ExecutionTraceProps {
  execution: AgentExecution | null
  onClose: () => void
}

export function ExecutionTrace({ execution, onClose }: ExecutionTraceProps) {
  const [selectedMessage, setSelectedMessage] = useState<AgentMessage | null>(null)

  if (!execution) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="size-4 text-green-600" />
      case 'failed':
        return <XCircle className="size-4 text-red-600" />
      case 'running':
        return <Clock className="size-4 text-yellow-600 animate-spin" />
      default:
        return <Clock className="size-4 text-gray-400" />
    }
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'human':
        return <User className="size-4 text-blue-600" />
      case 'ai':
        return <Bot className="size-4 text-purple-600" />
      case 'tool':
        return <Zap className="size-4 text-orange-600" />
      default:
        return <MessageSquare className="size-4 text-gray-600" />
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="size-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Traza de Ejecución</CardTitle>
              <CardDescription className="text-sm">
                ID: {execution.id}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        
        {/* Execution Summary */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(execution.status)}
            <Badge variant={
              execution.status === 'completed' ? 'default' :
              execution.status === 'failed' ? 'destructive' :
              execution.status === 'running' ? 'secondary' : 'outline'
            }>
              {execution.status}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {execution.endTime && execution.startTime ? 
              formatDuration(execution.endTime.getTime() - execution.startTime.getTime()) :
              'En curso...'
            }
          </div>
          <div className="text-sm text-muted-foreground">
            {execution.messages.length} mensajes
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="trace" className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trace">Flujo</TabsTrigger>
            <TabsTrigger value="messages">Mensajes</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
          </TabsList>

          <TabsContent value="trace" className="mt-4">
            <div className="h-[400px] overflow-y-auto">
              <div className="space-y-3">
                {execution.messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                      selectedMessage?.id === message.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedMessage(selectedMessage?.id === message.id ? null : message)}
                  >
                    <div className="flex items-start gap-3">
                      {getMessageIcon(message.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {message.type === 'human' ? 'Usuario' :
                             message.type === 'ai' ? 'Agente IA' :
                             message.type === 'tool' ? 'Herramienta' : 'Sistema'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp as any).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {message.content}
                        </p>
                        {message.toolCalls && message.toolCalls.length > 0 && (
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {message.toolCalls.map((tool, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                🔧 {tool.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {index < execution.messages.length - 1 && (
                        <ArrowRight className="size-4 text-gray-400 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            <div className="h-[400px] overflow-y-auto">
              {selectedMessage ? (
                <div className="space-y-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedMessage(null)}
                    className="mb-2"
                  >
                    ← Volver a la lista
                  </Button>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        {getMessageIcon(selectedMessage.type)}
                        <CardTitle className="text-base">
                          {selectedMessage.type === 'human' ? 'Mensaje del Usuario' :
                           selectedMessage.type === 'ai' ? 'Respuesta del Agente' :
                           selectedMessage.type === 'tool' ? 'Resultado de Herramienta' : 'Mensaje del Sistema'}
                        </CardTitle>
                      </div>
                      <CardDescription>
                        {selectedMessage.timestamp.toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                          {selectedMessage.content}
                        </pre>
                      </div>
                      
                      {selectedMessage.metadata && Object.keys(selectedMessage.metadata).length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-sm mb-2">Metadata:</h4>
                          <pre className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                            {JSON.stringify(selectedMessage.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {selectedMessage.toolCalls && selectedMessage.toolCalls.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-sm mb-2">Tool Calls:</h4>
                          <div className="space-y-2">
                            {selectedMessage.toolCalls.map((tool, i) => (
                              <div key={i} className="bg-orange-50 p-2 rounded border">
                                <div className="flex items-center gap-2 mb-1">
                                  <Zap className="size-4 text-orange-600" />
                                  <span className="font-medium text-sm">{tool.name}</span>
                                </div>
                                <pre className="text-xs text-gray-600">
                                  {JSON.stringify(tool.args, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="space-y-2">
                  {execution.messages.map((message) => (
                    <div
                      key={message.id}
                      className="p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setSelectedMessage(message)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getMessageIcon(message.type)}
                        <Badge variant="outline" className="text-xs">
                          {message.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-1">
                        {message.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tiempo de Ejecución</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatDuration(execution.metrics.executionTime)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total de Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {execution.metrics.totalTokens.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {execution.metrics.inputTokens}↗ / {execution.metrics.outputTokens}↙
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tool Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {execution.metrics.toolCallsCount || 0}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Handoffs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {execution.metrics.handoffsCount || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

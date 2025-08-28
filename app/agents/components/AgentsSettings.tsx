'use client'

/**
 * Agents Settings Page
 * Main interface for managing and visualizing the multi-agent system
 */

import React, { useState } from 'react'
import { AgentGraph } from './AgentGraph'
import { AgentExecutionPanel } from './AgentExecutionPanel'
import { AgentControls } from './AgentControls'
import { useClientAgentStore } from '@/lib/agents/client-store'
import { AgentExecution, AgentConfig } from '@/lib/agents/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PlusIcon, PlayIcon, GearIcon } from '@phosphor-icons/react'

export function AgentsSettings() {
  const {
    agents,
    executions,
    currentExecution,
    metrics,
    executeAgent,
    isLoading,
    error
  } = useClientAgentStore()

  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null)
  const [selectedExecution, setSelectedExecution] = useState<AgentExecution | null>(null)
  const [quickInput, setQuickInput] = useState('')

  const handleExecuteQuick = async () => {
    if (!quickInput.trim()) return

    try {
      await executeAgent(quickInput)
      setQuickInput('')
    } catch (error) {
      console.error('Error executing agent:', error)
    }
  }

  const handleNodeClick = (node: any) => {
    const agent = agents.find(a => a.id === node.id)
    if (agent) {
      setSelectedAgent(agent)
    }
  }

  const handleExecutionSelect = (execution: AgentExecution) => {
    setSelectedExecution(execution)
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sistema Multi-Agente</h1>
          <p className="text-muted-foreground">
            Visualiza y gestiona la arquitectura LangChain de tus agentes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600">
            {metrics.activeAgents} agentes activos
          </Badge>
          <Badge variant="outline">
            {metrics.totalExecutions} ejecuciones totales
          </Badge>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Execute Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayIcon className="size-5" />
            Ejecución Rápida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ingresa una consulta para ejecutar con Cleo..."
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteQuick()}
              className="flex-1"
            />
            <Button
              onClick={handleExecuteQuick}
              disabled={isLoading || !quickInput.trim()}
            >
              {isLoading ? 'Ejecutando...' : 'Ejecutar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Graph Visualization */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GearIcon className="size-5" />
                Arquitectura de Agentes
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[600px]">
              <AgentGraph
                onNodeClick={handleNodeClick}
                className="w-full h-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <Tabs defaultValue="agents" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="agents">Agentes</TabsTrigger>
              <TabsTrigger value="executions">Ejecuciones</TabsTrigger>
            </TabsList>

            <TabsContent value="agents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Agentes Disponibles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedAgent?.id === agent.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{agent.name}</span>
                        <Badge
                          variant="outline"
                          style={{ borderColor: agent.color, color: agent.color }}
                        >
                          {agent.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {agent.description}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted-foreground">
                          {agent.tools.length} herramientas
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            const input = prompt(`Ejecutar ${agent.name}:`)
                            if (input) executeAgent(input, agent.id)
                          }}
                        >
                          <PlayIcon className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="executions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historial de Ejecuciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {executions.slice(-10).reverse().map((execution) => (
                    <div
                      key={execution.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedExecution?.id === execution.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedExecution(execution)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {agents.find(a => a.id === execution.agentId)?.name || execution.agentId}
                        </span>
                        <Badge
                          variant={
                            execution.status === 'completed' ? 'default' :
                            execution.status === 'failed' ? 'destructive' :
                            execution.status === 'running' ? 'secondary' : 'outline'
                          }
                        >
                          {execution.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {execution.startTime.toLocaleString()}
                      </p>
                      {execution.error && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {execution.error}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Execution Details Modal/Panel */}
      {selectedExecution && (
        <AgentExecutionPanel
          execution={selectedExecution}
          agents={agents}
          onClose={() => setSelectedExecution(null)}
        />
      )}
    </div>
  )
}

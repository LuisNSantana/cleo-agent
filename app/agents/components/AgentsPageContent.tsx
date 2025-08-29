'use client'

/**
 * Agents Page Content
 * Main content for the dedicated agents page
 */

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AgentGraph } from './AgentGraph'
import { AgentCreatorForm } from './AgentCreatorForm'
import { AgentExecutionPanel } from './AgentExecutionPanel'
import { DelegationTracker } from '../../../components/agents/delegation-tracker'
import { useClientAgentStore } from '@/lib/agents/client-store'
import { useAgentStore } from '@/lib/agents/agent-store'
import { AgentExecution, AgentConfig } from '@/lib/agents/types'
import { Play, Zap, Settings, Users, Cpu, Trash2, RefreshCw } from 'lucide-react'

export function AgentsPageContent() {
  const [mounted, setMounted] = useState(false)
  
  const {
    agents,
    executions,
    currentExecution,
    metrics,
    executeAgent,
    isLoading,
  error,
  initializeAgents,
  syncAgents,
  resetGraph
  } = useClientAgentStore()

  const [selectedAgent, setSelectedAgent] = React.useState<AgentConfig | null>(null)
  const [selectedExecution, setSelectedExecution] = React.useState<AgentExecution | null>(null)
  const [quickInput, setQuickInput] = React.useState('')
  const [activeTab, setActiveTab] = React.useState('graph')

  useEffect(() => {
    setMounted(true)
  // Ensure we sync runtime agents for the graph
  initializeAgents()
  }, [])

  // Listen for created agents from the visual form and focus them
  useEffect(() => {
    const onCreated = (e: any) => {
      const agent: AgentConfig = e.detail
      if (agent) {
        // ensure store has been updated already; set local selection and open details
        setSelectedAgent(agent)
        setActiveTab('details')
      }
    }

    window.addEventListener('agent:created', onCreated)
    return () => window.removeEventListener('agent:created', onCreated)
  }, [])

  if (!mounted) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando Sistema Multi-Agente...</p>
        </div>
      </div>
    )
  }

  const handleExecuteQuick = async () => {
    if (!quickInput.trim()) return

    try {
      await executeAgent(quickInput)
      setQuickInput('')
    } catch (error) {
      console.error('Error executing agent:', error)
    }
  }

  const handleCleanupAgents = async () => {
    try {
      // Call the cleanup endpoint to remove runtime agents
      const response = await fetch('/api/agents/cleanup', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to cleanup agents')
      }
      
      const result = await response.json()
      console.log('🧹 Cleanup result:', result)
      // Re-sync agents for the graph without full page reload
      await syncAgents()
      
    } catch (error) {
      console.error('Error cleaning up agents:', error)
    }
  }

  // removed refresh handler: cleanup triggers a sync afterwards

  const handleNodeClick = (node: any) => {
    const agent = agents.find(a => a.id === node.id)
    if (agent) {
      setSelectedAgent(agent)
      setActiveTab('details')
    }
  }

  const handleExecutionClick = (execution: AgentExecution) => {
    setSelectedExecution(execution)
    setActiveTab('execution')
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="size-6 text-blue-600" />
            Sistema Multi-Agente
          </h1>
          <p className="text-muted-foreground text-sm">
            Arquitectura LangChain/LangGraph
          </p>
        </div>
        <Badge variant="outline" className="px-2 py-1 text-xs">
          <Cpu className="size-3 mr-1" />
          {agents.length} Agentes
        </Badge>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="text-red-800 text-sm">
              <strong>Error:</strong> {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compact Execute Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Play className="size-4" />
            Ejecución Rápida
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Ingresa tu consulta..."
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteQuick()}
              className="flex-1"
            />
            <Button
              onClick={handleExecuteQuick}
              disabled={isLoading || !quickInput.trim()}
              size="sm"
            >
              {isLoading ? 'Ejecutando...' : 'Ejecutar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-2">
            <TabsTrigger value="graph" className="text-sm">Arquitectura</TabsTrigger>
            <TabsTrigger value="details" className="text-sm">Agentes</TabsTrigger>
            <TabsTrigger value="execution" className="text-sm">Ejecuciones</TabsTrigger>
            {/* Create tab: same look as others, but keep icon, label, "Nuevo" and stars */}
            <TabsTrigger value="create" className="text-sm flex items-center justify-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="font-semibold">Crear</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Nuevo</span>
              <span className="ml-0.5">✨</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="graph" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Grafo de Arquitectura Multi-Agente</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { resetGraph(); syncAgents() }}
                    className="flex items-center gap-2"
                    title="Refrescar nodos"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refrescar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCleanupAgents}
                    className="flex items-center gap-2"
                    title="Eliminar agentes creados (runtime)"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpiar Agentes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <AgentGraph
                onNodeClick={handleNodeClick}
                className="w-full h-[450px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Agente</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAgent ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{selectedAgent.icon}</div>
                    <div>
                      <h3 className="text-xl font-semibold">{selectedAgent.name}</h3>
                      <p className="text-muted-foreground">{selectedAgent.description}</p>
                      <Badge variant="outline" className="mt-2">
                        {selectedAgent.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <strong>Modelo:</strong> {selectedAgent.model}
                    </div>
                    <div>
                      <strong>Temperatura:</strong> {selectedAgent.temperature}
                    </div>
                    <div>
                      <strong>Tokens Máx:</strong> {selectedAgent.maxTokens}
                    </div>
                    <div>
                      <strong>Herramientas:</strong> {selectedAgent.tools.length}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Selecciona un agente del grafo para ver sus detalles</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

                <TabsContent value="execution" className="space-y-4">
          {selectedExecution ? (
            <AgentExecutionPanel
              execution={selectedExecution}
              agents={agents}
              onClose={() => setSelectedExecution(null)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Ejecuciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {executions.slice(-10).reverse().map((execution) => (
                      <div
                        key={execution.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => handleExecutionClick(execution)}
                      >
                        <div>
                          <div className="font-medium">
                            {agents.find(a => a.id === execution.agentId)?.name || execution.agentId}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {execution.startTime.toLocaleString()}
                          </div>
                        </div>
                        <Badge variant={execution.status === 'completed' ? 'default' : 'secondary'}>
                          {execution.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <DelegationTracker />
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <AgentCreatorForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}

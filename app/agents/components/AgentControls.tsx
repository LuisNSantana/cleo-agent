'use client'

/**
 * Agent Controls Component
 * Additional controls for managing agents
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useClientAgentStore } from '@/lib/agents/client-store'
import { AgentConfig, AgentRole } from '@/lib/agents/types'
import { PlusIcon, FloppyDiskIcon, TrashIcon } from '@phosphor-icons/react'

interface AgentControlsProps {
  selectedAgent?: AgentConfig | null
  onAgentUpdate?: (agent: AgentConfig) => void
}

export function AgentControls({ selectedAgent, onAgentUpdate }: AgentControlsProps) {
  const { executeAgent } = useClientAgentStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newAgent, setNewAgent] = useState<Partial<AgentConfig>>({
    name: '',
    description: '',
    role: 'specialist',
    model: 'langchain:balanced',
    temperature: 0.7,
    maxTokens: 4096,
    tools: [],
    prompt: '',
    color: '#64748B',
    icon: '🤖'
  })

  const handleCreateAgent = () => {
    setIsCreating(true)
    // Reset form
    setNewAgent({
      name: '',
      description: '',
      role: 'specialist',
      model: 'langchain:balanced',
      temperature: 0.7,
      maxTokens: 4096,
      tools: [],
      prompt: '',
      color: '#64748B',
      icon: '🤖'
    })
  }

  const handleSaveAgent = () => {
    if (!newAgent.name || !newAgent.description) return

    const agent: AgentConfig = {
      id: `custom_${Date.now()}`,
      name: newAgent.name!,
      description: newAgent.description!,
      role: newAgent.role as AgentRole,
      model: newAgent.model!,
      temperature: newAgent.temperature!,
      maxTokens: newAgent.maxTokens!,
      tools: newAgent.tools || [],
      prompt: newAgent.prompt || '',
      color: newAgent.color!,
      icon: newAgent.icon!
    }

    // Here you would typically save to a backend
    console.log('Creating agent:', agent)
    setIsCreating(false)
    onAgentUpdate?.(agent)
  }

  const handleQuickTest = async () => {
    if (!selectedAgent) return

    const testInput = prompt(`Probar ${selectedAgent.name}:`)
    if (testInput) {
      try {
        await executeAgent(testInput, selectedAgent.id)
      } catch (error) {
        console.error('Error testing agent:', error)
      }
    }
  }

  if (isCreating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusIcon className="size-5" />
            Crear Nuevo Agente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={newAgent.name}
                onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del agente"
              />
            </div>
            <div>
              <Label htmlFor="role">Rol</Label>
              <Select
                value={newAgent.role}
                onValueChange={(value) => setNewAgent(prev => ({ ...prev, role: value as AgentRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="specialist">Especialista</SelectItem>
                <SelectItem value="worker">Trabajador</SelectItem>
                <SelectItem value="evaluator">Evaluador</SelectItem>
              </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={newAgent.description}
              onChange={(e) => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe qué hace este agente"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model">Modelo</Label>
              <Select
                value={newAgent.model}
                onValueChange={(value) => setNewAgent(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="langchain:balanced">Balanced</SelectItem>
                <SelectItem value="langchain:fast">Fast</SelectItem>
              </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="temperature">Temperatura</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={newAgent.temperature}
                onChange={(e) => setNewAgent(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="prompt">Prompt del Sistema</Label>
            <Textarea
              id="prompt"
              value={newAgent.prompt}
              onChange={(e) => setNewAgent(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Prompt que define el comportamiento del agente"
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveAgent} className="flex-1">
              <FloppyDiskIcon className="size-4 mr-2" />
              Crear Agente
            </Button>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controles de Agentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleCreateAgent} className="w-full">
          <PlusIcon className="size-4 mr-2" />
          Crear Nuevo Agente
        </Button>

        {selectedAgent && (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">{selectedAgent.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {selectedAgent.description}
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline">{selectedAgent.role}</Badge>
                <Badge variant="outline">{selectedAgent.model}</Badge>
                <Badge variant="outline">{selectedAgent.tools.length} tools</Badge>
              </div>
              <Button onClick={handleQuickTest} size="sm">
                Probar Agente
              </Button>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>• Crea agentes especializados para tareas específicas</p>
          <p>• Configura prompts y herramientas personalizadas</p>
          <p>• Prueba agentes en tiempo real</p>
        </div>
      </CardContent>
    </Card>
  )
}

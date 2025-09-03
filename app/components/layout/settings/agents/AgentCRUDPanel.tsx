'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  BrainIcon,
  RobotIcon
} from '@phosphor-icons/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AgentConfig, AgentRole } from '@/lib/agents/types'
import Image from 'next/image'
import { useModel } from '@/lib/model-store/provider'

interface AgentCRUDPanelProps {
  agents: AgentConfig[]
  onCreateAgent: (agent: Partial<AgentConfig>) => void
  onUpdateAgent: (id: string, agent: Partial<AgentConfig>) => void
  onDeleteAgent: (id: string) => void
}

export function AgentCRUDPanel({ agents, onCreateAgent, onUpdateAgent, onDeleteAgent }: AgentCRUDPanelProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    role: 'specialist' as AgentRole,
  specialization: 'technical' as 'technical' | 'creative' | 'logical' | 'research' | 'custom',
    prompt: 'You are a helpful AI assistant.',
    description: '',
    tags: [] as string[],
    tools: [] as string[],
  model: '',
    temperature: 0.7,
    maxTokens: 2000,
    color: '#8B5CF6',
    icon: 'brain'
  })

  const resetForm = () => {
    setFormData({
      name: '',
      role: 'specialist' as AgentRole,
  specialization: 'technical',
      prompt: 'You are a helpful AI assistant.',
      description: '',
      tags: [],
      tools: [],
  model: '',
      temperature: 0.7,
      maxTokens: 2000,
      color: '#8B5CF6',
      icon: 'brain'
    })
  }

  const handleCreate = () => {
    if (!formData.name || !formData.role) return
    
    onCreateAgent({
      ...formData,
      id: `agent-${Date.now()}`
    })
    
    setIsCreateDialogOpen(false)
    resetForm()
  }

  const handleEdit = (agent: AgentConfig) => {
    setEditingAgent(agent)
    setFormData({
      name: agent.name || '',
      role: agent.role || 'specialist',
      specialization: (agent.tags?.includes('technical') || agent.tags?.includes('técnico')) ? 'technical'
        : (agent.tags?.includes('creative') || agent.tags?.includes('creativo')) ? 'creative'
        : (agent.tags?.includes('logical') || agent.tags?.includes('lógico')) ? 'logical'
        : (agent.tags?.includes('research') || agent.tags?.includes('investigación')) ? 'research'
        : 'custom',
      prompt: agent.prompt || 'You are a helpful AI assistant.',
      description: agent.description || '',
      tags: agent.tags || [],
      tools: agent.tools || [],
      model: agent.model || 'gpt-4',
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 2000,
      color: agent.color || '#8B5CF6',
      icon: agent.icon || 'brain'
    })
  }

  const handleUpdate = () => {
    if (!editingAgent?.id || !formData.name || !formData.role) return
    
    onUpdateAgent(editingAgent.id, formData)
    setEditingAgent(null)
    resetForm()
  }

  const handleDelete = (id: string) => {
    onDeleteAgent(id)
    setDeleteConfirm(null)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Models context
  const { models } = useModel()

  // Helpers for enriched role/tag display
  const getSpecificRoleLabel = (agent: AgentConfig): { label: string; colorClass: string } => {
    const name = (agent.name || '').toLowerCase()
    if (agent.role === 'supervisor') return { label: 'Supervisor', colorClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30' }
    if (name.includes('toby')) return { label: 'Technical Specialist', colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
    if (name.includes('ami')) return { label: 'Creative Specialist', colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    if (name.includes('peter')) return { label: 'Logical Analyst', colorClass: 'bg-lime-500/20 text-lime-300 border-lime-500/30' }
    const tags = (agent.tags || []).map(t => t.toLowerCase())
    if (tags.some(t => ['technical','técnico','datos'].includes(t))) return { label: 'Technical Specialist', colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
    if (tags.some(t => ['creative','creativo','diseño','contenido'].includes(t))) return { label: 'Creative Specialist', colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    if (tags.some(t => ['logical','lógico','matemática','matemático'].includes(t))) return { label: 'Logical Analyst', colorClass: 'bg-lime-500/20 text-lime-300 border-lime-500/30' }
    if (agent.role === 'evaluator') return { label: 'Evaluator', colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
    if (agent.role === 'worker') return { label: 'Worker', colorClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
    return { label: 'Specialist', colorClass: 'bg-violet-500/20 text-violet-300 border-violet-500/30' }
  }

  const AgentForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">Básico</TabsTrigger>
        <TabsTrigger value="prompt">Prompt</TabsTrigger>
        <TabsTrigger value="config">Config</TabsTrigger>
      </TabsList>
      
      <TabsContent value="basic" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Agente</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Mi Agente Especializado"
            className="bg-white/10 border-white/20"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select
              value={formData.role}
              onValueChange={(v) => handleInputChange('role', v as AgentRole)}
            >
              <SelectTrigger id="role" className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-700">
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="specialist">Specialist</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="evaluator">Evaluator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.role === 'specialist' && (
            <div className="space-y-2">
              <Label htmlFor="specialization">Especialización</Label>
              <Select
                value={formData.specialization}
                onValueChange={(v) => {
                  // Map specialization to helpful default tags
                  const spec = v as typeof formData.specialization
                  let specTags: string[] = []
                  if (spec === 'technical') specTags = ['technical', 'análisis', 'datos']
                  if (spec === 'creative') specTags = ['creative', 'diseño', 'contenido']
                  if (spec === 'logical') specTags = ['logical', 'matemática', 'algoritmo']
                  if (spec === 'research') specTags = ['research', 'investigación']
                  handleInputChange('specialization', spec)
                  // Merge unique tags while keeping any user-defined
                  handleInputChange('tags', Array.from(new Set([...(formData.tags || []), ...specTags])))
                }}
              >
                <SelectTrigger id="specialization" className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Selecciona una especialización" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 text-white border-slate-700">
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="logical">Logical</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe las capacidades y propósito de este agente..."
            className="bg-white/10 border-white/20 min-h-[100px]"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (separados por comas)</Label>
          <Input
            id="tags"
            value={formData.tags.join(', ')}
            onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            placeholder="análisis, escritura, código..."
            className="bg-white/10 border-white/20"
          />
        </div>
      </TabsContent>
      
      <TabsContent value="prompt" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">System Prompt</Label>
          <Textarea
            id="prompt"
            value={formData.prompt}
            onChange={(e) => handleInputChange('prompt', e.target.value)}
            placeholder="Eres un asistente especializado en..."
            className="bg-white/10 border-white/20 min-h-[200px]"
          />
        </div>
      </TabsContent>
      
      <TabsContent value="config" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Select
              value={formData.model}
              onValueChange={(v) => handleInputChange('model', v)}
            >
              <SelectTrigger id="model" className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder={models.length ? 'Selecciona un modelo' : 'Cargando modelos...'} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-700 max-h-64">
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
              className="bg-white/10 border-white/20"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input
            id="maxTokens"
            type="number"
            value={formData.maxTokens}
            onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
            className="bg-white/10 border-white/20"
          />
        </div>
      </TabsContent>
    </Tabs>
  )

  const getAgentAvatar = (name?: string) => {
    const key = name?.toLowerCase() || ''
    if (key.includes('toby')) return '/img/agents/toby4.png'
    if (key.includes('ami')) return '/img/agents/ami4.png'
    if (key.includes('peter')) return '/img/agents/peter4.png'
    if (key.includes('cleo')) return '/img/agents/logocleo4.png'
    return null
  }

  return (
  <div className="space-y-6 w-full max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Centro de Control de Agentes
          </h2>
          <p className="text-slate-400 mt-1">Administra y configura tus agentes de IA</p>
        </div>
        
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 border-0"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Crear Agente
        </Button>
      </div>

      {/* Agents Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 w-full">
        <AnimatePresence>
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Card className="h-full bg-slate-800/50 border-slate-700/50 hover:border-violet-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-violet-500/10 relative overflow-hidden">
                {/* Enhanced background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                <div className="relative z-10">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Enhanced Avatar with better resolution */}
                      <div className="relative group">
                        <Avatar className="h-16 w-16 rounded-xl ring-2 ring-slate-600/50 group-hover:ring-violet-400/50 transition-all duration-300 group-hover:scale-105">
                          {getAgentAvatar(agent.name) ? (
                            <AvatarImage 
                              src={getAgentAvatar(agent.name)!} 
                              alt={agent.name}
                              className="object-cover rounded-xl"
                            />
                          ) : null}
                          <AvatarFallback className="rounded-xl text-lg" style={{ backgroundColor: agent.color }}>
                            <BrainIcon className="w-8 h-8 text-white" />
                          </AvatarFallback>
                        </Avatar>
                        {/* Subtle glow effect on hover */}
                        <div 
                          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"
                          style={{ backgroundColor: agent.color }}
                        />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg text-white mb-1">{agent.name}</CardTitle>
                        <div className="mb-2">
                          {(() => { const info = getSpecificRoleLabel(agent); return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${info.colorClass}`}>
                              {info.label}
                            </span>
                          )})()}
                        </div>
                        {agent.description && (
                          <p className="text-xs text-slate-400 line-clamp-1">{agent.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {agent.tags && agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
                      {agent.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs bg-slate-700/60 text-slate-200 border border-slate-600/60">
                          {tag}
                        </Badge>
                      ))}
                      {agent.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs bg-slate-700/60 text-slate-200 border border-slate-600/60">
                          +{agent.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <div className="text-xs text-slate-400">
                      <span className="font-medium">{agent.model}</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(agent)}
                        className="h-8 w-8 p-0 hover:bg-violet-500/20"
                      >
                        <PencilIcon className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirm(agent.id!)}
                        className="h-8 w-8 p-0 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
                </div> {/* Close relative z-10 wrapper */}
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center">
              <RobotIcon className="w-5 h-5 mr-2 text-violet-400" />
              Crear Nuevo Agente
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <AgentForm />
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  resetForm()
                }}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.name || !formData.role || !formData.model}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              >
                Crear Agente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={(open) => !open && setEditingAgent(null)}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center">
              <PencilIcon className="w-5 h-5 mr-2 text-violet-400" />
              Editar Agente
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <AgentForm isEdit={true} />
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingAgent(null)
                  resetForm()
                }}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!formData.name || !formData.role || !formData.model}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              >
                Actualizar Agente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-400">Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          
          <p className="text-slate-300">
            ¿Estás seguro de que deseas eliminar este agente? Esta acción no se puede deshacer.
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AgentCRUDPanel

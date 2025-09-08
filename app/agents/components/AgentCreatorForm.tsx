 'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Sparkles } from 'lucide-react'
import { useClientAgentStore } from '@/lib/agents/client-store'
import { AgentConfig, AgentRole } from '@/lib/agents/types'

export function AgentCreatorForm() {
  const addAgent = useClientAgentStore(state => state.addAgent)
  const selectAgent = useClientAgentStore(state => state.selectAgent)

  const [form, setForm] = useState<Partial<AgentConfig>>({
    name: '',
    description: '',
    role: 'specialist',
  model: 'langchain:balanced-local',
    temperature: 0.7,
    maxTokens: 4096,
    tools: [],
    prompt: '',
    color: '#64748B',
    icon: '🤖'
  })

  const [stopInput, setStopInput] = useState('')
  const [tagInput, setTagInput] = useState('')

  const availableTools = [
    'delegate_to_toby',
    'delegate_to_ami',
    'delegate_to_peter',
    'delegate_to_apu',
    'analyze_emotion',
    'provide_support',
    'webSearch',
    'complete_task',
    'randomFact',
    'calculator',
    // Google Workspace Tools
    'listCalendarEvents',
    'createCalendarEvent',
    'listDriveFiles',
    'createGoogleDoc',
    'readGoogleDoc',
    'updateGoogleDoc',
    'createGoogleSheet',
    'readGoogleSheet',
    'updateGoogleSheet',
    'appendGoogleSheet',
    'listGmailMessages',
    'sendGmailMessage',
    // SerpAPI Tools - Research & Search
    'serpGeneralSearch',
    'serpNewsSearch',
    'serpScholarSearch',
    'serpAutocomplete',
    'serpLocationSearch',
    'serpRaw'
  ]

  const cloneToby = () => {
    // Lightweight Toby template
    setForm({
      name: 'Toby Clone',
      description: 'Especialista técnico — análisis y procesamiento de datos',
      role: 'specialist',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 8192,
      tools: ['webSearch', 'complete_task'],
      prompt: `Eres Toby, el especialista técnico. Proporciona análisis detallados y referencias cuando sea necesario.`,
      color: '#4ECDC4',
      icon: '🔬'
    })
  }

  const handleCreate = async () => {
    if (!form.name || !form.description) return

    const agent: AgentConfig = {
      id: `custom_${Date.now()}`,
      name: form.name!,
      description: form.description!,
      role: form.role as AgentRole,
      model: form.model || 'gpt-4o-mini',
      temperature: form.temperature ?? 0.7,
      maxTokens: form.maxTokens ?? 4096,
      tools: form.tools || [],
      prompt: form.prompt || '',
      color: form.color || '#64748B',
      icon: form.icon || '🤖',
      objective: form.objective,
      customInstructions: form.customInstructions,
      memoryEnabled: form.memoryEnabled,
      memoryType: form.memoryType,
      stopConditions: form.stopConditions,
      toolSchemas: form.toolSchemas,
      tags: form.tags
    }

    // add locally for instant UX
    addAgent(agent)
    selectAgent(agent)

    // notify server orchestrator to register runtime agent
    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent)
      })
      const data = await res.json()
      if (!data || !data.success) {
        console.warn('Server failed to register agent:', data?.error)
      }
    } catch (err) {
      console.error('Failed to call /api/agents/register', err)
    }

    // Dispatch global event so parent page can switch tabs / focus
    try {
      window.dispatchEvent(new CustomEvent('agent:created', { detail: agent }))
    } catch (e) {
      // ignore in non-browser env
    }

    // keep a small visual feedback by clearing name/setting created suffix
    setForm(prev => ({ ...prev, name: prev.name ? `${prev.name} (creado)` : '' }))
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">🤖✨</span>
          Crear Agente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Construye un agente que aparecerá en el grafo interactivo.</div>
          {/* <Button size="sm" variant="ghost" onClick={cloneToby}>Clonar Toby</Button> */}
        </div>

        {/* Basic row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ej: Toby Pro" className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Rol</Label>
            <Select value={form.role} onValueChange={(v) => setForm(prev => ({ ...prev, role: v as AgentRole }))}>
              <SelectTrigger className="h-9">
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

        <div className="space-y-2">
          <Label className="text-sm font-medium">Descripción</Label>
          <Textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={2} className="resize-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Modelo</Label>
            <Select value={form.model} onValueChange={(v) => setForm(prev => ({ ...prev, model: v }))}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="langchain:balanced-local">Balanced + Local (Cleo Llama v1)</SelectItem>
                <SelectItem value="gpt-5-mini">gpt5-mini</SelectItem>
                <SelectItem value="ollama:llama3.1:8b">Llama 3.1 8B (Ollama)</SelectItem>
                <SelectItem value="cleo-llama-38b">Cleo llama 38b (legacy)</SelectItem>
                <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                <SelectItem value="langchain:balanced">Balanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Temperatura</Label>
            <Input type="number" min={0} max={2} step={0.1} value={form.temperature as any} onChange={(e) => setForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Máx Tokens</Label>
            <Input 
              type="number" 
              value={form.maxTokens as any} 
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0
                setForm(prev => ({ ...prev, maxTokens: value }))
              }} 
              className="h-9" 
            />
          </div>
        </div>

        {/* MOST IMPORTANT: System Prompt */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Prompt del Sistema</Label>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Importante</span>
          </div>
          <Textarea value={form.prompt} onChange={(e) => setForm(prev => ({ ...prev, prompt: e.target.value }))} rows={4} className="resize-none" placeholder="Describe el comportamiento esperado del agente. Ej: Eres Toby, especialista técnico..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Objetivo (High-level)</Label>
            <Input value={form.objective as any || ''} onChange={(e) => setForm(prev => ({ ...prev, objective: e.target.value }))} placeholder="Objetivo principal del agente" className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Instrucciones Personalizadas</Label>
            <Input value={form.customInstructions as any || ''} onChange={(e) => setForm(prev => ({ ...prev, customInstructions: e.target.value }))} placeholder="Reglas adicionales o restricciones" className="h-9" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Memoria</Label>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.memoryEnabled} onChange={(e) => setForm(prev => ({ ...prev, memoryEnabled: e.target.checked }))} /> Habilitar</label>
              <Select value={form.memoryType || 'none'} onValueChange={(v) => setForm(prev => ({ ...prev, memoryType: v as any }))}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna</SelectItem>
                  <SelectItem value="short_term">Corto Plazo</SelectItem>
                  <SelectItem value="long_term">Largo Plazo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Stop Conditions</Label>
            <div className="flex gap-2">
              <Input value={stopInput} onChange={(e) => setStopInput(e.target.value)} placeholder="token o regex" className="h-8" />
              <Button size="sm" variant="outline" className="h-8" onClick={() => {
                if (!stopInput.trim()) return
                setForm(prev => ({ ...prev, stopConditions: [...(prev.stopConditions || []), stopInput.trim()] }))
                setStopInput('')
              }}>Añadir</Button>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {(form.stopConditions || []).map((s, i) => (
                <div key={i} className="px-2 py-1 rounded bg-muted text-xs">{s}</div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Tags</Label>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Clave para delegación</span>
            </div>
            <div className="flex gap-2">
              <Input 
                value={tagInput} 
                onChange={(e) => setTagInput(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (!tagInput.trim()) return
                    setForm(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }))
                    setTagInput('')
                  }
                }}
                placeholder="ej: analytics, search, technical" 
                className="h-8" 
              />
              <Button size="sm" className="h-8" onClick={() => {
                if (!tagInput.trim()) return
                setForm(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }))
                setTagInput('')
              }}>Añadir</Button>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {(form.tags || []).map((t, i) => (
                <div key={i} className="px-2 py-1 rounded bg-muted text-xs cursor-pointer" onClick={() => setForm(prev => ({ ...prev, tags: (prev.tags || []).filter((_, idx) => idx !== i) }))}>{t} ×</div>
              ))}
            </div>
          </div>
        </div>

        {/* Tools - Important */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Herramientas</Label>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Importante</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {availableTools.map(t => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(form.tools || []).includes(t)}
                  onChange={(e) => {
                    const set = new Set(form.tools || [])
                    if (e.target.checked) set.add(t)
                    else set.delete(t)
                    setForm(prev => ({ ...prev, tools: Array.from(set) }))
                  }}
                />
                <span className="capitalize">{t.replace('-', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <Input type="color" value={form.color} onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))} className="h-10 w-16 p-1 border rounded" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Icono</Label>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Selector</span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {['🤖','🧠','🔬','🛠️','📊','🔎','📚','🧪','🛰️','⚙️','📝','💡','🕵️','🧩','🐍','🦾'].map((ico) => (
                <button
                  key={ico}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, icon: ico }))}
                  className={`h-8 w-8 rounded-md border flex items-center justify-center text-base transition-colors ${form.icon === ico ? 'border-blue-500 bg-blue-50' : 'hover:bg-muted'}`}
                  title={ico}
                >
                  {ico}
                </button>
              ))}
            </div>
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Icono personalizado</Label>
              <Input value={form.icon} onChange={(e) => setForm(prev => ({ ...prev, icon: e.target.value }))} placeholder="Ej: 🤖" className="h-9 mt-1" />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shadow-sm" style={{ backgroundColor: form.color }}>{form.icon}</div>
            <div className="flex-1">
              <div className="font-medium">{form.name || 'Nombre del agente'}</div>
              <div className="text-sm text-muted-foreground line-clamp-2">{form.description || 'Descripción del agente'}</div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>{form.model}</span>
                <span>Temp: {form.temperature}</span>
                <span>{(form.tools || []).length} herramientas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleCreate}
            disabled={!form.name?.trim() || !form.description?.trim()}
            className="group relative inline-flex items-center justify-center gap-2 flex-1 h-12 px-6 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-base font-medium shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Crear agente"
          >
            <Sparkles className="size-5" />
            Crear Agente
          </Button>
          <Button variant="outline" onClick={() => setForm({ name: '', description: '', role: 'specialist', model: 'langchain:balanced-local', temperature: 0.7, maxTokens: 4096, tools: [], prompt: '', color: '#64748B', icon: '🤖' })}>Limpiar</Button>
        </div>
      </CardContent>
    </Card>
  )
}

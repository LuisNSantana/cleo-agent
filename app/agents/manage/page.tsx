'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { AgentCRUDPanel } from '@/app/components/layout/settings/agents/AgentCRUDPanel'
import { ShopifyCredentialsManager, SkyvernCredentialsManager, NotionCredentialsManager } from '@/components/common/CredentialsManager'
import { TwitterCredentialsManager } from '@/components/twitter/twitter-credentials-manager'
import dynamic from 'next/dynamic'
const SerpapiCredentialsManager = dynamic(()=>import('@/components/serpapi/serpapi-credentials-manager').then(m=>m.SerpapiCredentialsManager), { ssr:false })
import { useClientAgentStore } from '@/lib/agents/client-store'
import { PlusIcon, RobotIcon, GearSix, Key, Users } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type Section = 'agents' | 'credentials'

export default function AgentsManagePage() {
  const [activeSection, setActiveSection] = useState<Section>('agents')
  const {
    agents,
    addAgent,
    updateAgent,
    deleteAgent,
    syncAgents
  } = useClientAgentStore()

  const sidebarItems = [
    {
      id: 'agents' as Section,
      label: 'Manage Agents',
      icon: Users,
      description: 'Create, edit, and organize your specialized agents'
    },
    {
      id: 'credentials' as Section,
      label: 'Credentials',
      icon: Key,
      description: 'Manage API keys and credentials for external services'
    }
  ]

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <aside className="w-80 border-r border-border/40 bg-muted/20 p-6 hidden lg:block">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Agent Management</h2>
            <p className="text-sm text-muted-foreground">
              Configure and manage your AI agents and their integrations
            </p>
          </div>

          <nav className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
                    isActive
                      ? 'bg-primary/10 border border-primary/20 text-primary'
                      : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                  </div>
                </button>
              )
            })}
          </nav>

          {/* Quick Stats */}
          <div className="pt-4 border-t border-border/40">
            <div className="text-xs text-muted-foreground mb-2">Overview</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Agents</span>
                <span className="text-sm font-medium">{agents.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Credentials</span>
                <span className="text-sm font-medium">5</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <div className="lg:hidden border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-[calc(var(--app-header-height)+var(--agents-subnav-height))] z-30">
        <div className="flex">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 px-2 text-center transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {activeSection === 'agents' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-6xl mx-auto space-y-6"
          >
            {/* Agents Management Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">Manage Agents</h1>
                  <p className="text-muted-foreground mt-1">
                    Create, edit, and organize your specialized agents. Keep things simple and focused.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {agents.length} agent{agents.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <AgentCRUDPanel
                agents={agents}
                onCreateAgent={async (agent) => {
                  try {
                    // Ensure we only send UUIDs for parentAgentId
                    const isUUID = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)
                    const parentAgentId = isUUID((agent as any).parentAgentId) ? (agent as any).parentAgentId : undefined
                    const res = await fetch('/api/agents?includeSubAgents=1', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'same-origin',
                      body: JSON.stringify({
                        name: agent.name,
                        description: agent.description || '',
                        role: agent.role,
                        model: agent.model,
                        temperature: agent.temperature,
                        maxTokens: agent.maxTokens,
                        color: agent.color,
                        icon: agent.icon,
                        tags: agent.tags || [],
                        tools: agent.tools || [],
                        systemPrompt: agent.prompt,
                        parentAgentId
                      })
                    })
                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                    const data = await res.json()
                    if (data?.agent) {
                      addAgent({
                        id: data.agent.id,
                        name: data.agent.name,
                        description: data.agent.description,
                        role: data.agent.role,
                        model: data.agent.model,
                        temperature: data.agent.temperature,
                        maxTokens: data.agent.maxTokens,
                        tools: data.agent.tools,
                        prompt: data.agent.prompt,
                        color: data.agent.color,
                        icon: data.agent.icon,
                        tags: data.agent.tags,
                        isSubAgent: data.agent.isSubAgent,
                        parentAgentId: data.agent.parentAgentId || ''
                      })
                      // Auto-sync to ensure any server-side derived fields are reflected (and other tabs updated)
                      try {
                        await syncAgents()
                        toast({ title: 'Agente creado', description: 'Se sincronizó tu lista de agentes.', status: 'success' })
                      } catch (_) {
                        // If sync fails silently, at least show success for creation
                        toast({ title: 'Agente creado', description: 'El agente fue creado. (Sincronización diferida)', status: 'success' })
                      }
                    }
                  } catch (e) {
                    console.error('Create agent failed:', e)
                    // Best-effort fallback: add to local store
                    addAgent({
                      id: agent.id || `custom_${Date.now()}`,
                      name: agent.name!,
                      description: agent.description || '',
                      role: agent.role!,
                      model: agent.model!,
                      temperature: agent.temperature || 0.7,
                      maxTokens: agent.maxTokens || 4096,
                      tools: agent.tools || [],
                      prompt: agent.prompt || `You are ${agent.name}`,
                      color: agent.color || '#64748B',
                      icon: agent.icon || '🤖',
                      tags: agent.tags || []
                    })
                    // Attempt a best-effort sync for visibility
                    try {
                      await syncAgents()
                    } catch {}
                    toast({ title: 'Agente creado localmente', description: 'No se pudo confirmar en el servidor. Revisa tu conexión.', status: 'warning' })
                  }
                }}
                onUpdateAgent={async (id, updatedAgent) => {
                  try {
                    // Call API to update agent
                    const response = await fetch(`/api/agents/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updatedAgent)
                    })

                    if (response.ok) {
                      // Update local store
                      updateAgent(id, updatedAgent)
                      toast({
                        title: 'Agente actualizado',
                        description: 'El agente se ha actualizado correctamente',
                        status: 'success'
                      })
                    } else {
                      toast({
                        title: 'Error',
                        description: 'Error al actualizar el agente',
                        status: 'error'
                      })
                    }
                  } catch (error) {
                    console.error('Error updating agent:', error)
                    toast({
                      title: 'Error',
                      description: 'Error al actualizar el agente',
                      status: 'error'
                    })
                  }
                }}
                onDeleteAgent={async (id) => {
                  try {
                    // Call API to delete agent
                    const response = await fetch(`/api/agents/${id}`, {
                      method: 'DELETE'
                    })

                    if (response.ok) {
                      // Update local store
                      deleteAgent(id)
                      toast({
                        title: 'Agente eliminado',
                        description: 'El agente se ha eliminado correctamente',
                        status: 'success'
                      })
                    } else {
                      toast({
                        title: 'Error',
                        description: 'Error al eliminar el agente',
                        status: 'error'
                      })
                    }
                  } catch (error) {
                    console.error('Error deleting agent:', error)
                    toast({
                      title: 'Error',
                      description: 'Error al eliminar el agente',
                      status: 'error'
                    })
                  }
                }}
              />
            </div>

            {/* Empty State for Agents */}
            {agents.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="panel flex flex-col items-center justify-center py-16"
              >
                <div className="w-20 h-20 radius-lg bg-muted/30 border border-border flex items-center justify-center mb-6">
                  <RobotIcon className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Create your first agent</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-6">Create specialized agents for different tasks. Each agent can have its own model, tools, and unique personality.</p>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Create my first agent
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeSection === 'credentials' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-6xl mx-auto space-y-6"
          >
            {/* Agent Credentials Section */}
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Agent Credentials</h1>
                <p className="text-muted-foreground mt-1">
                  Manage API keys and credentials for your specialized agents. Each agent requires specific credentials to access external services.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
                {/* Shopify Credentials for Emma */}
                <ShopifyCredentialsManager />

                {/* Skyvern Credentials for Wex */}
                <SkyvernCredentialsManager />

                {/* SerpAPI Credentials for Apu */}
                <SerpapiCredentialsManager />

                {/* Notion Credentials for Workspace Management */}
                <NotionCredentialsManager />

                {/* Twitter Credentials for Nora */}
                <TwitterCredentialsManager />
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { AgentCRUDPanel } from '@/app/components/layout/settings/agents/AgentCRUDPanel'
import { ShopifyCredentialsManager, NotionCredentialsManager } from '@/components/common/CredentialsManager'
import { TwitterCredentialsManager } from '@/components/twitter/twitter-credentials-manager'
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
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Control Center</span>
        <h1 className="text-2xl font-semibold text-foreground">Manage your agents</h1>
        <p className="text-sm text-muted-foreground">
          Configure capabilities, prompts, and credentials from a single, consistent workspace.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="space-y-6 rounded-2xl border border-border/60 bg-card/50 p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Agent Management</h2>
              <p className="text-xs text-muted-foreground">
                Configure and manage your AI agents and their integrations.
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
                      'w-full rounded-xl border border-transparent px-3 py-2 text-left transition-colors',
                      isActive
                        ? 'border-border bg-foreground/5 text-foreground'
                        : 'text-muted-foreground hover:border-border/60 hover:bg-muted/40 hover:text-foreground'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </nav>
            <div className="rounded-xl border border-dashed border-border/60 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Agents</span>
                <span className="font-medium text-foreground">{agents.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span>Active credentials</span>
                <span className="font-medium text-foreground">5</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-card/40 p-2 shadow-sm lg:hidden">
            <div className="grid grid-cols-2 gap-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-foreground/10 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm sm:p-6"
          >
            {activeSection === 'agents' ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Manage agents</h2>
                    <p className="text-sm text-muted-foreground">
                      Create, edit, and organize your specialized agents. Keep things simple and focused.
                    </p>
                  </div>
                  <span className="text-xs font-medium tracking-wide text-muted-foreground">
                    {agents.length} agent{agents.length !== 1 ? 's' : ''}
                  </span>
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

                {agents.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-16 text-center"
                  >
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/70">
                      <RobotIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Create your first agent</h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      Create specialized agents for different tasks. Each agent can have its own model, tools, and unique personality.
                    </p>
                    <Button
                      size="lg"
                      className="mt-6 rounded-xl bg-foreground text-background hover:bg-foreground/90"
                    >
                      <PlusIcon className="mr-2 h-5 w-5" />
                      Create my first agent
                    </Button>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">Agent credentials</h2>
                  <p className="text-sm text-muted-foreground">
                    Connect external services to unlock specialized agent capabilities. Most integrations use secure OAuth2 authentication.
                  </p>
                </div>

                {/* Manual API Key Section - Shopify Only */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-medium text-foreground">API Keys</h3>
                  </div>
                  <div className="grid gap-4">
                    <ShopifyCredentialsManager />
                  </div>
                </div>

                {/* OAuth2 Connections Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <GearSix className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-medium text-foreground">OAuth2 Connections</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Notion OAuth2 Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                            <span className="text-xl">📝</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">Notion</h4>
                            <p className="text-xs text-muted-foreground">Document management</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-500">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                          OAuth2
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Connect your Notion workspace to enable document reading, writing, and database operations.
                      </p>
                      <NotionCredentialsManager />
                    </motion.div>

                    {/* Twitter OAuth2 Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                            <span className="text-xl">𝕏</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">Twitter / X</h4>
                            <p className="text-xs text-muted-foreground">Social media automation</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-500">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                          OAuth2
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Authorize access to post tweets, read timelines, and manage your Twitter presence.
                      </p>
                      <TwitterCredentialsManager />
                    </motion.div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                      <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground mb-1">About OAuth2</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        OAuth2 connections are more secure than API keys because they use temporary tokens that can be revoked anytime. 
                        You'll be redirected to the service's website to authorize access without sharing your password.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

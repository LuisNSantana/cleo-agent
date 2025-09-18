'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { AgentCRUDPanel } from '@/app/components/layout/settings/agents/AgentCRUDPanel'
import { ShopifyCredentialsManager, SkyvernCredentialsManager, NotionCredentialsManager } from '@/components/common/CredentialsManager'
import { TwitterCredentialsManager } from '@/components/twitter/twitter-credentials-manager'
import dynamic from 'next/dynamic'
const SerpapiCredentialsManager = dynamic(()=>import('@/components/serpapi/serpapi-credentials-manager').then(m=>m.SerpapiCredentialsManager), { ssr:false })
import { useClientAgentStore } from '@/lib/agents/client-store'
import { PlusIcon, RobotIcon } from '@phosphor-icons/react'

export default function AgentsManagePage() {
  const {
    agents,
    addAgent,
    updateAgent,
    deleteAgent,
  syncAgents
  } = useClientAgentStore()

  return (
    <div className="py-6">
      {/* Section Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Manage Agents</h1>
        <p className="text-sm text-muted-foreground mt-1">Create, edit, and organize your specialized agents. Keep things simple and focused.</p>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Agent Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="panel p-4 sm:p-6"
        >
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
        </motion.div>

        {/* Agent Credentials Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="panel p-4 sm:p-6 space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Agent Credentials</h2>
            <p className="text-sm text-muted-foreground">
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
        </motion.div>

        {/* Empty State */}
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
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { AgentCRUDPanel } from '@/app/components/layout/settings/agents/AgentCRUDPanel'
import { ShopifyCredentialsManager, SkyvernCredentialsManager } from '@/components/common/CredentialsManager'
import dynamic from 'next/dynamic'
const SerpapiCredentialsManager = dynamic(()=>import('@/components/serpapi/serpapi-credentials-manager').then(m=>m.SerpapiCredentialsManager), { ssr:false })
import { useClientAgentStore } from '@/lib/agents/client-store'
import { PlusIcon, RobotIcon } from '@phosphor-icons/react'

export default function AgentsManagePage() {
  const {
    agents,
    addAgent
  } = useClientAgentStore()

  return (
    <div className="py-6">
      {/* Main Content */}
      <div className="space-y-8">
        {/* Agent Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AgentCRUDPanel 
            agents={agents}
            onCreateAgent={async (agent) => {
              try {
                const res = await fetch('/api/agents', {
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
                    parentAgentId: (agent as any).parentAgentId || undefined
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
                    tags: data.agent.tags
                  })
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
              }
            }}
            onUpdateAgent={(id, updatedAgent) => {
              // TODO: Implementar updateAgent en el store
              console.log('Update agent:', id, updatedAgent)
            }}
            onDeleteAgent={(id) => {
              // TODO: Implementar deleteAgent en el store  
              console.log('Delete agent:', id)
            }}
          />
        </motion.div>

        {/* Agent Credentials Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Agent Credentials</h2>
            <p className="text-muted-foreground">
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
          </div>
        </motion.div>

        {/* Empty State */}
        {agents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center mb-6">
              <RobotIcon className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Create your first agent</h3>
            <p className="text-muted-foreground text-center max-w-md mb-8">Create specialized agents for different tasks. Each agent can have its own model, tools, and unique personality.</p>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
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

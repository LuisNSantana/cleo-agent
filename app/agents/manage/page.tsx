'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { AgentCRUDPanel } from '@/app/components/layout/settings/agents/AgentCRUDPanel'
import ShopifyCredentialsManager from '@/components/shopify/ShopifyCredentialsManager'
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
            onCreateAgent={(agent) => {
              addAgent({
                id: agent.id!,
                name: agent.name!,
                description: agent.description!,
                role: agent.role!,
                model: agent.model!,
                temperature: agent.temperature!,
                maxTokens: agent.maxTokens!,
                tools: agent.tools!,
                prompt: agent.prompt!,
                color: agent.color!,
                icon: agent.icon!,
                tags: agent.tags
              })
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

        {/* Shopify Credentials Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ShopifyCredentialsManager />
        </motion.div>

        {/* Empty State */}
        {agents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-6">
              <RobotIcon className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Create your first agent</h3>
            <p className="text-slate-400 text-center max-w-md mb-8">Create specialized agents for different tasks. Each agent can have its own model, tools, and unique personality.</p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-8"
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

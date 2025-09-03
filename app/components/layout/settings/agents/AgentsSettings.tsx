'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useClientAgentStore } from '@/lib/agents/client-store'
import {
  RobotIcon,
  BrainIcon,
  GraphIcon,
  ListChecksIcon,
  ChatCircleIcon,
  GearIcon,
  ArrowRightIcon,
  PlusIcon,
  SparkleIcon,
  UsersIcon,
  ChartBarIcon
} from '@phosphor-icons/react'
import Link from 'next/link'

export function AgentsSettings() {
  const { agents, metrics } = useClientAgentStore()

  const moduleCards = [
    {
      title: 'Agent Architecture',
      description: 'Visualize the structure and relationships between your agents with interactive graphs',
      href: '/agents/architecture',
      icon: GraphIcon,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/10 to-cyan-500/10',
      borderColor: 'border-blue-500/20',
      features: ['Interactive visual graph', 'Real-time monitor', 'Quick execution', 'Performance metrics'],
      stats: { label: 'Active agents', value: metrics.activeAgents }
    },
    {
      title: 'Agent Management',
      description: 'Create, edit and manage your agents with advanced CRUD tools',
      href: '/agents/manage',
      icon: GearIcon,
      gradient: 'from-purple-500 to-violet-500',
      bgGradient: 'from-purple-500/10 to-violet-500/10',
      borderColor: 'border-purple-500/20',
      features: ['Full CRUD', 'Advanced configuration', 'Tool management', 'States and metrics'],
      stats: { label: 'Total agents', value: agents.length }
    },
    {
      title: 'Chat with Agents',
      description: 'Interact directly with your agents through an intuitive chat interface',
      href: '/agents/chat',
      icon: ChatCircleIcon,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-500/10 to-emerald-500/10',
      borderColor: 'border-green-500/20',
      features: ['Real-time chat', 'Conversation history', 'Multiple agents', 'Premium interface'],
      stats: { label: 'Conversations', value: 0 }
    },
    {
      title: 'Task Management',
      description: 'Assign, monitor and manage tasks for your agents efficiently',
      href: '/agents/tasks',
      icon: ListChecksIcon,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-500/10 to-red-500/10',
      borderColor: 'border-orange-500/20',
      features: ['Task assignment', 'Progress tracking', 'Priorities and dates', 'Workflow states'],
      stats: { label: 'Active tasks', value: 0 }
    }
  ]

  return (
    <div className="w-full max-w-none space-y-0">
      {/* Header Premium */}
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-6 sm:p-8 mb-6 sm:mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-cyan-600/10" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-xl">
                  <SparkleIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Agent Control Center
                  </h1>
                  <p className="text-lg text-slate-400 mt-2">
                    End-to-end platform to manage your AI ecosystem
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg px-4 py-2 border border-slate-600/50">
                  <UsersIcon className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="text-sm font-medium text-white">{agents.length}</div>
                    <div className="text-xs text-slate-400">Agents</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg px-4 py-2 border border-slate-600/50">
                  <ChartBarIcon className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-white">{metrics.totalExecutions}</div>
                    <div className="text-xs text-slate-400">Executions</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <div className="text-2xl font-bold text-green-400">{metrics.activeAgents}</div>
                <div className="text-sm text-slate-400">Active Agents</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <div className="text-2xl font-bold text-blue-400">24/7</div>
                <div className="text-sm text-slate-400">Availability</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <div className="text-2xl font-bold text-purple-400">Multi</div>
                <div className="text-sm text-slate-400">AI Agent</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <div className="text-2xl font-bold text-orange-400">Premium</div>
                <div className="text-sm text-slate-400">Experience</div>
              </div>
            </div>
          </div>
        </motion.div>

  {/* Navigation Modules */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 w-full max-w-none">
          {moduleCards.map((module, index) => {
            const IconComponent = module.icon
            
            return (
              <motion.div
                key={module.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="group"
              >
                <Card className={`h-full bg-slate-800/50 backdrop-blur-xl border-slate-700/50 hover:${module.borderColor} transition-all duration-500 overflow-hidden relative`}>
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${module.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  <CardHeader className="relative z-10 pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center shadow-lg`}>
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{module.stats.value}</div>
                        <div className="text-sm text-slate-400">{module.stats.label}</div>
                      </div>
                    </div>
                    
                    <CardTitle className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-200 group-hover:bg-clip-text transition-all duration-300">
                      {module.title}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="relative z-10 pt-0">
                    <p className="text-slate-400 mb-6 leading-relaxed">
                      {module.description}
                    </p>
                    
                    {/* Features List */}
                    <div className="space-y-2 mb-6">
                      {module.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center gap-2 text-sm">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${module.gradient}`} />
                          <span className="text-slate-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Action Button */}
                    <Link href={module.href}>
                      <Button 
                        className={`w-full bg-gradient-to-r ${module.gradient} hover:shadow-lg hover:scale-105 transition-all duration-300 group-hover:shadow-xl`}
                        size="lg"
                      >
                        <span className="font-medium">Open Module</span>
                        <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Quick Actions */}
  <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8"
        >
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <RobotIcon className="w-6 h-6" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/agents/manage">
                  <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-600 hover:border-purple-500/50 hover:bg-purple-500/10">
                    <PlusIcon className="w-5 h-5" />
                    Create New Agent
                  </Button>
                </Link>
                
                <Link href="/agents/architecture">
                  <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-600 hover:border-blue-500/50 hover:bg-blue-500/10">
                    <GraphIcon className="w-5 h-5" />
                    View Architecture
                  </Button>
                </Link>
                
                <Link href="/agents/chat">
                  <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-600 hover:border-green-500/50 hover:bg-green-500/10">
                    <ChatCircleIcon className="w-5 h-5" />
                    Start Chat
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-8 text-center"
        >
          <p className="text-slate-500 text-sm">
            Premium Multi-Agent System • Powered by Cleo AI • v2.0
          </p>
        </motion.div>
      </div>
    </div>
  )
}

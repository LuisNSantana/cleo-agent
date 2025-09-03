'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClientAgentStore } from '@/lib/agents/client-store'
import { AgentGraph } from '@/app/agents/components/AgentGraph'
import {
  PlayIcon,
  PulseIcon,
  RobotIcon,
  GraphIcon,
  CommandIcon,
} from '@phosphor-icons/react'

export default function AgentsArchitecturePage() {
  const {
    agents,
    executions,
    currentExecution,
    metrics,
    executeAgent,
    isLoading,
    error
  } = useClientAgentStore()

  const [quickInput, setQuickInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fmtTimeUTC = useMemo(() => new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'UTC'
  }), [])

  const formatExecTime = (d: Date | string) => fmtTimeUTC.format(new Date(d)) + ' UTC'

  const getSpecificRoleInfo = (name: string, role: string, tags?: string[]) => {
    const lname = (name || '').toLowerCase()
    if (role === 'supervisor') return { label: 'Supervisor', className: 'bg-pink-500/20 text-pink-300 border-pink-500/30' }
    if (lname.includes('toby')) return { label: 'Technical Specialist', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
    if (lname.includes('ami')) return { label: 'Creative Specialist', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    if (lname.includes('peter')) return { label: 'Logical Analyst', className: 'bg-lime-500/20 text-lime-300 border-lime-500/30' }
    const tagList = (tags || []).map(t => t.toLowerCase())
    if (tagList.some(t => ['technical','técnico','datos'].includes(t))) return { label: 'Technical Specialist', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
    if (tagList.some(t => ['creative','creativo','diseño','contenido'].includes(t))) return { label: 'Creative Specialist', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    if (tagList.some(t => ['logical','lógico','matemática','matemático'].includes(t))) return { label: 'Logical Analyst', className: 'bg-lime-500/20 text-lime-300 border-lime-500/30' }
    if (role === 'evaluator') return { label: 'Evaluator', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
    if (role === 'worker') return { label: 'Worker', className: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
    return { label: 'Specialist', className: 'bg-violet-500/20 text-violet-300 border-violet-500/30' }
  }

  const handleQuickExecution = async () => {
    if (!quickInput.trim()) return
    
    await executeAgent(quickInput, selectedAgent || undefined)
    setQuickInput('')
  }

  return (
  <div className="py-6 w-full max-w-none" suppressHydrationWarning>
      {/* Main Content */}
      <div className="space-y-8 w-full max-w-none">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Graph Visualization - Interactive */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="bg-slate-800/50 border-slate-700/50 shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <GraphIcon className="w-5 h-5" />
                  Agent Graph
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[620px] sm:h-[680px] relative">
                  <AgentGraph className="absolute inset-0 w-full h-full" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Execution Panel */}
            <Card className="bg-slate-800/50 border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CommandIcon className="w-5 h-5" />
                  Quick Execution
                </CardTitle>
                <p className="text-slate-400 text-sm">Run commands directly in the multi-agent system</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agent Selection */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedAgent === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAgent(null)}
                    className={selectedAgent === null ? "bg-violet-600 hover:bg-violet-700" : ""}
                  >
                    Auto-routing
                  </Button>
                  {agents.map((agent) => (
                    <Button
                      key={agent.id}
                      variant={selectedAgent === agent.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAgent(agent.id)}
                      className={selectedAgent === agent.id ? "bg-violet-600 hover:bg-violet-700" : ""}
                    >
                      <RobotIcon className="w-3 h-3 mr-1" />
                      {agent.name}
                    </Button>
                  ))}
                </div>

                {/* Input and Execute */}
                <div className="flex gap-3" suppressHydrationWarning>
                  <Input
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    placeholder="Describe what you want to accomplish..."
                    className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickExecution()}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleQuickExecution}
                    disabled={!quickInput.trim() || isLoading}
                    className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                  >
                    {isLoading ? (
                      <PulseIcon className="w-4 h-4 mr-2 animate-pulse" />
                    ) : (
                      <PlayIcon className="w-4 h-4 mr-2" />
                    )}
                    Run
                  </Button>
                </div>

                {/* Status */}
                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {currentExecution && (
                  <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                    <div className="text-blue-300 text-sm font-medium mb-1">
                      Running with {agents.find(a => a.id === currentExecution.agentId)?.name || 'unknown agent'}
                    </div>
                    <div className="text-slate-300 text-sm">
                      Status: {currentExecution.status}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Panel - Execution Details */}
          <div className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PulseIcon className="w-5 h-5" />
                  Execution Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[700px] flex items-center justify-center">
                  <div className="text-center">
                    <PulseIcon className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                    <h4 className="text-lg font-semibold text-slate-300 mb-2">Execution Panel</h4>
                    <p className="text-slate-500">Real-time execution monitoring</p>
                    <div className="mt-4 space-y-2">
                      {executions.length > 0 ? (
        executions.slice(0, 3).map((exec, index) => (
                          <div key={exec.id} className="p-2 bg-slate-800/30 rounded text-left">
                            <div className="text-xs text-slate-400">
                              {agents.find(a => a.id === exec.agentId)?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-slate-300">
          {exec.status} - {mounted ? formatExecTime(exec.startTime) : '...'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 text-sm">No recent executions</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Metrics */}
            <Card className="bg-slate-800/50 border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">System Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                    <div className="text-xl font-bold text-green-400">
                      {metrics.errorRate ? `${Math.round((1 - metrics.errorRate) * 100)}%` : '100%'}
                    </div>
                    <div className="text-xs text-slate-400">Success</div>
                  </div>
                  <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                    <div className="text-xl font-bold text-blue-400">
                      {metrics.averageResponseTime ? `${Math.round(metrics.averageResponseTime)}ms` : '0ms'}
                    </div>
                    <div className="text-xs text-slate-400">Avg time</div>
                  </div>
                  <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                    <div className="text-xl font-bold text-yellow-400">
                      {metrics.activeConnections || 0}
                    </div>
                    <div className="text-xs text-slate-400">Active connections</div>
                  </div>
                  <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                    <div className="text-xl font-bold text-purple-400">
                      {metrics.activeAgents || 0}
                    </div>
                    <div className="text-xs text-slate-400">Active agents</div>
                  </div>
                </div>

                {/* Agent Status */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white">Agent Status</h4>
                  {agents.map((agent) => {
                    const info = getSpecificRoleInfo(agent.name, agent.role, agent.tags)
                    return (
                      <div key={agent.id} className="flex items-center justify-between p-2 bg-slate-700/20 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span className="text-sm text-white">{agent.name}</span>
                        </div>
                        <Badge variant="secondary" className={`text-xs border ${info.className}`}>
                          {info.label}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

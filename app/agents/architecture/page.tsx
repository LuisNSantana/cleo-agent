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
    if (role === 'supervisor') return { label: 'Supervisor', className: 'bg-pink-500/15 text-pink-200 border-pink-500/30' }
    if (lname.includes('toby')) return { label: 'Technical Specialist', className: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30' }
    if (lname.includes('ami')) return { label: 'Creative Specialist', className: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' }
    if (lname.includes('peter')) return { label: 'Logical Analyst', className: 'bg-lime-500/15 text-lime-200 border-lime-500/30' }
    const tagList = (tags || []).map(t => t.toLowerCase())
    if (tagList.some(t => ['technical','técnico','datos'].includes(t))) return { label: 'Technical Specialist', className: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30' }
    if (tagList.some(t => ['creative','creativo','diseño','contenido'].includes(t))) return { label: 'Creative Specialist', className: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' }
    if (tagList.some(t => ['logical','lógico','matemática','matemático'].includes(t))) return { label: 'Logical Analyst', className: 'bg-lime-500/15 text-lime-200 border-lime-500/30' }
    if (role === 'evaluator') return { label: 'Evaluator', className: 'bg-amber-500/15 text-amber-200 border-amber-500/30' }
    if (role === 'worker') return { label: 'Worker', className: 'bg-foreground/10 text-foreground/80 border-border' }
    return { label: 'Specialist', className: 'bg-violet-500/15 text-violet-200 border-violet-500/30' }
  }

  const handleQuickExecution = async () => {
    if (!quickInput.trim()) return
    
    await executeAgent(quickInput, selectedAgent || undefined)
    setQuickInput('')
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-3 md:p-6" suppressHydrationWarning>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <GraphIcon className="w-8 h-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agent Architecture</h1>
            <p className="text-muted-foreground">Multi-agent system visualization and control</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Graph Visualization - Responsive */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                    <GraphIcon className="w-5 h-5" />
                    System Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="h-[400px] md:h-[500px] lg:h-[600px] relative bg-muted/30 rounded-lg overflow-hidden border border-border">
                    <AgentGraph className="absolute inset-0 w-full h-full" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Execution Panel - Optimized for mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                    <CommandIcon className="w-5 h-5" />
                    Quick Execute
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">Run commands in the multi-agent system</p>
                </CardHeader>
              <CardContent className="space-y-4">
                {/* Agent Selection - Improved mobile UX with scrollable horizontal layout */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Select Agent (or Auto for smart routing)
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    <Button
                      variant={selectedAgent === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAgent(null)}
                      className={`shrink-0 ${selectedAgent === null ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      <RobotIcon className="w-3 h-3 mr-1.5" weight="duotone" />
                      Auto-Route
                    </Button>
                    {agents.map((agent) => {
                      const info = getSpecificRoleInfo(agent.name, agent.role, agent.tags)
                      return (
                        <Button
                          key={agent.id}
                          variant={selectedAgent === agent.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedAgent(agent.id)}
                          className={`shrink-0 ${selectedAgent === agent.id ? "bg-primary text-primary-foreground" : ""}`}
                          title={`${agent.name} - ${info.label}`}
                        >
                          <RobotIcon className="w-3 h-3 mr-1.5" weight="duotone" />
                          {agent.name}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Input and Execute - Improved feedback */}
                <div className="flex flex-col sm:flex-row gap-3" suppressHydrationWarning>
                  <Input
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    placeholder={selectedAgent 
                      ? `Ask ${agents.find(a => a.id === selectedAgent)?.name || 'agent'} to help...`
                      : "Describe what you want to accomplish..."}
                    className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleQuickExecution()}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleQuickExecution}
                    disabled={!quickInput.trim() || isLoading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto min-w-[100px]"
                  >
                    {isLoading ? (
                      <>
                        <PulseIcon className="w-4 h-4 mr-2 animate-pulse" />
                        Running...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-4 h-4 mr-2" weight="fill" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>

                {/* Status Messages - Enhanced with more context */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <div className="text-destructive text-sm font-medium">Error:</div>
                      <div className="text-destructive text-sm flex-1">{error}</div>
                    </div>
                  </motion.div>
                )}

                {currentExecution && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-foreground text-sm font-medium">
                        {agents.find(a => a.id === currentExecution.agentId)?.name || 'Agent'} is working...
                      </div>
                      <PulseIcon className="w-4 h-4 text-blue-500 animate-pulse" />
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Status: <span className="text-foreground font-medium">{currentExecution.status}</span>
                    </div>
                    {currentExecution.input && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Task: {currentExecution.input.length > 60 
                          ? `${currentExecution.input.slice(0, 60)}...` 
                          : currentExecution.input}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Empty State Guidance */}
                {!isLoading && !currentExecution && !error && !quickInput && (
                  <div className="p-4 bg-muted/30 border border-dashed border-border rounded-lg text-center">
                    <CommandIcon className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Enter a command to see the multi-agent system in action
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Example: "Analyze sales data" or "Create a marketing plan"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </div>

          {/* Side Panel - Responsive */}
          <div className="space-y-4 md:space-y-6">
            {/* Execution Details - Compact for mobile */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                    <PulseIcon className="w-5 h-5" />
                    Executions
                  </CardTitle>
                </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-3 max-h-[350px] md:max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-2">
                  {executions.length > 0 ? (
                    executions.slice(0, 10).map((exec, index) => {
                      const agent = agents.find(a => a.id === exec.agentId)
                      const statusColors = {
                        'completed': 'bg-green-500/10 border-green-500/30 text-green-500',
                        'running': 'bg-blue-500/10 border-blue-500/30 text-blue-500',
                        'failed': 'bg-destructive/10 border-destructive/30 text-destructive',
                        'pending': 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      }
                      const statusColor = statusColors[exec.status as keyof typeof statusColors] || statusColors.pending
                      
                      return (
                        <motion.div 
                          key={exec.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-3 rounded-lg border ${statusColor} hover:scale-[1.02] transition-transform duration-200`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <RobotIcon className="w-4 h-4" weight="duotone" />
                              <div className="text-sm font-medium text-foreground">
                                {agent?.name || 'Unknown Agent'}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {exec.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {mounted ? formatExecTime(exec.startTime) : 'Loading...'}
                          </div>
                          {exec.input && (
                            <div className="mt-2 text-xs text-muted-foreground/80 line-clamp-2">
                              {exec.input}
                            </div>
                          )}
                        </motion.div>
                      )
                    })
                  ) : (
                    <div className="text-center py-12">
                      <PulseIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-3" weight="duotone" />
                      <p className="text-muted-foreground text-sm font-medium">No executions yet</p>
                      <p className="text-muted-foreground/70 text-xs mt-1">
                        Start by running a command above
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </motion.div>

            {/* System Metrics - Compact and responsive */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-foreground text-lg">System Status</CardTitle>
                </CardHeader>
              <CardContent className="space-y-4">
                {/* Metrics Grid - Enhanced with visual indicators */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
                    <div className="text-2xl font-bold text-green-500">
                      {metrics.errorRate ? `${Math.round((1 - metrics.errorRate) * 100)}%` : '100%'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Success Rate</div>
                    <div className="w-full bg-muted/30 h-1 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.errorRate ? Math.round((1 - metrics.errorRate) * 100) : 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
                    <div className="text-2xl font-bold text-blue-500">
                      {metrics.averageResponseTime ? `${Math.round(metrics.averageResponseTime)}ms` : '0ms'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Avg Response</div>
                    <div className="w-full bg-muted/30 h-1 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300 animate-pulse"
                        style={{ width: metrics.averageResponseTime ? '75%' : '0%' }}
                      />
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-lg border border-amber-500/20">
                    <div className="text-2xl font-bold text-amber-500">
                      {metrics.activeConnections || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Active Tasks</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
                    <div className="text-2xl font-bold text-purple-500">
                      {metrics.activeAgents || agents.length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Ready Agents</div>
                  </div>
                </div>

                {/* Agent Status - Improved layout with role indicators */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">Active Agents</h4>
                    <Badge variant="secondary" className="text-xs">
                      {agents.length} online
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-2">
                    {agents.length > 0 ? agents.map((agent) => {
                      const info = getSpecificRoleInfo(agent.name, agent.role, agent.tags)
                      return (
                        <motion.div 
                          key={agent.id} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="group flex items-center justify-between p-2.5 bg-muted/20 hover:bg-muted/40 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer"
                          onClick={() => setSelectedAgent(agent.id)}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="relative">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75"></div>
                            </div>
                            <span className="text-sm text-foreground font-medium truncate group-hover:text-primary transition-colors">
                              {agent.name}
                            </span>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs border shrink-0 ${info.className}`}
                          >
                            {info.label}
                          </Badge>
                        </motion.div>
                      )
                    }) : (
                      <div className="text-center py-6">
                        <RobotIcon className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No agents available</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

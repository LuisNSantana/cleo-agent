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
                {/* Agent Selection - Responsive buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedAgent === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAgent(null)}
                    className={selectedAgent === null ? "bg-primary text-primary-foreground" : ""}
                  >
                    Auto
                  </Button>
                  {agents.map((agent) => (
                    <Button
                      key={agent.id}
                      variant={selectedAgent === agent.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAgent(agent.id)}
                      className={selectedAgent === agent.id ? "bg-primary text-primary-foreground" : ""}
                    >
                      <RobotIcon className="w-3 h-3 mr-1.5" />
                      <span className="hidden sm:inline">{agent.name}</span>
                      <span className="sm:hidden">{agent.name.slice(0, 3)}</span>
                    </Button>
                  ))}
                </div>

                {/* Input and Execute - Mobile optimized */}
                <div className="flex flex-col sm:flex-row gap-3" suppressHydrationWarning>
                  <Input
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    placeholder="Describe what you want to accomplish..."
                    className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickExecution()}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleQuickExecution}
                    disabled={!quickInput.trim() || isLoading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <PulseIcon className="w-4 h-4 mr-2 animate-pulse" />
                    ) : (
                      <PlayIcon className="w-4 h-4 mr-2" />
                    )}
                    Run
                  </Button>
                </div>

                {/* Status Messages - Improved styling */}
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                    {error}
                  </div>
                )}

                {currentExecution && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-foreground text-sm font-medium mb-1">
                      Running with {agents.find(a => a.id === currentExecution.agentId)?.name || 'unknown agent'}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Status: {currentExecution.status}
                    </div>
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
                <div className="space-y-3 max-h-[300px] md:max-h-[400px] overflow-y-auto">
                  {executions.length > 0 ? (
                    executions.slice(0, 5).map((exec, index) => (
                      <div key={exec.id} className="p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm font-medium text-foreground">
                            {agents.find(a => a.id === exec.agentId)?.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {mounted ? formatExecTime(exec.startTime) : '...'}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Status: {exec.status}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <PulseIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground text-sm">No recent executions</p>
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
                {/* Metrics Grid - Responsive */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="text-lg font-bold text-green-500">
                      {metrics.errorRate ? `${Math.round((1 - metrics.errorRate) * 100)}%` : '100%'}
                    </div>
                    <div className="text-xs text-muted-foreground">Success</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="text-lg font-bold text-blue-500">
                      {metrics.averageResponseTime ? `${Math.round(metrics.averageResponseTime)}ms` : '0ms'}
                    </div>
                    <div className="text-xs text-muted-foreground">Response</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="text-lg font-bold text-amber-500">
                      {metrics.activeConnections || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Connections</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="text-lg font-bold text-purple-500">
                      {metrics.activeAgents || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Agents</div>
                  </div>
                </div>

                {/* Agent Status - Improved layout */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Active Agents</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {agents.map((agent) => {
                      const info = getSpecificRoleInfo(agent.name, agent.role, agent.tags)
                      return (
                        <div key={agent.id} className="flex items-center justify-between p-2.5 bg-muted/20 rounded-lg border border-border">
                          <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-sm text-foreground font-medium">{agent.name}</span>
                          </div>
                          <Badge variant="secondary" className={`text-xs border ${info.className}`}>
                            <span className="hidden sm:inline">{info.label}</span>
                            <span className="sm:hidden">{info.label.split(' ')[0]}</span>
                          </Badge>
                        </div>
                      )
                    })}
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

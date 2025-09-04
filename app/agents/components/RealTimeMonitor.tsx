'use client'

/**
 * Real-time Agent Execution Monitor
 * Shows live execution flow and agent "thinking" process
 */

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useRealTimeExecution } from '@/lib/agents/use-realtime-execution'
import { 
  Brain, 
  MessageCircle, 
  Clock, 
  ArrowRight,
  Zap,
  Eye,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
  Users,
  TrendingUp,
  Lightbulb
} from 'lucide-react'

export function RealTimeExecutionMonitor() {
  const { 
    currentStep, 
    agentThoughts, 
    isLive, 
    executionStats, 
    agentStatus,
    runningExecutions,
    recentExecutions 
  } = useRealTimeExecution()
  const [breadcrumb, setBreadcrumb] = React.useState<string[]>([])

  const pretty = (id: string) => {
    if (!id) return id
    if (id.includes('cleo')) return 'Cleo'
    if (id.includes('toby')) return 'Toby'
    if (id.includes('ami')) return 'Ami'
    if (id.includes('peter')) return 'Peter'
    return id
  }

  // Build breadcrumb from current running execution if available
  React.useEffect(() => {
    const exec = runningExecutions[0]
    if (!exec) {
      // only update when not already empty
      setBreadcrumb((prev) => (prev.length ? [] : prev))
      return
    }
    const parts: string[] = ['Cleo'];
    (exec.messages || []).forEach((m: any) => {
      const from = (m.metadata as any)?.handoff_from
      const to = (m.metadata as any)?.handoff_to
      if (from && to) {
        const prettyFrom = pretty(from)
        const prettyTo = pretty(to)
        if (parts[parts.length - 1] !== prettyFrom) parts.push(prettyFrom)
        parts.push(prettyTo)
      }
    })
    const lastAi = [...(exec.messages || [])].reverse().find(m => m.type === 'ai')
    if (lastAi) parts.push('Respuesta')

    // only update when changed
    const newKey = parts.join('>')
    setBreadcrumb((prev) => (prev.join('>') === newKey ? prev : parts))
  }, [runningExecutions])
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [showThoughts, setShowThoughts] = useState(true)

  // Mobile toggle: listen for an event to open/close
  React.useEffect(() => {
    const onToggle = () => setIsExpanded((v) => !v)
    window.addEventListener('agents:toggle-monitor', onToggle)
    return () => window.removeEventListener('agents:toggle-monitor', onToggle)
  }, [])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'analyzing':
        return <Eye className="size-4 text-indigo-600 animate-pulse" />
      case 'thinking':
        return <Brain className="size-4 text-purple-600 animate-pulse" />
      case 'responding':
        return <MessageCircle className="size-4 text-blue-600" />
      case 'delegating':
        return <ArrowRight className="size-4 text-orange-600" />
      case 'completing':
        return <CheckCircle2 className="size-4 text-green-600" />
      default:
        return <Activity className="size-4 text-gray-600" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'analyzing': return 'Analizando'
      case 'thinking': return 'Pensando'
      case 'responding': return 'Respondiendo'
      case 'delegating': return 'Delegando'
      case 'completing': return 'Completando'
      default: return 'Procesando'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'analyzing': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'thinking': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'responding': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'delegating': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'completing': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getThoughtIcon = (type: string) => {
    switch (type) {
      case 'analysis': return <Eye className="size-3 text-indigo-500" />
      case 'decision': return <Zap className="size-3 text-purple-500" />
      case 'action': return <Activity className="size-3 text-blue-500" />
      case 'reflection': return <Lightbulb className="size-3 text-green-500" />
      default: return <Brain className="size-3 text-gray-500" />
    }
  }

  if (!isExpanded && !isLive && runningExecutions.length === 0) {
    // Minimized view when no activity
    return (
      <>
        {/* Icon-only on mobile, small card on sm+ */}
        <button
          className="sm:hidden fixed bottom-3 right-3 z-40 w-10 h-10 rounded-full bg-white/80 dark:bg-zinc-900/70 border border-blue-200 shadow flex items-center justify-center"
          onClick={() => setIsExpanded(true)}
          aria-label="Abrir monitor"
        >
          <Activity className="h-5 w-5 text-blue-600" />
        </button>
        <Card className="hidden sm:block fixed bottom-3 right-3 w-80 shadow-lg border-2 border-blue-200 z-40">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsExpanded(true)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-blue-600" />
                <CardTitle className="text-sm">Monitor de Agentes</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                {executionStats.total}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {executionStats.running} activos • {executionStats.completed} completados
            </CardDescription>
          </CardHeader>
        </Card>
      </>
    )
  }

  return (
    <Card className="fixed bottom-3 right-3 w-48 sm:w-96 max-h-[42vh] sm:max-h-[700px] shadow-lg border-2 border-blue-200 z-40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="size-5 text-blue-600" />
            <CardTitle className="text-xs sm:text-sm">Monitor<span className="hidden sm:inline"> en Tiempo Real</span></CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              {showThoughts && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowThoughts(!showThoughts)}
                  className="text-xs"
                >
                  <Brain className="size-3 mr-1" />
                  Pensamientos
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? '−' : '+'}
              </Button>
            </div>
            {/* Mobile close button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="sm:hidden h-7 w-7"
              onClick={() => setIsExpanded(false)}
              aria-label="Cerrar monitor"
            >
              ×
            </Button>
          </div>
        </div>
        
        {/* Live Status */}
        {(isLive || runningExecutions.length > 0) && (
          <div className="flex items-center gap-2 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs sm:text-sm text-green-600 font-medium">EN VIVO</span>
            </div>
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              {runningExecutions.length} ejecución(es)
            </Badge>
          </div>
        )}
      </CardHeader>

      {/* Hide heavy content in mobile to avoid overlaying the graph */}
      <CardContent className="hidden sm:block space-y-4 max-h-[550px] overflow-y-auto">
        {/* Current Execution Status */}
        {currentStep && (
          <div className="p-3 rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-start gap-3">
              {getActionIcon(currentStep.action)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`text-xs px-2 py-1 ${getActionColor(currentStep.action)}`}>
                    {getActionLabel(currentStep.action)}
                  </Badge>
                  <span className="text-xs text-gray-500 font-mono">
                    {currentStep.agent}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  {currentStep.content}
                </p>
                <Progress value={currentStep.progress} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Progreso</span>
                  <span>{currentStep.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Handoff breadcrumb */}
        {breadcrumb.length > 1 && (
          <div className="p-2 rounded border bg-gray-50 text-xs text-gray-700">
            {breadcrumb.map((seg, i) => (
              <span key={i}>
                {seg}{i < breadcrumb.length - 1 && ' → '}
              </span>
            ))}
          </div>
        )}

        {/* Agent Thoughts */}
        {showThoughts && agentThoughts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-purple-600" />
              <h4 className="text-sm font-medium text-gray-700">Proceso Mental</h4>
            </div>
            
            {agentThoughts.slice(-3).map((thought) => (
              <div 
                key={thought.id}
                className="p-2 rounded border-l-4 border-purple-300 bg-purple-50 text-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  {getThoughtIcon(thought.type)}
                  <span className="text-xs text-purple-600 font-medium uppercase">
                    {thought.type}
                  </span>
                  {thought.confidence && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(thought.confidence * 100)}%
                    </Badge>
                  )}
                </div>
                <p className="text-gray-700 italic">"{thought.content}"</p>
              </div>
            ))}
          </div>
        )}

        {/* Timeline mini-visual */}
        {isExpanded && runningExecutions.length > 0 && (
          <div className="p-2 rounded border bg-gradient-to-r from-emerald-50 to-blue-50">
            <div className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Clock className="size-4" /> Línea de Tiempo
            </div>
            <div className="relative h-2 bg-gray-200 rounded">
              <div className="absolute inset-y-0 left-0 bg-emerald-400 rounded" style={{ width: `${Math.min(currentStep?.progress ?? 5, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>inicio</span>
              <span>{Math.round(currentStep?.progress ?? 0)}%</span>
              <span>fin</span>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {isExpanded && (
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-green-50 rounded border">
              <div className="text-lg font-bold text-green-600">
                {executionStats.completed}
              </div>
              <div className="text-xs text-green-600">Completadas</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded border">
              <div className="text-lg font-bold text-blue-600">
                {executionStats.running}
              </div>
              <div className="text-xs text-blue-600">Activas</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded border">
              <div className="text-lg font-bold text-purple-600">
                {Math.round(executionStats.avgExecutionTime)}ms
              </div>
              <div className="text-xs text-purple-600">Tiempo Prom.</div>
            </div>
          </div>
        )}

        {/* Agent Status Grid */}
        {isExpanded && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="size-4" />
              Estado de Agentes
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {agentStatus.map(agent => (
                <div 
                  key={agent.agentId}
                  className={`p-2 rounded text-center border text-xs transition-colors ${
                    agent.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                    agent.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <div className="font-medium">
                    {agent.agentId.split('-')[0]}
                  </div>
                  <div className="text-gray-600">
                    {agent.executionCount} exec.
                  </div>
                  {agent.avgResponseTime > 0 && (
                    <div className="text-gray-500 text-xs">
                      {Math.round(agent.avgResponseTime)}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

  {/* Recent Executions */}
        {isExpanded && recentExecutions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock className="size-4" />
              Historial Reciente
            </h4>
            
            {recentExecutions.slice(0, 5).map((execution) => (
              <div 
                key={execution.id}
                className="p-2 rounded border bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{execution.agentId}</span>
                  <div className="flex items-center gap-1">
                    {execution.status === 'completed' && (
                      <CheckCircle2 className="size-3 text-green-600" />
                    )}
                    {execution.status === 'failed' && (
                      <AlertCircle className="size-3 text-red-600" />
                    )}
                    {execution.status === 'running' && (
                      <Loader2 className="size-3 text-blue-600 animate-spin" />
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(execution.startTime).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600">
                  {(execution.messages || []).length} mensajes
                  {execution.status === 'completed' && execution.metrics.executionTime && (
                    <> • {execution.metrics.executionTime}ms</>
                  )}
                </div>
                
                {/* Mini execution flow with durations */}
                <div className="flex items-center gap-1 mt-1">
                  {(execution.messages || []).slice(0, 4).map((msg, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        msg.type === 'human' ? 'bg-blue-400' :
                        msg.type === 'ai' ? 'bg-purple-400' :
                        'bg-gray-400'
                      }`} />
                      {idx < 3 && idx < (execution.messages || []).length - 1 && (
                        <ArrowRight className="size-2 text-gray-400" />
                      )}
                    </div>
                  ))}
                  {(execution.messages || []).length > 4 && (
                    <span className="text-xs text-gray-400">+{(execution.messages || []).length - 4}</span>
                  )}
                  {execution.metrics.executionTime && (
                    <span className="text-xs text-gray-500 ml-auto">{execution.metrics.executionTime}ms</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

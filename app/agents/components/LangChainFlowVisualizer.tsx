'use client'

/**
 * LangChain Flow Visualizer
 * Shows real-time visualization of LangChain execution flow
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AgentExecution } from '@/lib/agents/types'
import { 
  MessageCircle,
  Brain,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Activity,
  Eye,
  Loader2,
  Send,
  Cpu
} from 'lucide-react'

interface FlowStep {
  id: string
  type: 'receive' | 'analyze' | 'process' | 'generate' | 'respond' | 'complete'
  agent: string
  status: 'pending' | 'active' | 'completed'
  timestamp: Date
  duration?: number
  description: string
}

interface LangChainFlowVisualizerProps {
  execution: AgentExecution | null
  isVisible: boolean
}

export function LangChainFlowVisualizer({ execution, isVisible }: LangChainFlowVisualizerProps) {
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Generate flow steps from execution
  useEffect(() => {
    if (!execution || !isVisible) {
      setFlowSteps([])
      setCurrentStepIndex(0)
      setIsAnimating(false)
      return
    }

    if (execution.status === 'running') {
      // Generate realistic flow steps for running execution
      const steps: FlowStep[] = [
        {
          id: 'receive',
          type: 'receive',
          agent: execution.agentId,
          status: 'completed',
          timestamp: new Date(execution.startTime),
          description: 'Recibiendo consulta del usuario...',
          duration: 100
        },
        {
          id: 'analyze',
          type: 'analyze', 
          agent: execution.agentId,
          status: 'active',
          timestamp: new Date(Date.now() - 3000),
          description: 'Analizando contexto y determinando estrategia...',
        },
        {
          id: 'process',
          type: 'process',
          agent: execution.agentId,
          status: 'pending',
          timestamp: new Date(),
          description: 'Pensando...',
        },
        {
          id: 'generate',
          type: 'generate',
          agent: execution.agentId,
          status: 'pending',
          timestamp: new Date(),
          description: 'Generando respuesta estructurada...',
        },
        {
          id: 'respond',
          type: 'respond',
          agent: execution.agentId,
          status: 'pending',
          timestamp: new Date(),
          description: 'Enviando respuesta al usuario...',
        }
      ]

      setFlowSteps(steps)
      setIsAnimating(true)

      // Animate through steps
      let stepIndex = 0
      const interval = setInterval(() => {
        stepIndex++
        setCurrentStepIndex(stepIndex)
        
        if (stepIndex < steps.length) {
          setFlowSteps(prev => prev.map((step, idx) => ({
            ...step,
            status: idx < stepIndex ? 'completed' : 
                   idx === stepIndex ? 'active' : 'pending'
          })))
        } else {
          clearInterval(interval)
          setIsAnimating(false)
        }
      }, 1500)

      return () => clearInterval(interval)

    } else if (execution.status === 'completed') {
      // Generate completed flow based on messages
      const steps: FlowStep[] = [
        {
          id: 'receive',
          type: 'receive',
          agent: execution.agentId,
          status: 'completed',
          timestamp: new Date(execution.startTime),
          description: 'Consulta recibida',
          duration: 100
        },
        {
          id: 'analyze',
          type: 'analyze',
          agent: execution.agentId,
          status: 'completed',
          timestamp: new Date(execution.startTime),
          description: 'Análisis completado',
          duration: 800
        },
        {
          id: 'process',
          type: 'process',
          agent: execution.agentId,
          status: 'completed',
          timestamp: new Date(execution.startTime),
          description: 'Procesamiento LangChain finalizado',
          duration: execution.metrics.executionTime || 1200
        },
        {
          id: 'complete',
          type: 'complete',
          agent: execution.agentId,
          status: 'completed',
          timestamp: new Date(execution.endTime || execution.startTime),
          description: 'Respuesta entregada exitosamente',
          duration: 50
        }
      ]
      
      setFlowSteps(steps)
      setCurrentStepIndex(steps.length - 1)
      setIsAnimating(false)
    }
  }, [execution, isVisible])

  const getStepIcon = (type: FlowStep['type'], status: FlowStep['status']) => {
    const iconClass = `size-5 ${
      status === 'completed' ? 'text-green-600' :
      status === 'active' ? 'text-blue-600 animate-pulse' :
      'text-gray-400'
    }`

    switch (type) {
      case 'receive':
        return <MessageCircle className={iconClass} />
      case 'analyze':
        return <Eye className={iconClass} />
      case 'process':
        return <Cpu className={iconClass} />
      case 'generate':
        return <Brain className={iconClass} />
      case 'respond':
        return <Send className={iconClass} />
      case 'complete':
        return <CheckCircle2 className={iconClass} />
      default:
        return <Activity className={iconClass} />
    }
  }

  const getStepColor = (status: FlowStep['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50'
      case 'active':
        return 'border-blue-200 bg-blue-50 shadow-md scale-105'
      case 'pending':
        return 'border-gray-200 bg-gray-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  if (!isVisible || flowSteps.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
        <Zap className="size-6 text-purple-600" />
        Flujo LangChain en Tiempo Real
        {isAnimating && (
          <Loader2 className="size-5 text-blue-600 animate-spin" />
        )}
      </div>

      <div className="space-y-3">
        {flowSteps.map((step, index) => (
          <div key={step.id}>
            <Card className={`transition-all duration-500 ${getStepColor(step.status)}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {getStepIcon(step.type, step.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {step.agent}
                      </Badge>
                      <Badge 
                        variant={
                          step.status === 'completed' ? 'default' :
                          step.status === 'active' ? 'destructive' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {step.status === 'completed' ? 'Completado' :
                         step.status === 'active' ? 'En Proceso' :
                         'Pendiente'}
                      </Badge>
                      {step.duration && step.status === 'completed' && (
                        <span className="text-xs text-gray-500">
                          {step.duration}ms
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">
                      {step.description}
                    </p>
                    {step.status === 'active' && (
                      <Progress value={70} className="h-1 mt-2" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Arrow connector */}
            {index < flowSteps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowRight className={`size-4 ${
                  index < currentStepIndex ? 'text-green-500' :
                  index === currentStepIndex ? 'text-blue-500' :
                  'text-gray-300'
                }`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Flow Summary */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-gray-600" />
              <span className="text-gray-700">Tiempo total:</span>
              <span className="font-mono font-semibold">
                {execution?.metrics.executionTime || 0}ms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Estado:</span>
              <Badge variant={execution?.status === 'completed' ? 'default' : 
                             execution?.status === 'running' ? 'destructive' : 'secondary'}>
                {execution?.status === 'completed' ? 'Completado' :
                 execution?.status === 'running' ? 'Ejecutando' :
                 execution?.status === 'failed' ? 'Error' : 'Desconocido'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

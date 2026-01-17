'use client'

/**
 * Agent Thinking Visualizer
 * Shows a visual representation of agent thinking process
 */

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ExecutionStep, AgentThought } from '@/lib/agents/use-realtime-execution'
import { 
  Brain,
  Eye,
  Zap,
  Activity,
  Lightbulb,
  MessageCircle,
  ArrowRight,
  CheckCircle2
} from 'lucide-react'

interface AgentThinkingVisualizerProps {
  currentStep?: ExecutionStep | null
  thoughts: AgentThought[]
  isLive: boolean
}

export function AgentThinkingVisualizer({ 
  currentStep, 
  thoughts, 
  isLive 
}: AgentThinkingVisualizerProps) {
  if (!isLive && !currentStep && thoughts.length === 0) {
    return null
  }

  const getThoughtIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <Eye className="size-4 text-indigo-500" />
      case 'decision':
        return <Zap className="size-4 text-purple-500" />
      case 'action':
        return <Activity className="size-4 text-blue-500" />
      case 'reflection':
        return <Lightbulb className="size-4 text-green-500" />
      default:
        return <Brain className="size-4 text-gray-500" />
    }
  }

  const getStepIcon = (action: string) => {
    switch (action) {
      case 'analyzing':
        return <Eye className="size-5 text-indigo-600" />
      case 'thinking':
        return <Brain className="size-5 text-purple-600" />
      case 'responding':
        return <MessageCircle className="size-5 text-blue-600" />
      case 'delegating':
        return <ArrowRight className="size-5 text-orange-600" />
      case 'completing':
        return <CheckCircle2 className="size-5 text-green-600" />
      default:
        return <Activity className="size-5 text-gray-600" />
    }
  }

  const getThoughtTypeColor = (type: string) => {
    switch (type) {
      case 'analysis': return 'border-l-indigo-400 bg-indigo-50'
      case 'decision': return 'border-l-purple-400 bg-purple-50'
      case 'action': return 'border-l-blue-400 bg-blue-50'
      case 'reflection': return 'border-l-green-400 bg-green-50'
      default: return 'border-l-gray-400 bg-gray-50'
    }
  }

  const recentThoughts = thoughts.slice(-4)

  return (
    <div className="space-y-4">
      {/* Current Step Visualization */}
      {currentStep && (
        <Card className="border-2 border-dashed border-blue-300 bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              {getStepIcon(currentStep.action)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-800">
                    {currentStep.agent}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {currentStep.action}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  {currentStep.content}
                </p>
                <Progress value={currentStep.progress} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Progreso de la tarea</span>
                  <span>{currentStep.progress}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thought Stream */}
      {recentThoughts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Brain className="size-4 text-purple-600" />
            Proceso de Razonamiento
          </div>
          
          <div className="space-y-3">
            {recentThoughts.map((thought, index) => (
              <div
                key={thought.id}
                className={`relative pl-4 border-l-4 ${getThoughtTypeColor(thought.type)} rounded-r-lg p-3 transition-all duration-300 ${
                  index === recentThoughts.length - 1 ? 'scale-105 shadow-md' : 'opacity-80'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {getThoughtIcon(thought.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                        {thought.type}
                      </span>
                      {thought.confidence && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(thought.confidence * 100)}%
                        </Badge>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {thought.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 italic leading-relaxed">
                      "{thought.content}"
                    </p>
                  </div>
                </div>
                
                {/* Animated indicator for latest thought */}
                {index === recentThoughts.length - 1 && isLive && (
                  <div className="absolute -left-1 top-3 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                )}
              </div>
            ))}
          </div>

          {/* Thought flow visualization */}
          {recentThoughts.length > 1 && (
            <div className="flex items-center justify-center mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span>Flujo de pensamiento:</span>
                {recentThoughts.map((thought, index) => (
                  <div key={thought.id} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      thought.type === 'analysis' ? 'bg-indigo-400' :
                      thought.type === 'decision' ? 'bg-purple-400' :
                      thought.type === 'action' ? 'bg-blue-400' :
                      thought.type === 'reflection' ? 'bg-green-400' :
                      'bg-gray-400'
                    }`} />
                    {index < recentThoughts.length - 1 && (
                      <ArrowRight className="size-3 text-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live indicator */}
      {isLive && (
        <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 py-2 px-3 rounded-lg border border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-medium">Analizando en tiempo real...</span>
        </div>
      )}
    </div>
  )
}

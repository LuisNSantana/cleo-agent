'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useClientAgentStore } from '@/lib/agents/client-store'
import { DelegationProgress, DelegationTimelineEvent } from '@/lib/agents/types'
import { getAgentMetadata } from '@/lib/agents/agent-metadata'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DelegationProgressComponentProps {
  className?: string
  showDetails?: boolean
}

export function DelegationProgressComponent({ 
  className, 
  showDetails = false 
}: DelegationProgressComponentProps) {
  const { activeDelegations, currentDelegationId } = useClientAgentStore()
  const [expanded, setExpanded] = React.useState(showDetails)

  const currentDelegation = currentDelegationId ? activeDelegations[currentDelegationId] : null

  if (!currentDelegation) {
    return null
  }

  const sourceMeta = getAgentMetadata(currentDelegation.sourceAgent, (currentDelegation as any).sourceAgentName)
  const targetMeta = getAgentMetadata(currentDelegation.targetAgent, (currentDelegation as any).targetAgentName)

  const getStatusColor = (status: DelegationProgress['status']) => {
    switch (status) {
      case 'requested': return 'bg-blue-500'
      case 'accepted': return 'bg-blue-600'
      case 'in_progress': return 'bg-yellow-500'
      case 'completing': return 'bg-orange-500'
      case 'completed': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'timeout': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getStageMessage = (stage: DelegationProgress['stage'], targetAgent: string) => {
    const targetMetadata = getAgentMetadata(targetAgent, (currentDelegation as any)?.targetAgentName)
    switch (stage) {
      case 'initializing': return `Preparando delegación a ${targetMetadata.name}...`
      case 'analyzing': return `${targetMetadata.name} está analizando la tarea...`
      case 'researching': return `${targetMetadata.name} está investigando...`
      case 'processing': return `${targetMetadata.name} está procesando los datos...`
      case 'synthesizing': return `${targetMetadata.name} está sintetizando resultados...`
      case 'finalizing': return `${targetMetadata.name} está finalizando la respuesta...`
      default: return `${targetMetadata.name} está trabajando...`
    }
  }

  const getTimeElapsed = (startTime: Date, lastUpdate: Date) => {
    const diff = lastUpdate.getTime() - startTime.getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn("w-full", className)}
      >
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <motion.div
                  className={cn("w-3 h-3 rounded-full", getStatusColor(currentDelegation.status))}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="flex items-center space-x-2">
                  {/* Source Agent Avatar */}
                  <Avatar className="w-6 h-6">
                    <AvatarImage 
                      src={sourceMeta.avatar} 
                      alt={sourceMeta.name} 
                    />
                    <AvatarFallback className="text-xs">
                      {sourceMeta.emoji}
                    </AvatarFallback>
                  </Avatar>
                  
                  <span className="text-xs">→</span>
                  
                  {/* Target Agent Avatar */}
                  <Avatar className="w-6 h-6">
                    <AvatarImage 
                      src={targetMeta.avatar} 
                      alt={targetMeta.name} 
                    />
                    <AvatarFallback className="text-xs">
                      {targetMeta.emoji}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {sourceMeta.name} → {targetMeta.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {getStageMessage(currentDelegation.stage, currentDelegation.targetAgent)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {getTimeElapsed(currentDelegation.startTime, currentDelegation.lastUpdate)}
                </Badge>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso</span>
                  <span>{currentDelegation.progress}%</span>
                </div>
                <Progress value={currentDelegation.progress} className="h-2" />
              </div>

              {/* Task Description */}
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                <strong>Tarea:</strong> {currentDelegation.task}
              </div>

              {/* Timeline Details (Expandable) */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t pt-3">
                      <h4 className="text-xs font-medium mb-2 text-muted-foreground">Timeline</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {currentDelegation.timeline.map((event, index) => (
                          <TimelineEvent 
                            key={event.id} 
                            event={event} 
                            isLast={index === currentDelegation.timeline.length - 1}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

interface TimelineEventProps {
  event: DelegationTimelineEvent
  isLast: boolean
}

function TimelineEvent({ event, isLast }: TimelineEventProps) {
  return (
    <div className="flex items-start space-x-2">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
        {!isLast && <div className="w-px h-4 bg-border mt-1" />}
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center space-x-2 text-xs">
          <span>{event.icon}</span>
          <span className="text-muted-foreground">
            {event.timestamp.toLocaleTimeString()}
          </span>
          <Badge variant="secondary" className="text-xs">
            {event.agent}
          </Badge>
        </div>
        <p className="text-xs text-foreground mt-1">{event.message}</p>
      </div>
    </div>
  )
}

export default DelegationProgressComponent

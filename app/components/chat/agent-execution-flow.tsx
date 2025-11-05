"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useMemo, useEffect, useState } from "react"
import { getAgentMetadata } from "@/lib/agents/agent-metadata"
import { CheckCircle, Lightning, Brain, MagnifyingGlass, ChatCircleDots, ArrowRight } from "@phosphor-icons/react"
import { getProgressMessage, enrichStepWithContextualMessage } from "@/lib/agents/ui-messaging"

export type PipelineStep = {
  id: string
  timestamp: string | Date
  agent: string
  agentName?: string  // ✅ Friendly name for custom agents
  action: 'analyzing' | 'thinking' | 'responding' | 'delegating' | 'completing' | 'routing' | 'reviewing' | 'supervising' | 'executing' | 'delegation'
  content: string
  progress?: number
  metadata?: any
}

interface AgentExecutionFlowProps {
  steps: PipelineStep[]
  mode?: 'direct' | 'delegated'
}

function getActionIcon(action: PipelineStep['action']) {
  switch (action) {
    case 'thinking': return <Brain className="w-3.5 h-3.5" weight="fill" />
    case 'analyzing': return <MagnifyingGlass className="w-3.5 h-3.5" weight="fill" />
    case 'responding': return <ChatCircleDots className="w-3.5 h-3.5" weight="fill" />
    case 'delegating': return <ArrowRight className="w-3.5 h-3.5" weight="fill" />
    case 'executing': return <Lightning className="w-3.5 h-3.5" weight="fill" />
    default: return <Lightning className="w-3.5 h-3.5" weight="fill" />
  }
}

export function AgentExecutionFlow({ steps, mode = 'direct' }: AgentExecutionFlowProps) {
  const [progressMessages, setProgressMessages] = useState<Record<string, string>>({})
  
  // Get the latest 3 active steps to show
  const activeSteps = useMemo(() => {
    const sorted = [...steps].sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime()
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime()
      return timeB - timeA
    })
    // Enrich steps with contextual messages if not already reasoning
    return sorted.slice(0, 3).map(s => {
      if (!s.metadata?.reasoning) {
        return enrichStepWithContextualMessage(s)
      }
      return s
    })
  }, [steps])

  const latestStep = activeSteps[0]
  
  // Update progressive messages for long-running steps
  useEffect(() => {
    if (!latestStep) return
    
    const startTime = typeof latestStep.timestamp === 'string' 
      ? new Date(latestStep.timestamp).getTime() 
      : latestStep.timestamp.getTime()
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed > 5000 && !latestStep.metadata?.reasoning) {
        const msg = getProgressMessage(
          latestStep.action,
          elapsed,
          latestStep.agentName
        )
        setProgressMessages(prev => ({
          ...prev,
          [latestStep.id]: msg
        }))
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [latestStep])

  if (!latestStep) return null

  return (
    <div className="w-full max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/30 to-background/50 backdrop-blur-sm overflow-hidden"
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        <div className="relative p-5">
          {/* Header with status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-2 h-2 rounded-full bg-emerald-500"
              />
              <span className="text-sm font-medium text-muted-foreground">
                AI Team Active
              </span>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20"
            >
              <Lightning weight="fill" className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                {mode === 'direct' ? 'Direct' : 'Delegated'}
              </span>
            </motion.div>
          </div>

          {/* Agent execution cards */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {activeSteps.map((step, index) => {
                // Use agentName from step if available (from server), otherwise fallback to metadata lookup
                const displayName = step.agentName || getAgentMetadata(step.agent).name
                const meta = getAgentMetadata(step.agent)
                const isLatest = index === 0
                
                return (
                  <motion.div
                    key={step.id}
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ 
                      opacity: isLatest ? 1 : 0.5,
                      x: 0,
                      scale: 1
                    }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 500,
                      damping: 30
                    }}
                    className={`
                      relative rounded-xl border transition-all duration-300
                      ${isLatest 
                        ? 'bg-card/80 border-primary/30 shadow-lg shadow-primary/5' 
                        : 'bg-card/40 border-border/20'
                      }
                    `}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Agent avatar with status indicator */}
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-border/60 bg-muted flex items-center justify-center">
                            {meta.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={meta.avatar}
                                alt={meta.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-lg">{meta.emoji || '🤖'}</span>
                            )}
                          </div>
                          {isLatest && (
                            <motion.div
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card"
                            />
                          )}
                        </div>

                        {/* Agent info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-foreground">
                              {displayName}
                            </h4>
                            {isLatest && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary"
                              >
                                {getActionIcon(step.action)}
                                <span className="text-[10px] font-medium uppercase tracking-wide">
                                  {getActionLabel(step.action)}
                                </span>
                              </motion.div>
                            )}
                            {isLatest && step.action === 'delegating' && step.metadata?.delegatedTo && (
                              <motion.div
                                initial={{ opacity: 0, y: -2 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-300"
                              >
                                <ArrowRight className="w-3 h-3" weight="bold" />
                                <span>Delegated to {step.metadata.delegatedTo}</span>
                              </motion.div>
                            )}
                          </div>
                          
                          {/* Show progressive message if available, otherwise step content */}
                          {(progressMessages[step.id] || step.content) && (
                            <motion.p 
                              key={progressMessages[step.id] || step.content}
                              initial={{ opacity: 0, y: 2 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
                            >
                              {progressMessages[step.id] || step.content}
                            </motion.p>
                          )}
                          
                          {/* Progress bar for latest step */}
                          {isLatest && typeof step.progress === 'number' && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 h-1 bg-muted rounded-full overflow-hidden"
                            >
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${step.progress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full"
                              />
                            </motion.div>
                          )}
                        </div>

                        {/* Status icon */}
                        {!isLatest && (
                          <CheckCircle 
                            weight="fill" 
                            className="w-4 h-4 text-emerald-500/60 flex-shrink-0 mt-0.5" 
                          />
                        )}
                      </div>
                    </div>

                    {/* Subtle glow effect for active step */}
                    {isLatest && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Step counter */}
          {steps.length > 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-center"
            >
              <span className="text-xs text-muted-foreground/60">
                +{steps.length - 3} more steps
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function getActionLabel(action: PipelineStep['action']): string {
  switch (action) {
    case 'routing': return 'Routing'
    case 'analyzing': return 'Analyzing'
    case 'thinking': return 'Thinking'
    case 'delegating': return 'Delegating'
    case 'delegation': return 'Working'
    case 'responding': return 'Responding'
    case 'completing': return 'Completing'
    case 'reviewing': return 'Reviewing'
    case 'executing': return 'Executing'
    default: return 'Processing'
  }
}

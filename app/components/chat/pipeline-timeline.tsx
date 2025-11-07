"use client"

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useMemo, useState, useEffect } from "react"
import { getAgentMetadata } from "@/lib/agents/agent-metadata"
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react"
import { enrichStepWithContextualMessage, getProgressMessage } from "@/lib/agents/ui-messaging"
import { ExpandableStep } from "./expandable-step"
import { ReasoningViewer, type ReasoningBlock } from "./reasoning-viewer"
import { ToolDetails } from "./tool-details"

export type Action = 'analyzing' | 'thinking' | 'responding' | 'delegating' | 'completing' | 'routing' | 'reviewing' | 'supervising' | 'executing' | 'delegation'

export type PipelineStep = {
  id: string
  uniqueId?: string // ✅ UUID for idempotent deduplication
  timestamp: string | Date
  agent: string
  agentName?: string  // ✅ Friendly name for custom agents
  action: Action
  content: string
  progress?: number
  metadata?: any
}

function formatTime(ts: string | Date) {
  try {
    const d = typeof ts === 'string' ? new Date(ts) : ts
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}

function actionLabel(action: Action): string {
  switch (action) {
    case 'routing': return '🎯 Routing'
    case 'analyzing': return '🔍 Analyzing'
    case 'thinking': return '🧠 Thinking'
    case 'delegating': return '📋 Delegating'
    case 'delegation': return '⚡ Working'
    case 'responding': return '💬 Responding'
    case 'completing': return '✅ Completing'
    case 'reviewing': return '👁️ Reviewing'
    case 'supervising': return '🔍 Supervising'
    case 'executing': return '🔧 Executing'
    default: return String(action).charAt(0).toUpperCase() + String(action).slice(1)
  }
}

/**
 * Get semantic color for action type (subtle accent for visual distinction)
 * ✨ UPDATED: Modern gradient accents inspired by Linear UI redesign
 */
function actionColor(action: Action): string {
  switch (action) {
    case 'routing': return 'border-l-blue-500/60 dark:border-l-blue-400/50'
    case 'analyzing': return 'border-l-purple-500/60 dark:border-l-purple-400/50'
    case 'thinking': return 'border-l-indigo-500/60 dark:border-l-indigo-400/50'
    case 'delegating': return 'border-l-orange-500/60 dark:border-l-orange-400/50'
    case 'delegation': return 'border-l-orange-400/60 dark:border-l-orange-300/50'
    case 'responding': return 'border-l-green-500/60 dark:border-l-green-400/50'
    case 'completing': return 'border-l-emerald-500/60 dark:border-l-emerald-400/50'
    case 'reviewing': return 'border-l-yellow-500/60 dark:border-l-yellow-400/50'
    case 'supervising': return 'border-l-cyan-500/60 dark:border-l-cyan-400/50'
    case 'executing': return 'border-l-pink-500/60 dark:border-l-pink-400/50'
    default: return 'border-l-foreground/30'
  }
}

/**
 * Check if a step is completed
 */
function isStepCompleted(step: PipelineStep): boolean {
  return step.action === 'completing' || 
         (typeof step.progress === 'number' && step.progress >= 100)
}

/**
 * ✨ Typing Indicator Component - Modern 3-dot pulse animation
 * Based on Fuselab Creative chatbot UX patterns
 */
function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-3 py-2">
      <motion.div
        className="w-2 h-2 rounded-full bg-muted-foreground/40"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
      />
      <motion.div
        className="w-2 h-2 rounded-full bg-muted-foreground/40"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
      />
      <motion.div
        className="w-2 h-2 rounded-full bg-muted-foreground/40"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  )
}

/**
 * Componente de Step individual con typing effect para reasoning
 */
function StepContent({ step }: { step: PipelineStep }) {
  const [displayedContent, setDisplayedContent] = useState(step.content)
  const [isTyping, setIsTyping] = useState(false)
  
  useEffect(() => {
    // Solo aplicar typing effect si es un reasoning step reciente
    const isReasoningStep = step.metadata?.reasoning === true
    const isRecent = Date.now() - new Date(step.timestamp).getTime() < 5000 // 5 segundos
    
    if (isReasoningStep && isRecent && step.content.length > 20) {
      setIsTyping(true)
      setDisplayedContent('')
      
      let currentIndex = 0
      const typingSpeed = Math.max(10, Math.min(30, step.content.length / 100)) // Velocidad adaptativa
      
      const interval = setInterval(() => {
        if (currentIndex < step.content.length) {
          setDisplayedContent(step.content.slice(0, currentIndex + 1))
          currentIndex++
        } else {
          setIsTyping(false)
          clearInterval(interval)
        }
      }, typingSpeed)
      
      return () => clearInterval(interval)
    } else {
      setDisplayedContent(step.content)
      setIsTyping(false)
    }
  }, [step.content, step.metadata?.reasoning, step.timestamp])
  
  return (
    <div className={cn(
      "text-muted-foreground/90 mt-0.5 whitespace-pre-wrap",
      isTyping && "animate-pulse"
    )}>
      {displayedContent}
      {isTyping && <span className="text-primary animate-pulse ml-0.5">▊</span>}
    </div>
  )
}

export function PipelineTimeline({ steps, className }: { steps: PipelineStep[]; className?: string }) {
  // ✅ Auto-expand si hay menos de 5 steps (mensajes recientes)
  const [isExpanded, setIsExpanded] = useState((steps || []).length > 0 && (steps || []).length <= 5)

  const normalized = useMemo(() => {
    const filtered = (steps || [])
      .filter(s => {
        // ❌ Filter out "reviewing" phantom steps (legacy UI bug)
        if (s.action === 'reviewing') {
          return false
        }
        return true
      })
    
    const mapped = filtered.map(s => {
      // Map stage metadata to proper actions for better visualization
      let mappedAction = s.action
      if (s.metadata?.stage) {
        switch (s.metadata.stage) {
          case 'initializing':
          case 'analyzing':
            mappedAction = 'analyzing'
            break
          case 'processing':
            mappedAction = 'thinking'
            break
          case 'researching':
            mappedAction = 'thinking'
            break
          case 'finalizing':
            mappedAction = 'completing'
            break
          default:
            mappedAction = s.action
        }
      }
      
      const mappedStep = {
        ...s,
        action: mappedAction as PipelineStep['action'],
        timestamp: typeof s.timestamp === 'string' ? s.timestamp : s.timestamp.toISOString()
      }
      
      // ✅ PHASE 1: Skip re-enrichment for canonical steps (already humanized by step-builder)
      if (s.metadata?.canonical) {
        return mappedStep // Use as-is, already has humanized message
      }
      
      // ✅ Enriquecer con mensajes contextuales (solo si no es reasoning y no es canonical)
      // Los reasoning steps ya vienen con contenido humanizado del extractor
      if (!s.metadata?.reasoning) {
        return enrichStepWithContextualMessage(mappedStep)
      }
      
      return mappedStep
    })
    
    return mapped
  }, [steps])

  // Keep majority of steps; only dedupe by exact id to avoid dropping stages
  const uniqueSteps = useMemo(() => {
    const byId = new Map<string, typeof normalized[0]>()
    normalized.forEach(step => {
      byId.set(step.id, step)
    })
    return Array.from(byId.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [normalized])

  // Identify the latest step overall for collapsed preview
  const latestStep = useMemo(() => {
    if (!normalized.length) return null
    let latest = normalized[0]
    for (let i = 1; i < normalized.length; i++) {
      const s = normalized[i]
      if (new Date(s.timestamp).getTime() > new Date(latest.timestamp).getTime()) {
        latest = s
      }
    }
    return latest
  }, [normalized])
  
  // ✅ Progressive message based on elapsed time for long-running steps
  const [progressiveContent, setProgressiveContent] = useState<Record<string, string>>({})
  
  useEffect(() => {
    if (!latestStep) return
    
    const startTime = new Date(latestStep.timestamp).getTime()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed > 5000 && !latestStep.metadata?.reasoning) { // Solo para steps genéricos
        const progressMsg = getProgressMessage(
          latestStep.action,
          elapsed,
          latestStep.agentName
        )
        setProgressiveContent(prev => ({
          ...prev,
          [latestStep.id]: progressMsg
        }))
      }
    }, 5000) // Check every 5 seconds
    
    return () => clearInterval(interval)
  }, [latestStep])

  // Show all unique steps when expanded; when collapsed show just the latest live step
  const hasSteps = uniqueSteps.length > 0
  const VISIBLE_LIMIT = 12
  const visibleSteps = isExpanded ? uniqueSteps.slice(-VISIBLE_LIMIT) : []
  const hiddenCount = Math.max(0, uniqueSteps.length - VISIBLE_LIMIT)

  if (!hasSteps) return null

  return (
    <div className={cn(
      "border-border/50 bg-muted/20 relative w-full overflow-hidden rounded-xl border",
      !isExpanded && "py-1.5",
      className
    )}>
      <div className="bg-gradient-to-b from-background/60 to-transparent pointer-events-none absolute inset-0" />
      <div className="relative p-2 sm:p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-muted-foreground/80 text-[11px] uppercase tracking-wide font-medium flex items-center gap-2">
            {/* ✅ Subtle pulse on active steps */}
            <motion.span
              animate={latestStep && !isStepCompleted(latestStep) ? { 
                opacity: [1, 0.5, 1] 
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              ⛓️
            </motion.span>
            <span>Pipeline</span>
            {/* ✅ Step counter like Pokee workflow UI */}
            {uniqueSteps.length > 0 && (
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 text-[10px] font-mono"
              >
                <span className="text-foreground/70">{uniqueSteps.length}</span>
                <span className="text-muted-foreground/60">pasos</span>
              </motion.span>
            )}
          </div>
          {hasSteps && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground/60 hover:text-muted-foreground flex items-center gap-1 text-xs transition-colors"
            >
              {isExpanded ? (
                <>
                  <span>Collapse</span>
                  <CaretUpIcon size={14} />
                </>
              ) : (
                <>
                  <span>Show steps{hiddenCount > 0 ? ` (+${hiddenCount} more)` : ''}</span>
                  <CaretDownIcon size={14} />
                </>
              )}
            </button>
          )}
        </div>
        {!isExpanded && latestStep && (
          <div aria-live="polite" aria-atomic="true">
            <AnimatePresence initial={false} mode="popLayout">
              {(() => {
                const meta = getAgentMetadata(latestStep.agent, latestStep.agentName)
                const reasoningBlocks: ReasoningBlock[] = latestStep.metadata?.reasoningBlocks || []
                const toolName = latestStep.metadata?.toolName
                const toolParameters = latestStep.metadata?.toolParameters
                const toolResult = latestStep.metadata?.toolResult
                const toolError = latestStep.metadata?.toolError
                const toolStatus = latestStep.metadata?.toolStatus || (toolError ? 'error' : 'success')
                
                const otherMetadata = latestStep.metadata ? Object.fromEntries(
                  Object.entries(latestStep.metadata).filter(([key]) => 
                    !['reasoningBlocks', 'toolName', 'toolParameters', 'toolResult', 'toolError', 'toolStatus', 'reasoning', 'canonical', 'stage'].includes(key)
                  )
                ) : {}
                
                const stepChildren = (
                  <div className="space-y-3 mt-2">
                    {reasoningBlocks.length > 0 && (
                      <ReasoningViewer blocks={reasoningBlocks} />
                    )}
                    
                    {toolName && (
                      <ToolDetails
                        toolName={toolName}
                        parameters={toolParameters}
                        result={toolResult}
                        error={toolError}
                        status={toolStatus as any}
                      />
                    )}
                  </div>
                )
                
                return (
                  <ExpandableStep
                    key={latestStep.id}
                    id={latestStep.id}
                    agentId={latestStep.agent}
                    agentName={latestStep.agentName}
                    title={actionLabel(latestStep.action)}
                    subtitle={latestStep.agentName || meta.name}
                    timestamp={new Date(latestStep.timestamp)}
                    isActive={true}
                    isCompleted={isStepCompleted(latestStep)} // ✅ Show checkmark for completed steps
                    accentColor={actionColor(latestStep.action)} // ✅ Visual distinction by action type
                    metadata={{
                      reasoning: latestStep.metadata?.reasoning,
                      toolName: latestStep.metadata?.toolName,
                      canonical: latestStep.metadata?.canonical,
                    }}
                    defaultExpanded={false} // Collapsed view should not auto-expand
                  >
                    {latestStep.content && (
                      <div className="text-sm text-foreground/80 leading-relaxed mb-3">
                        <StepContent step={{
                          ...latestStep,
                          content: progressiveContent[latestStep.id] || latestStep.content
                        }} />
                      </div>
                    )}
                    
                    {/* ✅ Show typing indicator if step is active and not completed */}
                    {!isStepCompleted(latestStep) && !latestStep.content && (
                      <TypingIndicator />
                    )}
                    
                    {/* ✅ Modern Progress bar (same shimmer effect as expanded view) */}
                    {typeof latestStep.progress === 'number' && latestStep.progress < 100 && (
                      <div className="mb-3 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground/60">Progreso</span>
                          <span className="text-foreground/70 font-mono tabular-nums">
                            {Math.round(latestStep.progress)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40 relative">
                          {/* Shimmer effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-background/20 to-transparent"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          />
                          {/* Progress bar */}
                          <motion.div 
                            className="bg-gradient-to-r from-primary/80 via-primary to-primary/80 h-full relative"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(0, latestStep.progress))}%` }}
                            transition={{ 
                              duration: 0.8, 
                              ease: [0.4, 0.0, 0.2, 1]
                            }}
                          >
                            <div className="absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-primary-foreground/15 to-transparent" />
                          </motion.div>
                        </div>
                      </div>
                    )}
                    
                    {stepChildren}
                  </ExpandableStep>
                )
              })()}
            </AnimatePresence>
          </div>
        )}
        {isExpanded && (
          <ul className="grid gap-1.5">
            <AnimatePresence initial={false}>
              {visibleSteps.map((s, index) => {
                console.log('🎨 [EXPANDABLE-STEP] Rendering step:', {
                  id: s.id,
                  action: s.action,
                  hasMetadata: !!s.metadata,
                  hasReasoningBlocks: !!s.metadata?.reasoningBlocks,
                  hasToolName: !!s.metadata?.toolName,
                  canonical: s.metadata?.canonical
                })
                
                const meta = getAgentMetadata(s.agent, s.agentName)
                const isActive = index === visibleSteps.length - 1 // Last step is active
                
                // Parse reasoning blocks if present
                const reasoningBlocks: ReasoningBlock[] = s.metadata?.reasoningBlocks || []
                
                // Extract tool metadata
                const toolName = s.metadata?.toolName
                const toolParameters = s.metadata?.toolParameters
                const toolResult = s.metadata?.toolResult
                const toolError = s.metadata?.toolError
                const toolStatus = s.metadata?.toolStatus || (toolError ? 'error' : 'success')
                
                // Generate ExpandableStep children
                const stepChildren = (
                  <div className="space-y-3 mt-2">
                    {reasoningBlocks.length > 0 && (
                      <ReasoningViewer blocks={reasoningBlocks} />
                    )}
                    
                    {toolName && (
                      <ToolDetails
                        toolName={toolName}
                        parameters={toolParameters}
                        result={toolResult}
                        error={toolError}
                        status={toolStatus as any}
                      />
                    )}
                  </div>
                )
                
                return (
                  <ExpandableStep
                    key={s.id}
                    id={s.id}
                    agentId={s.agent}
                    agentName={s.agentName}
                    title={actionLabel(s.action)}
                    subtitle={s.agentName || meta.name}
                    timestamp={new Date(s.timestamp)}
                    isActive={isActive}
                    isCompleted={isStepCompleted(s)} // ✅ Show checkmark for completed steps
                    accentColor={actionColor(s.action)} // ✅ Visual distinction by action type
                    metadata={{
                      reasoning: s.metadata?.reasoning,
                      toolName: s.metadata?.toolName,
                      canonical: s.metadata?.canonical,
                    }}
                    defaultExpanded={isActive} // Auto-expand active step
                  >
                    {/* Main Content */}
                    {s.content && (
                      <div className="text-sm text-foreground/80 leading-relaxed mb-3">
                        <StepContent step={s} />
                      </div>
                    )}
                    
                    {/* ✅ Modern Progress Bar: Shimmer gradient + percentage label
                        Inspired by Linear UI and Stripe Dashboard loading states
                     */}
                    {typeof s.progress === 'number' && s.progress < 100 && (
                      <div className="mb-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground/70 font-medium">Progreso</span>
                          <motion.span 
                            className="text-foreground/80 font-mono tabular-nums"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={s.progress}
                          >
                            {Math.round(s.progress)}%
                          </motion.span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40 relative">
                          {/* Background shimmer effect (runs continuously on active progress) */}
                          {!isStepCompleted(s) && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-background/30 to-transparent"
                              animate={{
                                x: ['-100%', '200%']
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          )}
                          {/* Actual progress bar with gradient */}
                          <motion.div 
                            className="h-full bg-gradient-to-r from-primary/80 via-primary to-primary/80 relative overflow-hidden"
                            animate={{ width: `${Math.min(100, Math.max(0, s.progress))}%` }}
                            transition={{ 
                              duration: 0.8, 
                              ease: [0.4, 0.0, 0.2, 1] // Material Design easing
                            }}
                          >
                            {/* Subtle glow effect on the leading edge */}
                            <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-primary-foreground/20 to-transparent" />
                          </motion.div>
                        </div>
                      </div>
                    )}
                    
                    {/* Expandable Details */}
                    {stepChildren}
                  </ExpandableStep>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}

function StatusDot({ action }: { action: PipelineStep['action'] }) {
  const color = ((): string => {
    switch (action) {
      case 'routing': return 'bg-blue-500'
      case 'analyzing': return 'bg-amber-500'
      case 'thinking': return 'bg-purple-500'
      case 'delegating': return 'bg-cyan-500'
      case 'delegation': return 'bg-indigo-500'
      case 'responding': return 'bg-emerald-500'
      case 'executing': return 'bg-sky-500'
      case 'completing': return 'bg-slate-500'
      default: return 'bg-slate-400'
    }
  })()
  return (
    <div className="mt-1.5 h-2.5 w-2.5">
      <div className={cn('ring-border/60 h-2.5 w-2.5 rounded-full ring-2', color)} />
    </div>
  )
}

function AgentAvatar({ agentId }: { agentId: string }) {
  const meta = getAgentMetadata(agentId)
  const size = 28
  return (
    <div
      className="flex-shrink-0 h-[28px] w-[28px] overflow-hidden rounded-full ring ring-border/60 flex items-center justify-center"
      aria-label={meta.name || agentId}
    >
      {meta.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.avatar}
          alt={meta.name || agentId}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="bg-muted flex h-full w-full items-center justify-center text-[12px]">
          {meta.emoji || '🤖'}
        </div>
      )}
    </div>
  )
}

function AgentName({ agentId, agentName }: { agentId: string; agentName?: string }) {
  // Prioritize agentName from step data (for custom agents), fallback to metadata lookup
  if (agentName) {
    return <span>{agentName}</span>
  }
  const meta = getAgentMetadata(agentId)
  return <span>{meta.name || agentId.replace(/-/g, ' ')}</span>
}

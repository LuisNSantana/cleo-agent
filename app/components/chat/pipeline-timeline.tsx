"use client"

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useMemo, useState, useEffect } from "react";
import { enrichStepWithContextualMessage, getProgressMessage } from '@/lib/agents/ui-messaging';
import type { PipelineStep, Action, ReasoningBlock } from '@/lib/types/definitions';

// Re-export types for external usage
export type { PipelineStep, Action, ReasoningBlock };
import { ReasoningViewer } from './reasoning-viewer';
import { ToolDetails } from './tool-details';
import { ExpandableStep } from './expandable-step';
import { getAgentMetadata } from "@/lib/agents/agent-metadata"
import { CaretDownIcon, CaretUpIcon, CheckCircle } from "@phosphor-icons/react"



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
 * Check if the entire pipeline flow has completed
 * Pipeline is only completed if:
 * 1. There's a 'completing' step from the orchestrator
 * 2. AND there are NO active delegations (in_progress or researching)
 */
function isPipelineCompleted(steps: PipelineStep[]): boolean {
  const hasCompleting = steps.some(step => step.action === 'completing')
  if (!hasCompleting) return false
  
  // Check for active delegations
  const hasActiveDelegation = steps.some(step => 
    step.action === 'delegating' && 
    (step.metadata?.status === 'in_progress' || step.metadata?.stage === 'researching')
  )
  
  return !hasActiveDelegation // Only complete if no active delegations
}

/**
 * Calculate pipeline execution metrics including token usage
 */
function calculateMetrics(steps: PipelineStep[]) {
  if (!steps.length) return { totalTime: 0, completedSteps: 0, totalSteps: 0, progress: 0, totalTokens: 0 }
  
  const sortedSteps = [...steps].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  
  const firstStep = sortedSteps[0]
  const lastStep = sortedSteps[sortedSteps.length - 1]
  const totalTime = new Date(lastStep.timestamp).getTime() - new Date(firstStep.timestamp).getTime()
  
  const completedSteps = steps.filter(s => 
    s.action === 'completing' || 
    (typeof s.progress === 'number' && s.progress >= 100)
  ).length
  
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0
  
  // ✅ Calculate total tokens from metadata
  const totalTokens = steps.reduce((sum, step) => {
    const tokens = step.metadata?.tokens || 
                   step.metadata?.usage?.total_tokens || 
                   step.metadata?.tokenCount || 0
    return sum + tokens
  }, 0)
  
  return {
    totalTime: Math.round(totalTime / 1000), // en segundos
    completedSteps,
    totalSteps: steps.length,
    progress: Math.min(progress, 100),
    totalTokens
  }
}

/**
 * Get step type badge based on metadata
 */
function getStepTypeBadge(step: PipelineStep): { label: string; color: string } | null {
  const toolName = step.metadata?.toolName
  const isDelegation = step.action === 'delegating' || step.action === 'delegation'
  const hasReasoningBlocks = step.metadata?.reasoningBlocks && step.metadata.reasoningBlocks.length > 0
  
  if (toolName) {
    return { label: '🔧 TOOL', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' }
  }
  if (isDelegation) {
    return { label: '🤝 DELEGATION', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' }
  }
  if (hasReasoningBlocks || step.action === 'thinking') {
    return { label: '🧠 LLM', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' }
  }
  if (step.metadata?.requiresApproval) {
    return { label: '👤 HUMAN', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' }
  }
  
  return null
}

/**
 * Format time duration in human-readable format (lowercase)
 */
function formatDuration(seconds: number): string {
  if (seconds < 1) return '< 1s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (secs === 0) return `${mins}m`
  return `${mins}m ${secs}s`
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

type PipelineTimelineProps = {
  steps: PipelineStep[]
  className?: string
  onPause?: () => void
  onResume?: () => void
}

export function PipelineTimeline({ steps, className, onPause, onResume }: PipelineTimelineProps) {
  // ✅ Vista colapsada por defecto con diseño minimalista
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const normalized = useMemo(() => {
    const filtered = (steps || [])
      .filter(s => {
        // ❌ Filter out "reviewing" phantom steps (legacy UI bug)
        if (s.action === 'reviewing') {
          return false
        }
        // ✅ KEEP delegation steps (show delegation flow)
        // Only filter out very redundant ones
        if (s.action === 'delegating') {
          // Keep steps with meaningful status
          if (s.metadata?.status === 'in_progress' || s.metadata?.stage === 'researching' || s.metadata?.stage === 'processing') {
            return true
          }
          // Filter ONLY the generic "Delegating to X..." without context
          if (s.metadata?.status === 'starting' && !s.metadata?.task) {
            return false
          }
        }
        // ❌ Filter out "supervising" steps that appear AFTER completing
        if (s.action === 'supervising') {
          const hasCompletingBefore = (steps || []).some(step => 
            step.action === 'completing' && 
            new Date(step.timestamp).getTime() < new Date(s.timestamp).getTime()
          )
          if (hasCompletingBefore) return false
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

  // ✅ IMPROVED: Smart deduplication that removes redundant steps
  const uniqueSteps = useMemo(() => {
    const byId = new Map<string, typeof normalized[0]>()
    const completingSteps: typeof normalized = []
    
    normalized.forEach(step => {
      // Dedupe by ID first
      if (byId.has(step.id)) return
      
      // ✅ Collect all "completing" steps separately to consolidate later
      if (step.action === 'completing') {
        completingSteps.push(step)
        return
      }
      
      // ✅ IMPROVED: Smart deduplication for same action+agent pairs
      // Format: action-agent
      const signature = `${step.action}-${step.agent}`
      
      // Skip if we've seen the EXACT same action+agent recently
      const recentSteps = Array.from(byId.values()).slice(-5)
      const isDuplicate = recentSteps.some(recent => {
        const recentSig = `${recent.action}-${recent.agent}`
        const timeDiff = Math.abs(new Date(step.timestamp).getTime() - new Date(recent.timestamp).getTime())
        
        // ✅ LESS aggressive deduplication
        // Only dedupe if EXACT same signature AND very close in time
        const isHighDupeRisk = ['routing'].includes(step.action) // Only routing is high risk
        const timeWindow = isHighDupeRisk ? 5000 : 2000 // 5s for routing, 2s for others (reduced from 10s/3s)
        
        // ✅ DON'T dedupe delegation or execution steps (show progress)
        if (['delegating', 'executing', 'thinking'].includes(step.action)) {
          return false // Always show these
        }
        
        return recentSig === signature && timeDiff < timeWindow
      })
      
      if (!isDuplicate) {
        byId.set(step.id, step)
      }
    })
    
    // ✅ Keep only the FINAL "completing" step (the one from the main orchestrator)
    if (completingSteps.length > 0) {
      // Prefer the step from 'cleo-supervisor' or the last one chronologically
      const finalCompleting = completingSteps.find(s => s.agent === 'cleo-supervisor') || 
                             completingSteps[completingSteps.length - 1]
      byId.set(finalCompleting.id, finalCompleting)
    }
    
    return Array.from(byId.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [normalized])

  // Calculate pipeline metrics
  const metrics = useMemo(() => calculateMetrics(uniqueSteps), [uniqueSteps])

  // Identify the latest step overall for collapsed preview
  // Based on best practices from GitHub Actions, CircleCI, Airflow
  const summaryStep = useMemo(() => {
    if (!uniqueSteps.length) return null;

    // Helper: Get latest timestamp
    const getTimestamp = (step: any) => new Date(step.timestamp).getTime()
    
    // Helper: Check if a step is actively running (not completed)
    const isStepActive = (s: any) => {
      // Don't consider completing steps as active
      if (s.action === 'completing') return false
      
      // A step is active if it's started or in progress (not completed)
      return (
        s.metadata?.stage === 'started' || 
        s.metadata?.stage === 'in_progress' ||
        s.metadata?.status === 'in_progress'
      ) && s.metadata?.stage !== 'completed'
    }
    
    const hasActiveSteps = uniqueSteps.some(isStepActive)

    // 🔴 PRIORITY 1: ERROR/FAILURE STATE (requires immediate attention)
    const errorStep = uniqueSteps.find(s => 
      s.metadata?.status === 'error' || 
      s.metadata?.status === 'failed'
    )
    if (errorStep) return errorStep

    // 🟡 PRIORITY 2: USER INPUT REQUIRED (awaiting human action)
    const awaitingInput = uniqueSteps.find(s => 
      s.metadata?.type === 'interrupt' ||
      s.metadata?.status === 'awaiting_approval' ||
      s.metadata?.requiresApproval === true
    )
    if (awaitingInput) return awaitingInput

    // 🔵 PRIORITY 3: BLOCKING STEP - Active delegation (critical path)
    // Delegation blocks progress until sub-agent completes
    const activeDelegation = uniqueSteps
      .filter(s => 
        s.action === 'delegating' && 
        (s.metadata?.status === 'in_progress' || 
         s.metadata?.stage === 'researching' || 
         s.metadata?.stage === 'processing')
      )
      .sort((a, b) => getTimestamp(b) - getTimestamp(a))[0]
    
    if (activeDelegation) return activeDelegation

    // ✅ PRIORITY 4: COMPLETED (if completing step exists and no active work)
    // Show "completing" as soon as it appears and no tools are actively running
    const completingStep = uniqueSteps.find(s => s.action === 'completing')
    if (completingStep && !hasActiveSteps) {
      return completingStep
    }

    // 🟢 PRIORITY 5: MOST DOWNSTREAM RUNNING STEP (furthest in execution)
    // Show the most recent tool/action being executed (exclude completed ones)
    const runningSteps = uniqueSteps
      .filter(s => {
        // Exclude steps that already completed
        if (s.metadata?.stage === 'completed') return false
        
        return (
          (s.action === 'executing' && s.metadata?.stage === 'started') ||
          (s.action === 'thinking' && !s.metadata?.stage)
        )
      })
      .sort((a, b) => getTimestamp(b) - getTimestamp(a))
    
    if (runningSteps.length > 0) return runningSteps[0]

    // 🟢 PRIORITY 6: ROUTING/ANALYZING (initial stages)
    const routingStep = uniqueSteps
      .filter(s => s.action === 'routing' || s.action === 'analyzing')
      .sort((a, b) => getTimestamp(b) - getTimestamp(a))[0]
    
    if (routingStep && hasActiveSteps) return routingStep

    // 🔄 FALLBACK: If there's a completing step, show it
    // Otherwise show most recent step
    if (completingStep) return completingStep
    
    return uniqueSteps.sort((a, b) => getTimestamp(b) - getTimestamp(a))[0]
  }, [uniqueSteps]);
  
  // ✅ Progressive message based on elapsed time for long-running steps
  const [progressiveContent, setProgressiveContent] = useState<Record<string, string>>({})
  
  useEffect(() => {
    if (!summaryStep) return
    
    const startTime = new Date(summaryStep.timestamp).getTime()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed > 5000 && !summaryStep.metadata?.reasoning) { // Solo para steps genéricos
        const progressMsg = getProgressMessage(
          summaryStep.action,
          elapsed,
          summaryStep.agentName
        )
        setProgressiveContent(prev => ({
          ...prev,
          [summaryStep.id]: progressMsg
        }))
      }
    }, 5000) // Check every 5 seconds
    
    return () => clearInterval(interval)
  }, [summaryStep])

  // Show all unique steps when expanded and keep a compact preview for collapsed mode
  const hasSteps = uniqueSteps.length > 0
  const visibleSteps = isExpanded ? uniqueSteps : []
  const compactSteps = useMemo(() => uniqueSteps.slice(-3), [uniqueSteps])

  const estimatedRemainingSeconds = useMemo(() => {
    if (!summaryStep) return null
    const explicit = summaryStep.metadata?.etaSeconds ?? summaryStep.metadata?.estimatedRemainingSeconds
    if (typeof explicit === 'number' && !Number.isNaN(explicit)) {
      return explicit
    }
    if (metrics.completedSteps === 0 || metrics.totalSteps === 0) return null
    const avgStepDuration = metrics.totalTime / Math.max(1, metrics.completedSteps)
    const remainingSteps = Math.max(0, metrics.totalSteps - metrics.completedSteps)
    return Math.max(1, Math.round(avgStepDuration * remainingSteps))
  }, [summaryStep, metrics])

  const expectedCompletionLabel = estimatedRemainingSeconds ? formatDuration(estimatedRemainingSeconds) : null

  const handlePauseToggle = () => {
    setIsPaused((prev) => {
      const next = !prev
      if (next) {
        onPause?.()
      } else {
        onResume?.()
      }
      return next
    })
  }

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
          <div className="text-muted-foreground/80 text-[11px] uppercase tracking-wide font-medium flex items-center gap-2 flex-wrap">
            {/* ✅ Subtle pulse on active steps */}
            <motion.span
              animate={!isPipelineCompleted(uniqueSteps) ? { 
                opacity: [1, 0.5, 1] 
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              ⛓️
            </motion.span>
            <span>Pipeline</span>
            {/* ✅ Step counter with completion ratio */}
            {uniqueSteps.length > 0 && (
              <>
                <motion.span 
                  key={uniqueSteps.length}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.6 }}
                  className="text-[10px] tabular-nums"
                >
                  {metrics.completedSteps}/{metrics.totalSteps} pasos
                </motion.span>
                {/* ✅ Execution time */}
                {metrics.totalTime > 0 && (
                  <span className="text-[10px] tabular-nums opacity-50">
                    • {formatDuration(metrics.totalTime)}
                  </span>
                )}
                {/* ✅ Token usage */}
                {metrics.totalTokens > 0 && (
                  <span className="text-[10px] tabular-nums opacity-50">
                    • {metrics.totalTokens.toLocaleString()} tokens
                  </span>
                )}
              </>
            )}
          </div>
          {hasSteps && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* ✅ Global progress bar */}
              {!isPipelineCompleted(uniqueSteps) && metrics.totalSteps > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary/60 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 tabular-nums">
                    {Math.round(metrics.progress)}%
                  </span>
                </div>
              )}
              {expectedCompletionLabel && (
                <span className="text-[10px] text-muted-foreground/70 font-medium">
                  ETA ~ {expectedCompletionLabel}
                </span>
              )}
              <button
                onClick={handlePauseToggle}
                className={cn(
                  "text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full border transition-colors",
                  isPaused
                    ? "border-emerald-300/60 text-emerald-500/90 hover:bg-emerald-500/10"
                    : "border-primary/40 text-primary hover:bg-primary/10"
                )}
              >
                {isPaused ? "Reanudar" : "Pausar"}
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-muted-foreground/60 hover:text-foreground text-[10px] uppercase tracking-wide font-medium transition-colors flex items-center gap-1"
              >
                {isExpanded ? 'Ocultar' : 'Mostrar'}
                {isExpanded ? <CaretUpIcon className="w-3 h-3" /> : <CaretDownIcon className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>
        {!isExpanded && summaryStep && (
          <motion.div 
            className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/20 to-transparent rounded-lg cursor-pointer hover:bg-muted/30 transition-all"
            onClick={() => setIsExpanded(true)}
            whileHover={{ scale: 1.01 }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isPipelineCompleted(uniqueSteps) ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="flex-shrink-0"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">
                    {actionLabel(summaryStep.action)}
                  </p>
                  {/* ✅ Step Type Badge in collapsed view */}
                  {(() => {
                    const badge = getStepTypeBadge(summaryStep)
                    return badge ? (
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                        badge.color
                      )}>
                        {badge.label}
                      </span>
                    ) : null
                  })()}
                  {/* ✅ Time badge with better styling */}
                  {metrics.totalTime > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-muted-foreground/70 bg-muted/30">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDuration(metrics.totalTime)}
                    </span>
                  )}
                  {/* ✅ Token/Credit badge - show when available */}
                  {(() => {
                    const totalTokens = metrics.totalTokens
                    
                    // If we have tokens from metadata, show them
                    if (totalTokens > 0) {
                      return (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-purple-600/70 dark:text-purple-400/70 bg-purple-500/10">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                          </svg>
                          {totalTokens.toLocaleString()}
                        </span>
                      )
                    }
                    
                    // Otherwise show credit estimate if completed
                    if (isPipelineCompleted(uniqueSteps)) {
                      // Calculate estimated credits (1 credit ≈ 10k tokens for Grok)
                      const estimatedCredits = Math.max(1, Math.ceil(uniqueSteps.length / 2))
                      return (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-600/70 dark:text-emerald-400/70 bg-emerald-500/10" title="Créditos estimados (cálculo preciso en historial)">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.2"/>
                            <path d="M10 6v4l3 3" stroke="currentColor" strokeWidth="2" fill="none"/>
                          </svg>
                          ~{estimatedCredits}
                        </span>
                      )
                    }
                    
                    return null
                  })()}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <AgentAvatar agentId={summaryStep.agent} />
                  <p className="text-xs text-muted-foreground truncate">
                    {summaryStep.agentName || getAgentMetadata(summaryStep.agent).name}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {typeof summaryStep.progress === 'number' && summaryStep.progress < 100 && (
                <span className="text-xs text-muted-foreground font-mono">
                  {Math.round(summaryStep.progress)}%
                </span>
              )}
              <CaretDownIcon className="w-4 h-4 text-muted-foreground" />
            </div>
          </motion.div>
        )}
        {!isExpanded && compactSteps.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {compactSteps.map((step) => (
              <div
                key={step.id}
                className="flex items-center gap-2 text-xs text-muted-foreground/80 bg-muted/10 rounded-lg px-3 py-1.5"
              >
                <StatusDot action={step.action} />
                <span className="font-medium text-foreground/80">
                  {actionLabel(step.action)}
                </span>
                <span className="text-[11px] truncate flex-1">
                  {step.agentName || getAgentMetadata(step.agent).name}
                </span>
                {step.metadata?.toolName && (
                  <code className="text-[10px] bg-background/80 px-1 py-0.5 rounded border border-border/40">
                    {step.metadata.toolName}
                  </code>
                )}
              </div>
            ))}
          </div>
        )}
        {isExpanded && (
          <ul className="grid gap-1.5">
            <AnimatePresence initial={false}>
              {visibleSteps.map((s, index) => {
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
                const stepDurationSeconds =
                  typeof s.metadata?.executionTime === 'number'
                    ? s.metadata.executionTime
                    : (() => {
                        const next = visibleSteps[index + 1]
                        if (!next) return undefined
                        const diff =
                          (new Date(next.timestamp).getTime() -
                            new Date(s.timestamp).getTime()) /
                          1000
                        return diff > 0 ? Math.round(diff) : undefined
                      })()
                const etaSeconds =
                  typeof s.metadata?.etaSeconds === 'number'
                    ? s.metadata.etaSeconds
                    : typeof s.metadata?.estimatedRemainingSeconds === 'number'
                    ? s.metadata.estimatedRemainingSeconds
                    : undefined
                
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
                        executionTime={stepDurationSeconds}
                      />
                    )}
                  </div>
                )
                
                const badge = getStepTypeBadge(s)
                
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
                    badge={badge} // ✅ Pass badge to header for prominence
                    metadata={{
                      reasoning: s.metadata?.reasoning,
                      toolName: s.metadata?.toolName,
                      canonical: s.metadata?.canonical,
                    }}
                    defaultExpanded={isActive} // Auto-expand active step
                  >
                    {(stepDurationSeconds || etaSeconds) && (
                      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground/80 mb-2">
                        {stepDurationSeconds && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Duración {formatDuration(stepDurationSeconds)}
                          </span>
                        )}
                        {etaSeconds && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                            </svg>
                            ETA {formatDuration(etaSeconds)}
                          </span>
                        )}
                      </div>
                    )}
                    
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

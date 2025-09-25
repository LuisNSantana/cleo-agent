"use client"

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useMemo, useState } from "react"
import { getAgentMetadata } from "@/lib/agents/agent-metadata"
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react"

export type PipelineStep = {
  id: string
  timestamp: string | Date
  agent: string
  action: 'analyzing' | 'thinking' | 'responding' | 'delegating' | 'completing' | 'routing' | 'reviewing' | 'executing' | 'delegation'
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

function actionLabel(action: PipelineStep['action']) {
  switch (action) {
    case 'routing': return '🎯 Smart Routing'
    case 'analyzing': return '🔍 Analyzing Query'
    case 'thinking': return '🧠 Processing'
    case 'delegating': return '📋 Delegating'
    case 'delegation': return '⚡ Specialized Task'
    case 'responding': return '💬 Responding'
    case 'completing': return '✅ Finalizing'
    case 'reviewing': return '👁️ Supervising'
    case 'executing': return '🔧 Using Tool'
    default: return String(action).charAt(0).toUpperCase() + String(action).slice(1)
  }
}

export function PipelineTimeline({ steps, className }: { steps: PipelineStep[]; className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false) // Default collapsed to reduce UI footprint

  const normalized = useMemo(() => {
    return (steps || []).map(s => {
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
      
      return {
        ...s,
        action: mappedAction as PipelineStep['action'],
        timestamp: typeof s.timestamp === 'string' ? s.timestamp : s.timestamp.toISOString()
      }
    })
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
          <div className="text-muted-foreground/80 text-[11px] uppercase tracking-wide font-medium">
            ⛓️ Pipeline {isExpanded ? `(${uniqueSteps.length})` : `(collapsed)`}
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
              <motion.div
                key={latestStep.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', duration: 0.22, bounce: 0 }}
                className="bg-card/30 border-border/60 group relative grid grid-cols-[auto_auto_1fr_auto] items-start gap-2 rounded-lg border p-2 pr-2.5 text-xs sm:text-sm"
              >
                <StatusDot action={latestStep.action} />
                <AgentAvatar agentId={latestStep.agent} />
                <div className="min-w-0">
                  <div className="text-foreground/90 truncate font-medium">
                    {actionLabel(latestStep.action)} <span className="text-muted-foreground/70">·</span> <span className="text-muted-foreground text-[13px] sm:text-sm font-semibold"><AgentName agentId={latestStep.agent} /></span>
                  </div>
                  {latestStep.content ? (
                    <div className="text-muted-foreground/90 mt-0.5 line-clamp-1 whitespace-pre-wrap">
                      {latestStep.content}
                    </div>
                  ) : null}
                </div>
                <div className="text-muted-foreground/70 whitespace-nowrap pl-1 font-mono text-[10px] sm:text-xs">
                  {formatTime(latestStep.timestamp)}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        {isExpanded && (
          <ul className="grid gap-1.5">
            <AnimatePresence initial={false}>
              {visibleSteps.map((s) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', duration: 0.22, bounce: 0 }}
                className="bg-card/30 border-border/60 hover:bg-card/50 group relative grid grid-cols-[auto_auto_1fr_auto] items-start gap-2 rounded-lg border p-2 pr-2.5 text-xs sm:text-sm transition-colors"
              >
                <StatusDot action={s.action} />
                <AgentAvatar agentId={s.agent} />
                <div className="min-w-0">
                  <div className="text-foreground/90 truncate font-medium">
                    {actionLabel(s.action)} <span className="text-muted-foreground/70">·</span> <span className="text-muted-foreground text-[13px] sm:text-sm font-semibold"><AgentName agentId={s.agent} /></span>
                  </div>
                  {s.content ? (
                    <div className="text-muted-foreground/90 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                      {s.content}
                    </div>
                  ) : null}
                  {typeof s.progress === 'number' ? (
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="bg-primary h-full" style={{ width: `${Math.min(100, Math.max(0, s.progress))}%` }} />
                    </div>
                  ) : null}
                </div>
                <div className="text-muted-foreground/70 whitespace-nowrap pl-1 font-mono text-[10px] sm:text-xs">
                  {formatTime(s.timestamp)}
                </div>
              </motion.li>
              ))}
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

function AgentName({ agentId }: { agentId: string }) {
  const meta = getAgentMetadata(agentId)
  return <span>{meta.name || agentId.replace(/-/g, ' ')}</span>
}

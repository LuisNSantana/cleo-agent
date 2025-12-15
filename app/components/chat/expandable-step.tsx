"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { CaretRight, CheckCircle } from "@phosphor-icons/react"
import { getAgentMetadata } from "@/lib/agents/agent-metadata"

export type ExpandableStepProps = {
  id: string
  agentId: string // ✅ Cambiado de icon a agentId para usar AgentAvatar
  agentName?: string // ✅ Override name for custom agents
  title: string
  subtitle?: string
  timestamp?: string | Date
  isActive?: boolean
  isCompleted?: boolean // ✅ Show checkmark for completed steps
  children?: React.ReactNode
  metadata?: any
  defaultExpanded?: boolean
  className?: string
  accentColor?: string // ✅ Semantic color for visual distinction (e.g., 'border-l-blue-500/50')
  badge?: { label: string; color: string } | null // ✅ Step type badge (TOOL, DELEGATION, LLM, etc)
}

/**
 * ExpandableStep - Componente de paso expandible con animaciones fluidas
 * 
 * Inspirado en mejores prácticas de UX:
 * - NN/G: Progress indicators claros y animaciones suaves
 * - Vellum.ai: Acordeones interactivos para workflows complejos
 * - Designlab: 5-9 items óptimos, navegación clara
 */
export function ExpandableStep({
  id,
  agentId,
  agentName,
  title,
  subtitle,
  timestamp,
  isActive = false,
  isCompleted = false,
  children,
  metadata,
  defaultExpanded = false,
  className,
  accentColor,
  badge
}: ExpandableStepProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const agentMeta = getAgentMetadata(agentId, agentName)
  
  // Get initials from agent name for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  // Format timestamp helper
  const formatTimestamp = (ts: string | Date | undefined): string => {
    if (!ts) return ''
    try {
      const d = typeof ts === 'string' ? new Date(ts) : ts
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return String(ts)
    }
  }
  const hasExpandableContent = !!children

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "group relative w-full",
        className
      )}
    >
      {/* Step Header - Always visible */}
      <button
        onClick={() => hasExpandableContent && setIsExpanded(!isExpanded)}
        disabled={!hasExpandableContent}
        className={cn(
          "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
          "border-l-2", // ✅ Left accent border for visual distinction
          accentColor || "border-l-foreground/20", // ✅ Apply semantic color
          "hover:bg-muted/50",
          isActive && "bg-primary/5 ring-1 ring-primary/20",
          hasExpandableContent && "cursor-pointer",
          !hasExpandableContent && "cursor-default"
        )}
        aria-expanded={isExpanded}
        aria-controls={`step-content-${id}`}
      >
        {/* Avatar Container */}
        <div className="flex-shrink-0 mt-0.5">
          {agentMeta.avatar ? (
            <div className="h-7 w-7 rounded-full ring-1 ring-border/60 overflow-hidden">
              <img
                src={agentMeta.avatar}
                alt={agentMeta.name || agentId}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            // ✅ INITIALS FALLBACK: Modern UX standard
            <div 
              className="h-7 w-7 rounded-full ring-1 ring-border/60 flex items-center justify-center text-xs font-semibold text-white"
              style={{ backgroundColor: agentMeta.color || '#6366f1' }}
            >
              {agentMeta.initials || getInitials(agentMeta.name || agentId)}
            </div>
          )}
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title Row */}
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-medium text-sm leading-tight",
              isActive ? "text-foreground" : "text-foreground/90",
              isCompleted && "text-success/90"
            )}>
              {title}
            </h4>
            
            {/* ✅ Step Type Badge - Prominent in header */}
            {badge && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0",
                badge.color
              )}>
                {badge.label}
              </span>
            )}
            
            {/* ✅ Completed Checkmark */}
            {isCompleted && (
              <CheckCircle weight="fill" className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            )}
            
            {/* Timestamp Badge */}
            {timestamp && (
              <span className="text-xs text-muted-foreground/60 font-mono">
                {formatTimestamp(timestamp)}
              </span>
            )}
          </div>

          {/* Subtitle/Preview */}
          {subtitle && (
            <p className="text-xs text-muted-foreground/80 line-clamp-2">
              {subtitle}
            </p>
          )}

          {/* Metadata Badges - Solo mostrar toolName si existe */}
          {metadata?.toolName && !isExpanded && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full">
                🔧 {metadata.toolName}
              </span>
            </div>
          )}
        </div>

        {/* Chevron Icon - Only if expandable */}
        {hasExpandableContent && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-shrink-0 text-muted-foreground/60 mt-1"
          >
            <CaretRight className="h-4 w-4" weight="bold" />
          </motion.div>
        )}
      </button>

      {/* Expandable Content */}
      <AnimatePresence initial={false}>
        {isExpanded && hasExpandableContent && (
          <motion.div
            id={`step-content-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-11 pr-3 pb-3 pt-1">
              <div className={cn(
                "rounded-lg border border-border/50 bg-muted/30 p-4",
                "shadow-sm"
              )}>
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Indicator Bar */}
      {isActive && (
        <motion.div
          layoutId="active-step-indicator"
          className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </motion.div>
  )
}

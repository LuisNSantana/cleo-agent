"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { 
  Wrench, 
  CaretDown, 
  Copy, 
  CheckCircle,
  CircleNotch
} from "@phosphor-icons/react"

export type ToolDetailsProps = {
  toolName: string
  parameters?: Record<string, any>
  result?: any
  status?: 'pending' | 'success' | 'error'
  error?: string
  executionTime?: number // ✨ NEW: Execution time in milliseconds
  className?: string
}

/**
 * ToolDetails - Enhanced tool execution visualization
 * 
 * ✨ UPDATED with modern design patterns:
 * - Execution time display (performance transparency)
 * - Improved visual hierarchy with subtle gradients
 * - Better status indicators
 * - Copy-to-clipboard for debugging
 * - Collapsible sections with smooth animations
 * 
 * Based on:
 * - Linear UI redesign principles (reduce noise, maintain context)
 * - Fuselab Creative transparency-as-a-feature pattern
 * - Stripe Dashboard tool result visualization
 */
export function ToolDetails({
  toolName,
  parameters,
  result,
  status = 'success',
  error,
  executionTime,
  className
}: ToolDetailsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['parameters'])
  )

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const getStatusColor = () => {
    switch (status) {
      case 'pending': return 'amber'
      case 'success': return 'green'
      case 'error': return 'red'
      default: return 'gray'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
      case 'success': return <CheckCircle className="h-4 w-4" weight="duotone" />
      case 'error': return <CheckCircle className="h-4 w-4" weight="duotone" />
      default: return null
    }
  }

  return (
    <div className={cn(
      "space-y-3 rounded-lg border border-border/50 bg-gradient-to-br from-muted/20 via-muted/10 to-transparent p-3",
      className
    )}>
      {/* Header with improved visual hierarchy */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted/40">
              <Wrench className="h-3.5 w-3.5 text-foreground/70" weight="duotone" />
            </div>
            <span className="text-sm font-medium text-foreground/90">
              <code className="px-2 py-1 bg-muted/60 rounded-md text-xs font-mono border border-border/30">
                {toolName}
              </code>
            </span>
          </div>
          
          {/* Status Badge with modern styling */}
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm",
            getStatusColor() === 'amber' && "bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50",
            getStatusColor() === 'green' && "bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50",
            getStatusColor() === 'red' && "bg-red-50 text-red-700 border border-red-200/50 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50"
          )}>
            {getStatusIcon()}
            <span className="capitalize">{status}</span>
          </div>
        </div>
        
        {/* ✨ Execution time display (NEW) */}
        {executionTime !== undefined && (
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono tabular-nums">
              {executionTime < 1000 
                ? `${executionTime}ms` 
                : `${(executionTime / 1000).toFixed(2)}s`
              }
            </span>
            <span className="text-muted-foreground/50">execution time</span>
          </motion.div>
        )}
      </div>

      {/* Parameters Section */}
      {parameters && Object.keys(parameters).length > 0 && (
        <CollapsibleSection
          title="Parameters"
          isExpanded={expandedSections.has('parameters')}
          onToggle={() => toggleSection('parameters')}
          count={Object.keys(parameters).length}
        >
          <JSONDisplay data={parameters} />
        </CollapsibleSection>
      )}

      {/* Result Section */}
      {result && status === 'success' && (
        <CollapsibleSection
          title="Result"
          isExpanded={expandedSections.has('result')}
          onToggle={() => toggleSection('result')}
        >
          <JSONDisplay data={result} />
        </CollapsibleSection>
      )}

      {/* Error Section */}
      {error && status === 'error' && (
        <CollapsibleSection
          title="Error"
          isExpanded={expandedSections.has('error')}
          onToggle={() => toggleSection('error')}
          variant="error"
        >
          <div className="text-sm text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap">
            {error}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}

/**
 * CollapsibleSection - Sección expandible genérica
 */
function CollapsibleSection({
  title,
  isExpanded,
  onToggle,
  count,
  variant = 'default',
  children
}: {
  title: string
  isExpanded: boolean
  onToggle: () => void
  count?: number
  variant?: 'default' | 'error'
  children: React.ReactNode
}) {
  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-colors",
      variant === 'error' 
        ? "border-red-200 dark:border-red-900/50" 
        : "border-border hover:border-border/80"
    )}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-left transition-colors",
          variant === 'error'
            ? "bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30"
            : "bg-muted/30 hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <CaretDown className="h-3.5 w-3.5 text-foreground/60" weight="bold" />
          </motion.div>
          <span className="text-sm font-medium text-foreground/80">
            {title}
            {count !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({count} {count === 1 ? 'field' : 'fields'})
              </span>
            )}
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="px-3 py-2.5 bg-background">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * JSONDisplay - Visualiza JSON formateado con copy button
 */
function JSONDisplay({ data }: { data: any }) {
  const [copied, setCopied] = useState(false)
  const jsonString = JSON.stringify(data, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-md transition-all z-10",
          "opacity-0 group-hover:opacity-100",
          copied 
            ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" 
            : "bg-muted hover:bg-muted/80 text-muted-foreground"
        )}
        title={copied ? "Copied!" : "Copy JSON"}
      >
        {copied ? (
          <CheckCircle className="h-4 w-4" weight="bold" />
        ) : (
          <Copy className="h-4 w-4" weight="bold" />
        )}
      </button>

      <pre className="text-xs font-mono bg-muted/30 rounded-md p-3 overflow-x-auto max-h-96 overflow-y-auto">
        <code className="text-foreground/90">
          {highlightJSON(jsonString)}
        </code>
      </pre>
    </div>
  )
}

/**
 * highlightJSON - Simple JSON syntax highlighting
 */
function highlightJSON(json: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let currentIndex = 0

  // Simple regex-based highlighting (no external dependencies)
  const patterns = [
    { regex: /"([^"]+)":/g, className: "text-blue-600 dark:text-blue-400" }, // Keys
    { regex: /:\s*"([^"]*)"/g, className: "text-green-600 dark:text-green-400" }, // String values
    { regex: /:\s*(\d+)/g, className: "text-orange-600 dark:text-orange-400" }, // Numbers
    { regex: /:\s*(true|false|null)/g, className: "text-purple-600 dark:text-purple-400" }, // Booleans/null
  ]

  // For simplicity, just return formatted JSON with monospace
  // Advanced syntax highlighting would require a proper parser
  return json.split('\n').map((line, i) => (
    <div key={i}>
      {line.replace(/(".*?")/g, (match) => {
        if (match.endsWith(':')) {
          return `<span class="text-blue-600 dark:text-blue-400">${match.slice(0, -1)}</span>:`
        }
        return `<span class="text-green-600 dark:text-green-400">${match}</span>`
      })}
    </div>
  ))
}

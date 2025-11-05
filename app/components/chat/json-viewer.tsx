"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { 
  CaretRight,
  CaretDown,
  Copy,
  CheckCircle,
  MagnifyingGlass,
  X
} from "@phosphor-icons/react"

export type JSONViewerProps = {
  data: Record<string, any> | any[]
  title?: string
  className?: string
  defaultExpanded?: boolean
  maxDepth?: number
  showSearch?: boolean
}

/**
 * JSONViewer - Visor interactivo de estructuras JSON con búsqueda
 * 
 * Características:
 * - Árbol recursivo con expand/collapse
 * - Búsqueda en tiempo real (filtra keys y valores)
 * - Copy-to-clipboard por nodo
 * - Syntax highlighting con colores semánticos
 * - Responsive con scroll virtual para grandes datasets
 */
export function JSONViewer({
  data,
  title = "Metadata",
  className,
  defaultExpanded = false,
  maxDepth = 5,
  showSearch = true
}: JSONViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredData = useMemo(() => {
    if (!searchQuery) return data
    return filterJSON(data, searchQuery.toLowerCase())
  }, [data, searchQuery])

  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        No metadata available
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground/80">{title}</h4>
        <button
          onClick={handleCopyAll}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all",
            copied
              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
          title={copied ? "Copied!" : "Copy all JSON"}
        >
          {copied ? (
            <CheckCircle className="h-3.5 w-3.5" weight="bold" />
          ) : (
            <Copy className="h-3.5 w-3.5" weight="bold" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" weight="bold" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keys or values..."
            className={cn(
              "w-full pl-9 pr-9 py-2 text-sm rounded-md border border-border",
              "bg-background focus:outline-none focus:ring-2 focus:ring-primary/20",
              "placeholder:text-muted-foreground"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" weight="bold" />
            </button>
          )}
        </div>
      )}

      {/* JSON Tree */}
      <div className="border border-border rounded-lg bg-muted/20 overflow-hidden">
        <div className="max-h-96 overflow-y-auto p-3">
          <JSONNode
            data={filteredData}
            keyName="root"
            depth={0}
            maxDepth={maxDepth}
            defaultExpanded={defaultExpanded}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {searchQuery && Object.keys(filteredData).length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">
          No results found for "{searchQuery}"
        </div>
      )}
    </div>
  )
}

/**
 * JSONNode - Nodo recursivo del árbol JSON
 */
function JSONNode({
  data,
  keyName,
  depth,
  maxDepth,
  defaultExpanded,
  searchQuery
}: {
  data: any
  keyName: string
  depth: number
  maxDepth: number
  defaultExpanded: boolean
  searchQuery?: string
}) {
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded || depth === 0 || (searchQuery ? true : false)
  )

  const dataType = Array.isArray(data) ? 'array' : typeof data
  const isExpandable = dataType === 'object' || dataType === 'array'
  const childKeys = isExpandable ? Object.keys(data) : []
  const hasChildren = childKeys.length > 0

  // Auto-collapse if exceeds max depth
  const shouldAutoCollapse = depth >= maxDepth

  const getValueColor = (value: any): string => {
    if (value === null) return "text-purple-600 dark:text-purple-400"
    if (typeof value === 'boolean') return "text-purple-600 dark:text-purple-400"
    if (typeof value === 'number') return "text-orange-600 dark:text-orange-400"
    if (typeof value === 'string') return "text-green-600 dark:text-green-400"
    return "text-foreground/70"
  }

  const renderValue = (value: any): string => {
    if (value === null) return 'null'
    if (typeof value === 'boolean') return value.toString()
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'string') return `"${value}"`
    return ''
  }

  const renderPreview = (): string => {
    if (Array.isArray(data)) {
      return `Array(${data.length})`
    }
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data)
      return `Object{${keys.length}}`
    }
    return ''
  }

  return (
    <div className="text-xs font-mono">
      <div className="flex items-start gap-1.5 group">
        {/* Expand/Collapse Button */}
        {isExpandable && hasChildren && !shouldAutoCollapse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-0.5 p-0.5 hover:bg-muted rounded transition-colors"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <CaretRight className="h-3.5 w-3.5 text-foreground/60" weight="bold" />
            </motion.div>
          </button>
        )}

        {/* Indentation spacer for non-expandable */}
        {(!isExpandable || !hasChildren || shouldAutoCollapse) && (
          <div className="w-[18px]" />
        )}

        {/* Key */}
        <span className="text-blue-600 dark:text-blue-400 font-medium">
          {keyName !== 'root' && `${keyName}: `}
        </span>

        {/* Value or Preview */}
        {!isExpandable ? (
          <span className={getValueColor(data)}>
            {renderValue(data)}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {!isExpanded && renderPreview()}
            {isExpanded && (Array.isArray(data) ? '[' : '{')}
          </span>
        )}
      </div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {isExpandable && hasChildren && isExpanded && !shouldAutoCollapse && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pl-4 border-l border-border/50 ml-2 mt-1 space-y-1"
          >
            {childKeys.map((key) => (
              <JSONNode
                key={key}
                data={data[key]}
                keyName={key}
                depth={depth + 1}
                maxDepth={maxDepth}
                defaultExpanded={defaultExpanded}
                searchQuery={searchQuery}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Closing bracket */}
      {isExpandable && isExpanded && !shouldAutoCollapse && (
        <div className="text-muted-foreground ml-[18px]">
          {Array.isArray(data) ? ']' : '}'}
        </div>
      )}

      {/* Max depth indicator */}
      {shouldAutoCollapse && hasChildren && (
        <div className="text-muted-foreground ml-[18px] italic">
          ... ({childKeys.length} items, max depth reached)
        </div>
      )}
    </div>
  )
}

/**
 * filterJSON - Filtra recursivamente un objeto JSON por query
 */
function filterJSON(data: any, query: string): any {
  if (!query) return data

  if (Array.isArray(data)) {
    const filtered = data
      .map(item => filterJSON(item, query))
      .filter(item => item !== null && item !== undefined)
    return filtered.length > 0 ? filtered : []
  }

  if (typeof data === 'object' && data !== null) {
    const filtered: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(data)) {
      // Match key
      if (key.toLowerCase().includes(query)) {
        filtered[key] = value
        continue
      }

      // Match string value
      if (typeof value === 'string' && value.toLowerCase().includes(query)) {
        filtered[key] = value
        continue
      }

      // Recurse into nested objects/arrays
      if (typeof value === 'object') {
        const nestedFiltered = filterJSON(value, query)
        if (
          nestedFiltered && 
          (Array.isArray(nestedFiltered) 
            ? nestedFiltered.length > 0 
            : Object.keys(nestedFiltered).length > 0)
        ) {
          filtered[key] = nestedFiltered
        }
      }
    }

    return filtered
  }

  // Primitive values: match string representation
  return String(data).toLowerCase().includes(query) ? data : null
}

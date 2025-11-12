"use client"

import { cn } from "@/lib/utils"
import {
  CaretDownIcon,
  CheckCircleIcon,
  CodeIcon,
  CopyIcon,
  LinkIcon,
  NutIcon,
  SpinnerIcon,
  WrenchIcon,
} from "@phosphor-icons/react"
import { AnimatePresence, motion } from "framer-motion"
import { useMemo, useState } from "react"
import { getToolIcon } from "@/components/icons/tool-icons"
import { DocumentToolDisplay } from "@/components/chat/document-tool-display"
import { OpenDocumentToolDisplay } from "@/components/chat/open-document-tool-display"
import { GmailMessages, type GmailListItem } from "@/app/components/chat/gmail-messages"
import { getAgentMetadata } from "@/lib/agents/agent-metadata"
import dynamic from "next/dynamic"
import { 
  DelegationDisplay, 
  isDelegationToolInvocation, 
  extractDelegationInfo 
} from "@/app/components/chat/delegation-display"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const StockChartViewer = dynamic(() => import("@/components/markets/stock-chart-viewer"), { ssr: false })

// Define the tool invocation types based on how they're used in the codebase
interface ToolInvocation {
  state: "partial-call" | "call" | "result"
  toolName: string
  toolCallId: string
  args?: any
  result?: any
}

interface ToolInvocationUIPart {
  type: "tool-invocation"
  toolInvocation: ToolInvocation
}

interface ToolInvocationProps {
  toolInvocations: ToolInvocationUIPart[]
  className?: string
  defaultOpen?: boolean
}

const TRANSITION = {
  type: "spring" as const,
  duration: 0.2,
  bounce: 0,
}

export function ToolInvocation({
  toolInvocations,
  defaultOpen = false,
}: ToolInvocationProps) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen)

  const toolInvocationsData = Array.isArray(toolInvocations)
    ? toolInvocations
    : [toolInvocations]

  // Group tool invocations by toolCallId
  const groupedTools = toolInvocationsData.reduce(
    (acc, item) => {
      const { toolCallId } = item.toolInvocation
      if (!acc[toolCallId]) {
        acc[toolCallId] = []
      }
      acc[toolCallId].push(item)
      return acc
    },
    {} as Record<string, ToolInvocationUIPart[]>
  )

  const uniqueToolIds = Object.keys(groupedTools)
  const isSingleTool = uniqueToolIds.length === 1

  if (isSingleTool) {
    return (
      <SingleToolView
        toolInvocations={toolInvocationsData}
        defaultOpen={defaultOpen}
        className="mb-10"
      />
    )
  }

  return (
    <div className="mb-10">
      <div className="border-border flex flex-col gap-0 overflow-hidden rounded-md border">
        <button
          onClick={(e) => {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }}
          type="button"
          className="hover:bg-accent flex w-full flex-row items-center rounded-t-md px-3 py-2 transition-colors"
        >
          <div className="flex flex-1 flex-row items-center gap-2 text-left text-base">
            <NutIcon className="text-muted-foreground size-4" />
            <span className="text-sm">Tools executed</span>
            <div className="bg-secondary text-secondary-foreground rounded-full px-1.5 py-0.5 font-mono text-xs">
              {uniqueToolIds.length}
            </div>
          </div>
          <CaretDownIcon
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded ? "rotate-180 transform" : ""
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={TRANSITION}
              className="overflow-hidden"
            >
              <div className="px-3 pt-3 pb-3">
                <div className="space-y-2">
                  {uniqueToolIds.map((toolId) => {
                    const toolInvocationsForId = groupedTools[toolId]

                    if (!toolInvocationsForId?.length) return null

                    return (
                      <div
                        key={toolId}
                        className="pb-2 last:border-0 last:pb-0"
                      >
                        <SingleToolView
                          toolInvocations={toolInvocationsForId}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ResultBlock({
  parseError,
  renderResults,
}: {
  parseError: string | null
  renderResults: () => React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const content = (
    <div className="bg-background rounded border p-2 text-sm">
      {parseError ? (
        <div className="text-red-500">{parseError}</div>
      ) : (
        renderResults()
      )}
    </div>
  )
  return (
    <div className="group/result relative">
      <div className={cn("max-h-60 overflow-auto", !expanded && "max-h-40")}>{content}</div>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          <CaretDownIcon className={cn("h-3 w-3 transition-transform", expanded ? "rotate-180" : "")} />
          {expanded ? "Show less" : "Show more"}
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs"
          onClick={(e) => {
            try {
              const root = (e.currentTarget as HTMLElement).closest('.group\\/result') as HTMLElement | null
              const node = root?.querySelector('.bg-background') as HTMLElement | null
              const text = node ? (node.innerText || node.textContent || '') : ''
              if (text) navigator.clipboard.writeText(text)
            } catch {}
          }}
        >
          <CopyIcon className="h-3 w-3" /> Copy
        </button>
      </div>
    </div>
  )
}

type SingleToolViewProps = {
  toolInvocations: ToolInvocationUIPart[]
  defaultOpen?: boolean
  className?: string
}

function SingleToolView({
  toolInvocations,
  defaultOpen = false,
  className,
}: SingleToolViewProps) {
  // Group by toolCallId and pick the most informative state
  const groupedTools = toolInvocations.reduce(
    (acc, item) => {
      const { toolCallId } = item.toolInvocation
      if (!acc[toolCallId]) {
        acc[toolCallId] = []
      }
      acc[toolCallId].push(item)
      return acc
    },
    {} as Record<string, ToolInvocationUIPart[]>
  )

  // For each toolCallId, get the most informative state (result > call > requested)
  const toolsToDisplay = Object.values(groupedTools)
    .map((group) => {
      const resultTool = group.find(
        (item) => item.toolInvocation.state === "result"
      )
      const callTool = group.find(
        (item) => item.toolInvocation.state === "call"
      )
      const partialCallTool = group.find(
        (item) => item.toolInvocation.state === "partial-call"
      )

      // Return the most informative one
      return resultTool || callTool || partialCallTool
    })
    .filter(Boolean) as ToolInvocationUIPart[]

  if (toolsToDisplay.length === 0) return null

  // If there's only one tool, display it directly
  if (toolsToDisplay.length === 1) {
    return (
      <SingleToolCard
        toolData={toolsToDisplay[0]}
        defaultOpen={defaultOpen}
        className={className}
      />
    )
  }

  // If there are multiple tools, show them in a list
  return (
    <div className={className}>
      <div className="space-y-4">
        {toolsToDisplay.map((tool) => (
          <SingleToolCard
            key={tool.toolInvocation.toolCallId}
            toolData={tool}
            defaultOpen={defaultOpen}
          />
        ))}
      </div>
    </div>
  )
}

// New component to handle individual tool cards
function SingleToolCard({
  toolData,
  defaultOpen = false,
  className,
}: {
  toolData: ToolInvocationUIPart
  defaultOpen?: boolean
  className?: string
}) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen)
  const { toolInvocation } = toolData
  const { state, toolName, toolCallId, args } = toolInvocation
  const isLoading = state === "call"
  const isCompleted = state === "result"
  const result = isCompleted ? toolInvocation.result : undefined

  // Try to compute a duration from common fields in result payloads
  const durationLabel: string | null = useMemo(() => {
    try {
      const candidates: Array<number | undefined> = []
      const res = result as any
      if (!res) return null
      // Direct numeric fields
      candidates.push(res.durationMs, res.elapsedMs, res.tookMs, res.timeMs)
      // Nested metadata
      if (res.metadata) {
        candidates.push(res.metadata.durationMs, res.metadata.elapsedMs)
      }
      // AI SDK style text content that might be JSON
      if (res.content && Array.isArray(res.content)) {
        const textItem = res.content.find((i: any) => i?.type === 'text')
        if (textItem?.text) {
          try {
            const parsed = JSON.parse(textItem.text)
            candidates.push(parsed?.durationMs, parsed?.elapsedMs)
          } catch {}
        }
      }
      const ms = candidates.find((v) => typeof v === 'number' && isFinite(v!) && v! > 0)
      if (!ms) return null
      const n = Math.round(ms as number)
      return n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(1)}s`
    } catch { return null }
  }, [result])

  // Try to resolve delegation target agent for nicer UI
  const delegationAgentId: string | null = useMemo(() => {
    try {
      // Prefer explicit fields from result payload
      let pr: any = null
      if (isCompleted && result) {
        if (Array.isArray(result)) {
          pr = null
        } else if (typeof result === 'object' && result !== null && 'content' in result) {
          const textItem = (result as any).content?.find?.((i: any) => i?.type === 'text')
          if (textItem?.text) {
            try { pr = JSON.parse(textItem.text) } catch { pr = null }
          }
        } else if (typeof result === 'object' && result !== null) {
          pr = result
        }
      }
      const agentFromResult = pr?.agentId || pr?.targetAgent || null
      if (agentFromResult) return String(agentFromResult)

      // Infer from tool name like delegate_to_ami or delegate_to_ami_creative
      if (toolName?.startsWith('delegate_to_')) {
        const base = toolName.replace(/^delegate_to_/, '')
        // Common short-name mapping
        const shortMap: Record<string, string> = {
          ami: 'ami-creative',
          toby: 'toby-technical',
          peter: 'peter-financial',
          emma: 'emma-ecommerce',
          apu: 'apu-support',
          nora: 'nora-medical',
          jenn: 'jenn-community',
        }
        if (shortMap[base]) return shortMap[base]
        // Convert underscores back to hyphens
        return base.replace(/_/g, '-')
      }
    } catch {}
    return null
  }, [isCompleted, result, toolName])

  // Parse the result JSON if available
  const { parsedResult, parseError } = useMemo(() => {
    if (!isCompleted || !result) return { parsedResult: null, parseError: null }

    try {
      if (Array.isArray(result))
        return { parsedResult: result, parseError: null }

      if (
        typeof result === "object" &&
        result !== null &&
        "content" in result
      ) {
        const textContent = result.content?.find(
          (item: { type: string }) => item.type === "text"
        )
        if (!textContent?.text) return { parsedResult: null, parseError: null }

        try {
          return {
            parsedResult: JSON.parse(textContent.text),
            parseError: null,
          }
        } catch {
          return { parsedResult: textContent.text, parseError: null }
        }
      }

      return { parsedResult: result, parseError: null }
    } catch {
      return { parsedResult: null, parseError: "Failed to parse result" }
    }
  }, [isCompleted, result])

  // Format the arguments for display
  const formattedArgs = args
    ? Object.entries(args).map(([key, value]) => (
        <div key={key} className="mb-1">
          <span className="text-muted-foreground font-medium">{key}:</span>{" "}
          <span className="font-mono">
            {typeof value === "object"
              ? value === null
                ? "null"
                : Array.isArray(value)
                  ? value.length === 0
                    ? "[]"
                    : JSON.stringify(value)
                  : JSON.stringify(value)
              : String(value)}
          </span>
        </div>
      ))
    : null

  // Render generic results based on their structure
  const renderResults = () => {
    if (!parsedResult) return "No result data available"

    // Special-case: Delegation tools → render DelegationDisplay component
    if (isDelegationToolInvocation(toolName, args)) {
      const delegationInfo = extractDelegationInfo(args, delegationAgentId || undefined)
      if (delegationInfo) {
        // Extract result text from parsedResult if available
        let resultText: string | undefined
        if (typeof parsedResult === 'string') {
          resultText = parsedResult
        } else if (parsedResult && typeof parsedResult === 'object' && 'content' in parsedResult) {
          resultText = String((parsedResult as any).content || '')
        } else if (parsedResult && typeof parsedResult === 'object' && 'result' in parsedResult) {
          resultText = String((parsedResult as any).result || '')
        }

        return (
          <DelegationDisplay
            targetAgent={delegationInfo.targetAgent}
            task={delegationInfo.task}
            context={delegationInfo.context}
            outputFormat={delegationInfo.outputFormat}
            result={resultText}
            isCompleted={isCompleted}
          />
        )
      }
    }

    // Special-case: stockChartAndVolatility → render chart viewer
    if (toolName === "stockChartAndVolatility" && parsedResult && typeof parsedResult === 'object') {
      const pr: any = parsedResult
      return (
        <div className="space-y-3">
          <StockChartViewer
            symbol={pr.symbol}
            period={pr.period}
            timeframe={pr.timeframe}
            finance_summary={pr.finance_summary}
            volatility_proxy={pr.volatility_proxy}
            chart_candidates={pr.chart_candidates}
          />
        </div>
      )
    }

    // Handle createDocumentTool specifically
    if (toolName === "createDocument" && parsedResult) {
      return <DocumentToolDisplay result={parsedResult} />
    }

    // Handle openDocumentTool specifically
    if (toolName === "openDocument" && parsedResult) {
      return <OpenDocumentToolDisplay result={parsedResult} />
    }

    // Gmail: render nicer list for listGmailMessages results
    if (
      toolName === "listGmailMessages" &&
      (
        // Case A: tool returned a raw array of items
        (Array.isArray(parsedResult) &&
          parsedResult.length > 0 &&
          typeof parsedResult[0] === "object" &&
          parsedResult[0] !== null &&
          "from" in parsedResult[0] &&
          "subject" in parsedResult[0]) ||
        // Case B: tool returned an object with a messages array
        (typeof parsedResult === "object" &&
          parsedResult !== null &&
          Array.isArray((parsedResult as any).messages) &&
          (parsedResult as any).messages.length > 0)
      )
    ) {
      const items = Array.isArray(parsedResult)
        ? (parsedResult as GmailListItem[])
        : (((parsedResult as any).messages ?? []) as GmailListItem[])
      return <GmailMessages items={items} />
    }

    // Handle array of items with url, title, and snippet (like search results)
    if (Array.isArray(parsedResult) && parsedResult.length > 0) {
      // Check if items look like search results
      if (
        parsedResult[0] &&
        typeof parsedResult[0] === "object" &&
        "url" in parsedResult[0] &&
        "title" in parsedResult[0]
      ) {
        return (
          <div className="space-y-3">
            {parsedResult.map(
              (
                item: { url: string; title: string; snippet?: string },
                index: number
              ) => (
                <div
                  key={index}
                  className="border-border border-b pb-3 last:border-0 last:pb-0"
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary group flex items-center gap-1 font-medium hover:underline"
                  >
                    {item.title}
                    <LinkIcon className="h-3 w-3 opacity-70 transition-opacity group-hover:opacity-100" />
                  </a>
                  <div className="text-muted-foreground mt-1 font-mono text-xs">
                    {item.url}
                  </div>
                  {item.snippet && (
                    <div className="mt-1 line-clamp-2 text-sm">
                      {item.snippet}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )
      }

      // Generic array display
      return (
        <div className="font-mono text-xs">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(parsedResult, null, 2)}
          </pre>
        </div>
      )
    }

    // Handle object results
    if (typeof parsedResult === "object" && parsedResult !== null) {
      const resultObj = parsedResult as Record<string, unknown>
      const title = typeof resultObj.title === "string" ? resultObj.title : null
      const htmlUrl =
        typeof resultObj.html_url === "string" ? resultObj.html_url : null

      return (
        <div>
          {title && <div className="mb-2 font-medium">{title}</div>}
          {htmlUrl && (
            <div className="mb-2">
              <a
                href={htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary flex items-center gap-1 hover:underline"
              >
                <span className="font-mono">{htmlUrl}</span>
                <LinkIcon className="h-3 w-3 opacity-70" />
              </a>
            </div>
          )}
          <div className="font-mono text-xs">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(parsedResult, null, 2)}
            </pre>
          </div>
        </div>
      )
    }

    // Handle string results
    if (typeof parsedResult === "string") {
      const cleaned = parsedResult
        .replace(/<function_calls>[\s\S]*?<\/function_calls>/g, '')
        .replace(/<invoke[^>]*>[\s\S]*?<\/invoke>/g, '')
        .replace(/<parameters?>[\s\S]*?<\/parameters?>/g, '')
        .trim()
      return <div className="whitespace-pre-wrap">{cleaned}</div>
    }

    // Fallback
    return "No result data available"
  }

  const parameterPreview = useMemo(() => {
    if (!args || Object.keys(args).length === 0) {
      return "Sin parámetros declarados"
    }
    return Object.entries(args)
      .slice(0, 4)
      .map(([key, value]) => {
        const serialized =
          typeof value === "string"
            ? value
            : JSON.stringify(value, null, 2)
        return `${key}: ${serialized}`.slice(0, 120)
      })
      .join("\n")
  }, [args])

  const resultPreview = useMemo(() => {
    if (!parsedResult) return null
    if (typeof parsedResult === "string") {
      return parsedResult.replace(/\s+/g, " ").trim()
    }
    if (typeof parsedResult === "object") {
      const candidate =
        (parsedResult as any).summary ||
        (parsedResult as any).text ||
        (parsedResult as any).result
      if (typeof candidate === "string") {
        return candidate.replace(/\s+/g, " ").trim()
      }
    }
    return null
  }, [parsedResult])

  return (
    <div
      className={cn(
        "border-border flex flex-col gap-0 overflow-hidden rounded-md border",
        className
      )}
    >
      <button
        onClick={(e) => {
          e.preventDefault()
          setIsExpanded(!isExpanded)
        }}
        type="button"
        className="hover:bg-accent flex w-full flex-row items-center rounded-t-md px-3 py-2 transition-colors"
      >
        <div className="flex flex-1 flex-row items-center gap-2 text-left text-base">
          {delegationAgentId ? (() => {
            const meta = getAgentMetadata(delegationAgentId)
            if (meta.avatar) {
               
              return (
                <img
                  src={meta.avatar}
                  alt={meta.name}
                  className="ring-border/60 hidden h-6 w-6 rounded-full ring sm:inline"
                />
              )
            }
            return (
              <div
                className="ring-border/60 hidden h-6 w-6 select-none items-center justify-center rounded-full ring sm:inline"
                aria-label={meta.name}
                title={meta.name}
              >
                <span className="text-base leading-6">{meta.emoji || '🤖'}</span>
              </div>
            )
          })() : null}
          {(() => {
            const ToolIcon = getToolIcon(toolName)
            return <ToolIcon className="text-muted-foreground size-4" />
          })()}
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span className="font-mono text-sm cursor-help">
                {toolName}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs whitespace-pre-wrap text-xs">
              {parameterPreview}
            </TooltipContent>
          </Tooltip>
          {delegationAgentId ? (
            <span className="text-muted-foreground hidden text-sm sm:inline">
              · {getAgentMetadata(delegationAgentId).name}
            </span>
          ) : null}
          <AnimatePresence mode="popLayout" initial={false}>
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                transition={{ duration: 0.15 }}
                key="loading"
              >
                <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                  <SpinnerIcon className="mr-1 h-3 w-3 animate-spin" />
                  Running
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                transition={{ duration: 0.15 }}
                key="completed"
              >
                <div className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-1.5 py-0.5 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                  <CheckCircleIcon className="mr-1 h-3 w-3" />
                  Completed
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {durationLabel && (
            <span className="ml-1 inline-flex items-center rounded-full border border-border/60 bg-card/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {durationLabel}
            </span>
          )}
        </div>
        <CaretDownIcon
          className={cn(
            "h-4 w-4 transition-transform",
            isExpanded ? "rotate-180 transform" : ""
          )}
        />
      </button>
      {!isExpanded && resultPreview && (
        <div className="mx-3 mb-1 text-[11px] text-muted-foreground/80 line-clamp-2">
          {resultPreview}
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={TRANSITION}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-3 pt-3 pb-3">
              {/* Arguments section - Hide for delegations (shown in DelegationDisplay) */}
              {args && Object.keys(args).length > 0 && !isDelegationToolInvocation(toolName, args) && (
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-medium">
                    Arguments
                  </div>
                  <div className="bg-background rounded border p-2 text-sm">
                    {formattedArgs}
                  </div>
                </div>
              )}

              {/* Result section */}
              {isCompleted && (
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-medium">
                    Result
                  </div>
                  <ResultBlock
                    parseError={parseError}
                    renderResults={renderResults}
                  />
                </div>
              )}

              {/* Tool call ID */}
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <CodeIcon className="mr-1 inline size-3" />
                  Tool Call ID:{" "}
                  <span className="ml-1 font-mono">{toolCallId}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

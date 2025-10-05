import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { cn } from "@/lib/utils"
import type { UIMessage as MessageAISDK } from "ai"
import { ArrowClockwiseIcon, CheckIcon, CopyIcon } from "@phosphor-icons/react"
import { useState, useCallback } from "react"
import { getSources } from "./get-sources"
import { Reasoning } from "./reasoning"
import { SearchImages } from "./search-images"
import { SourcesList } from "./sources-list"
import { ToolInvocation } from "./tool-invocation"
import { AssistantMessageWithFiles } from '@/components/chat/smart-message'
import { OpenDocumentToolDisplay } from '@/components/chat/open-document-tool-display'
import { DocumentToolDisplay } from '@/components/chat/document-tool-display'
import { useMemo } from 'react'
import { PipelineTimeline, type PipelineStep } from '@/app/components/chat/pipeline-timeline'
import { OptimizationInsights, extractPipelineOptimizations } from '@/app/components/chat/optimization-insights'
import { Loader } from '@/components/prompt-kit/loader'

type MessageAssistantProps = {
  children: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  copied?: boolean
  copyToClipboardAction?: () => void
  onReloadAction?: () => void
  parts?: MessageAISDK["parts"]
  status?: "streaming" | "ready" | "submitted" | "error"
  className?: string
  userMessage?: string // Añadido para detección de archivos
}

// Removed extra inline "Editar en Canvas" action to keep the actions row clean.

export function MessageAssistant({
  children,
  isLast,
  hasScrollAnchor,
  // copied, // Ignore this prop, manage state locally
  copyToClipboardAction,
  onReloadAction,
  parts,
  status,
  className,
  userMessage,
}: MessageAssistantProps) {
  const [copied, setCopied] = useState(false) // Local state
  const { preferences } = useUserPreferences()
  const sources = getSources(parts)
  
  // Local copy function that manages its own state
  const handleCopyToClipboard = useCallback(() => {
    if (copyToClipboardAction) {
      copyToClipboardAction() // Call the original function
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 500)
  }, [copyToClipboardAction])
  
  const toolInvocationParts = parts?.filter(
    (part: any) => {
      if (part.type !== "tool-invocation") return false
      
      // Filter out pipeline-related tool invocations
      const toolName = part.toolInvocation?.toolName || ''
      const toolCallId = part.toolInvocation?.toolCallId || ''
      
      // Skip if it's a pipeline step masquerading as a tool
      const isPipelineStep = toolCallId.startsWith('pipeline-') || 
                            toolCallId.includes('delegation_') ||
                            toolName.startsWith('delegate:')
      
      if (isPipelineStep) {
        console.log('🚫 [FRONTEND DEBUG] Filtering out pipeline tool:', {
          toolName,
          toolCallId,
          reason: 'Pipeline step should not appear as tool'
        })
        return false
      }

      // Hide createDocument tool chip because we render an inline card in the message body
      if (toolName === 'createDocument') return false
      
      return true
    }
  )

  // Extract execution steps (injected via SSE as { type: 'execution-step', step })
  const pipelineSteps: PipelineStep[] = useMemo(() => {
    try {
      const steps = (parts || [])
        .filter((p: any) => p && p.type === 'execution-step' && p.step)
        .map((p: any) => p.step)
        .filter(Boolean)
      return steps as PipelineStep[]
    } catch {
      return []
    }
  }, [parts])

  // Extract optimization insights from pipeline data
  const optimizationData = useMemo(() => {
    if (pipelineSteps.length === 0) return null
    return extractPipelineOptimizations(pipelineSteps, toolInvocationParts || [])
  }, [pipelineSteps, toolInvocationParts])

  // Extract createDocument result so we can render the document card inline in the assistant message
  const createDocumentResult = (() => {
    try {
      const docPart = parts?.find(
        (part: any) =>
          part.type === 'tool-invocation' &&
          part.toolInvocation?.state === 'result' &&
          part.toolInvocation?.toolName === 'createDocument' &&
          part.toolInvocation?.result
      ) as any

      if (!docPart) return null
      const result = docPart.toolInvocation?.result

      // Result can be a raw object or an object with AI-SDK style { content: [{ type: 'text', text }] }
      if (Array.isArray(result)) return null

      if (result && typeof result === 'object' && 'content' in result) {
        const textItem = (result as any).content?.find?.((i: any) => i?.type === 'text')
        if (textItem?.text) {
          try {
            return JSON.parse(textItem.text)
          } catch {
            return null
          }
        }
      }

      return result ?? null
    } catch {
      return null
    }
  })()
  
  // Extract openDocument result so we can render the document card inline in the assistant message
  const openDocumentResult = (() => {
    try {
      const openDocPart = toolInvocationParts?.find(
        (part: any) =>
          part.type === 'tool-invocation' &&
          part.toolInvocation?.state === 'result' &&
          part.toolInvocation?.toolName === 'openDocument' &&
          part.toolInvocation?.result
      ) as any

      if (!openDocPart) return null
      const result = openDocPart.toolInvocation?.result

      // Result can be a raw object or an object with AI-SDK style { content: [{ type: 'text', text }] }
      if (Array.isArray(result)) return null

      if (result && typeof result === 'object' && 'content' in result) {
        const textItem = (result as any).content?.find?.((i: any) => i?.type === 'text')
        if (textItem?.text) {
          try {
            return JSON.parse(textItem.text)
          } catch {
            // If not JSON, ignore to avoid rendering incorrect shape
            return null
          }
        }
      }

      // Otherwise assume it's already the structured result
      return result ?? null
    } catch {
      return null
    }
  })()
  
  // Handle AI SDK v5 reasoning parts
  const reasoningParts = parts?.filter((part: any) => part.type === "reasoning")
  const reasoningTextFromParts = (reasoningParts?.map((part: any) => (part as any).text).filter(Boolean).join("\n") || "")
  
  // Extract thinking from message content if present (fallback for text-based reasoning)
  let extractedThinking = null
  let cleanedContent = children
  
  if (typeof children === 'string') {
    
    // Try to extract <thinking> tags first
    if (children.includes('<thinking>')) {
      const thinkingMatch = children.match(/<thinking>([\s\S]*?)<\/thinking>/);
      if (thinkingMatch) {
        extractedThinking = thinkingMatch[1].trim()
        cleanedContent = children.replace(/<thinking>[\s\S]*?<\/thinking>\s*/, '').trim()
      } else {
        // Handle streaming case where thinking tag is not yet closed
        const thinkingStart = children.indexOf('<thinking>')
        if (thinkingStart !== -1) {
          const thinkingContent = children.substring(thinkingStart + 10) // 10 is length of '<thinking>'
          if (thinkingContent.length > 0) {
            extractedThinking = thinkingContent
            cleanedContent = children.substring(0, thinkingStart).trim()
          }
        }
      }
    }
    // Try to extract "thought:" and "content:" format if no thinking tags
    else if (children.includes('thought:') && children.includes('content:')) {
      const thoughtMatch = children.match(/thought:\s*([\s\S]*?)(?=content:|$)/i);
      const contentMatch = children.match(/content:\s*([\s\S]*)/i);
      
      if (thoughtMatch && contentMatch) {
        extractedThinking = thoughtMatch[1].trim()
        cleanedContent = contentMatch[1].trim()
      }
  }
  }
  // Decide which reasoning text to show: prefer SDK parts if non-empty, else fallback to extracted <thinking>
  const effectiveReasoningText = (reasoningTextFromParts && reasoningTextFromParts.trim().length > 0)
    ? reasoningTextFromParts
    : (extractedThinking || "")
  
  const contentNullOrEmpty = cleanedContent === null || cleanedContent === ""
  const isLastStreaming = status === "streaming" && isLast
  const searchImageResults =
    parts
      ?.filter(
        (part: any) =>
          part.type === "tool-invocation" &&
          part.toolInvocation?.state === "result" &&
          part.toolInvocation?.toolName === "imageSearch" &&
          part.toolInvocation?.result?.content?.[0]?.type === "images"
      )
      .flatMap((part: any) =>
        part.type === "tool-invocation" &&
        part.toolInvocation?.state === "result" &&
        part.toolInvocation?.toolName === "imageSearch" &&
        part.toolInvocation?.result?.content?.[0]?.type === "images"
          ? (part.toolInvocation?.result?.content?.[0]?.results ?? [])
          : []
      ) ?? []

  // Debug logs removed for production cleanliness

  return (
    <Message
      className={cn(
        "message-item group flex w-full max-w-4xl flex-1 items-start gap-4 px-4 md:px-6 py-6 message-enter transition-colors bg-muted/20",
        hasScrollAnchor && "min-h-scroll-anchor",
        className
      )}
    >
      <div className={cn("flex min-w-full flex-col gap-3", isLast && "pb-8")}>
        {/* Show reasoning when available (prefer parts, else <thinking>) or while streaming */}
        {(effectiveReasoningText || status === "streaming") && (
          <Reasoning
            reasoning={effectiveReasoningText}
            isStreaming={status === "streaming"}
          />
        )}

        {/* Pipeline timeline removed - now handled globally in conversation.tsx */}

        {toolInvocationParts &&
          toolInvocationParts.length > 0 &&
          preferences.showToolInvocations && (
            <ToolInvocation toolInvocations={toolInvocationParts as any} />
        )}        {searchImageResults.length > 0 && (
          <SearchImages results={searchImageResults} />
        )}

        {/* Show the createDocument card inline in the assistant body for better UX */}
        {createDocumentResult ? (
          <div className="mb-3">
            <DocumentToolDisplay result={createDocumentResult as any} />
          </div>
        ) : null}

        {/* Show the openDocument card inline in the assistant body for better UX */}
        {openDocumentResult ? (
          <div className="mb-3">
            <OpenDocumentToolDisplay result={openDocumentResult as any} />
          </div>
        ) : null}

        {contentNullOrEmpty ? (
          status === 'streaming' && pipelineSteps.length === 0 ? (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader />
              <span>Escribiendo…</span>
            </div>
          ) : null
        ) : (
          <AssistantMessageWithFiles 
            content={cleanedContent} 
            userMessage={userMessage}
            isStreaming={status === "streaming"}
          />
        )}

        {sources && sources.length > 0 && <SourcesList sources={sources} />}

  {Boolean(isLastStreaming || contentNullOrEmpty) ? null : (
          <MessageActions
            className={cn(
              "message-actions -ml-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            )}
          >
            <MessageAction
              tooltip={copied ? "Copiado!" : "Copiar texto"}
              side="bottom"
            >
              <button
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-lg bg-transparent transition-all scale-on-active hover-lift"
                aria-label="Copy text"
                onClick={handleCopyToClipboard}
                type="button"
              >
                {copied ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </button>
            </MessageAction>
            {isLast ? (
              <MessageAction
                tooltip="Regenerar"
                side="bottom"
                delayDuration={0}
              >
                <button
                  className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-lg bg-transparent transition-all scale-on-active hover-lift"
                  aria-label="Regenerate"
                  onClick={onReloadAction}
                  type="button"
                >
                  <ArrowClockwiseIcon className="size-4" />
                </button>
              </MessageAction>
            ) : null}
            {/* Canvas open now handled via file detection when a document is generated */}
          </MessageActions>
        )}
      </div>
    </Message>
  )
}

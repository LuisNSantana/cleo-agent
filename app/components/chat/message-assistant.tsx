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
import { getSources } from "./get-sources"
import { Reasoning } from "./reasoning"
import { SearchImages } from "./search-images"
import { SourcesList } from "./sources-list"
import { ToolInvocation } from "./tool-invocation"
import { AssistantMessageWithFiles } from '@/components/chat/smart-message'

type MessageAssistantProps = {
  children: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  copied?: boolean
  copyToClipboard?: () => void
  onReload?: () => void
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
  copied,
  copyToClipboard,
  onReload,
  parts,
  status,
  className,
  userMessage,
}: MessageAssistantProps) {
  const { preferences } = useUserPreferences()
  const sources = getSources(parts)
  
  const toolInvocationParts = parts?.filter(
    (part: any) => part.type === "tool-invocation"
  )
  
  // Handle AI SDK v5 reasoning parts
  const reasoningParts = parts?.filter((part: any) => part.type === "reasoning")
  const reasoningTextFromParts = (reasoningParts?.map((part: any) => (part as any).text).filter(Boolean).join("\n") || "")
  
  // Extract thinking from message content if present (fallback for text-based reasoning)
  let extractedThinking = null
  let cleanedContent = children
  
  if (typeof children === 'string') {
    console.log('🔍 Debug: Processing message content:', children.substring(0, 200))
    
    // Try to extract <thinking> tags first
    if (children.includes('<thinking>')) {
      const thinkingMatch = children.match(/<thinking>([\s\S]*?)<\/thinking>/);
      if (thinkingMatch) {
        extractedThinking = thinkingMatch[1].trim()
        cleanedContent = children.replace(/<thinking>[\s\S]*?<\/thinking>\s*/, '').trim()
        console.log('✅ Extracted thinking from tags:', extractedThinking.substring(0, 100))
      } else {
        // Handle streaming case where thinking tag is not yet closed
        const thinkingStart = children.indexOf('<thinking>')
        if (thinkingStart !== -1) {
          const thinkingContent = children.substring(thinkingStart + 10) // 10 is length of '<thinking>'
          if (thinkingContent.length > 0) {
            extractedThinking = thinkingContent
            cleanedContent = children.substring(0, thinkingStart).trim()
            console.log('🔄 Streaming thinking from tags:', extractedThinking.substring(0, 100))
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
        console.log('✅ Extracted thinking from thought/content format:', extractedThinking.substring(0, 100))
        console.log('✅ Cleaned content from format:', cleanedContent.substring(0, 100))
      }
    } else {
      console.log('❌ No thinking tags or thought/content format found in content')
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

  // Debug log parts
  console.log('🔍 Message parts:', parts?.map(p => ({ 
    type: (p as any).type, 
    hasText: !!(p as any).text,
    text: (p as any).text ? (p as any).text.substring(0, 100) + '...' : null,
    keys: Object.keys(p as any)
  })))
  console.log('🔍 Reasoning parts found:', reasoningParts?.length || 0)
  if (reasoningParts && reasoningParts.length > 0) {
    console.log('🧠 Reasoning content:', reasoningParts.map(p => (p as any).text?.substring(0, 200)))
  }
  console.log('🔍 Extracted thinking:', extractedThinking ? extractedThinking.substring(0, 200) : 'none')
  console.log('✅ Effective reasoning used:', effectiveReasoningText.substring(0, 160))

  return (
    <Message
      className={cn(
  "group flex w-full max-w-4xl flex-1 items-start gap-4 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor",
        className
      )}
    >
      <div className={cn("flex min-w-full flex-col gap-2", isLast && "pb-8")}>
        {/* Show reasoning when available (prefer parts, else <thinking>) or while streaming */}
        {(effectiveReasoningText || status === "streaming") && (
          <Reasoning
            reasoning={effectiveReasoningText}
            isStreaming={status === "streaming"}
          />
        )}

        {toolInvocationParts &&
          toolInvocationParts.length > 0 &&
          preferences.showToolInvocations && (
            <ToolInvocation toolInvocations={toolInvocationParts as any} />
          )}

        {searchImageResults.length > 0 && (
          <SearchImages results={searchImageResults} />
        )}

        {contentNullOrEmpty ? null : (
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
              "-ml-2 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100"
            )}
          >
            <MessageAction
              tooltip={copied ? "Copied!" : "Copy text"}
              side="bottom"
            >
              <button
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
                aria-label="Copy text"
                onClick={copyToClipboard}
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
                tooltip="Regenerate"
                side="bottom"
                delayDuration={0}
              >
                <button
                  className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
                  aria-label="Regenerate"
                  onClick={onReload}
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

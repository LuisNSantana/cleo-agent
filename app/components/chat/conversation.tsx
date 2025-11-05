import { ChatContainerContent, ChatContainerRoot } from "@/components/prompt-kit/chat-container"
import { Loader } from "@/components/prompt-kit/loader"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { UIMessage as MessageType } from "ai"
import { useRef, useMemo, Fragment, useEffect } from "react"
import { Message } from "./message"
// DISABLED: AgentExecutionFlow redundant with PipelineTimeline in message-assistant.tsx
// import { AgentExecutionFlow } from './agent-execution-flow'
import type { PipelineStep } from './pipeline-timeline'
import { OptimizationInsights, extractPipelineOptimizations } from './optimization-insights'
import { useOptimizationStatus } from '@/app/hooks/use-optimization-status'
import { TypingIndicator } from "@/components/ui/typing-indicator"
import { useStickToBottomContext } from "use-stick-to-bottom"
import { useToolApprovals } from '@/hooks/use-tool-approvals'
// ❌ REMOVED: ApprovalMessage (duplicate form, using ConfirmationPanel instead)
// import { ApprovalMessage } from './approval-message'
import type { InterruptState } from '@/lib/agents/types/interrupt'

type ConversationProps = {
  messages: MessageType[]
  status?: "streaming" | "ready" | "submitted" | "error"
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  userId?: string // For image generation
}

export function Conversation({
  messages,
  status = "ready",
  onDelete,
  onEdit,
  onReload,
  userId,
}: ConversationProps) {
  const initialMessageCount = useRef(messages.length)

  // Hook for managing tool approvals
  const { chatInterrupts, allPendingApprovals } = useToolApprovals({
    chatId: userId // Use userId as chat context
  })

  // Extract pipeline steps per message (from message.parts)
  const messagePipelineSteps = useMemo(() => {
    const map = new Map<string, PipelineStep[]>()
    
    messages.forEach((msg) => {
      if (!msg.parts || !Array.isArray(msg.parts)) return
      
      const steps: PipelineStep[] = []
      // Extract steps from each part of the message
      msg.parts.forEach((part, partIndex) => {
        // Use any casting to handle custom execution-step type
        const anyPart = part as any
        if (anyPart && anyPart.type === 'execution-step' && anyPart.step) {
          const raw = anyPart.step as PipelineStep
          // Build a stable, unique id per step occurrence, prefer backend-provided id
          const stepId = (raw as any).id || `${msg.id}-step-${partIndex}`
          // Build a deterministic timestamp per part (base createdAt + part index)
          const baseCreatedAt = (msg as any).createdAt ? new Date((msg as any).createdAt).getTime() : Date.now()
          const derivedTs = new Date(baseCreatedAt + partIndex)
          const ts = (raw as any).timestamp ? (raw as any).timestamp : derivedTs.toISOString()

          const step: PipelineStep = {
            id: stepId,
            uniqueId: (raw as any).uniqueId, // ✅ UUID from backend
            timestamp: ts,
            agent: raw.agent,
            agentName: (raw as any).agentName,
            action: raw.action,
            content: raw.content,
            progress: raw.progress,
            metadata: raw.metadata,
          }
          steps.push(step)
        }
      })

      // Sort by timestamp and keep steps in order
      const sortedSteps = steps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      // ✅ IDEMPOTENT DEDUPLICATION (LangGraph Pattern)
      // Use Set for O(1) lookup by uniqueId (UUID) - recommended by LangGraph docs
      const seenIds = new Set<string>()
      const uniqueSteps = sortedSteps.filter((step) => {
        // Prefer uniqueId (UUID) for deduplication if available
        const dedupeKey = step.uniqueId || step.id
        
        if (seenIds.has(dedupeKey)) {
          console.log(`🔍 [DEDUP] Filtered duplicate: ${step.action} (${dedupeKey.substring(0, 20)}...)`)
          return false // Skip duplicate
        }
        
        seenIds.add(dedupeKey)
        return true // Keep unique step
      })
      
      if (uniqueSteps.length > 0) {
        map.set(msg.id, uniqueSteps)
        const dedupedCount = steps.length - uniqueSteps.length
        if (dedupedCount > 0) {
          console.log(`🧹 [PIPELINE] Filtered ${dedupedCount} duplicates (${steps.length} → ${uniqueSteps.length})`)
        }
        console.log(`📊 [FRONTEND DEBUG] Message ${msg.id} has ${uniqueSteps.length} pipeline steps`)
      }
    })
    
    return map
  }, [messages])

  // Get all steps for global optimization status (backwards compatibility)
  const allActivePipelineSteps = useMemo(() => {
    const allSteps: PipelineStep[] = []
    messagePipelineSteps.forEach((steps: PipelineStep[]) => allSteps.push(...steps))
    return allSteps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [messagePipelineSteps])

  // Get steps for current message (latest) for real-time optimization
  const currentMessageSteps = useMemo(() => {
    if (messages.length === 0) return []
    const latestMessage = messages[messages.length - 1]
    
    // If we're in submitted/streaming state, get steps from the latest message
    if (status === "submitted" || status === "streaming") {
      return messagePipelineSteps.get(latestMessage.id) || []
    }
    
    return []
  }, [messages, messagePipelineSteps, status])

  // Use optimization status hook for real-time feedback - only for current message
  const { status: optimizationStatus, metrics, isActive } = useOptimizationStatus(
    currentMessageSteps,
    status === "streaming",
    status === "submitted"
  )

  // AI SDK v5: extract concatenated text from UIMessage.parts for display
  const extractTextFromMessage = (msg?: MessageType): string => {
    if (!msg) return ""
    const anyMsg = msg as any
    if (typeof anyMsg.content === "string") return anyMsg.content
    if (Array.isArray(msg.parts)) {
      return msg.parts
        .filter((p: any) => p && p.type === "text")
        .map((p: any) => p.text || "")
        .join(" ")
        .trim()
    }
    return ""
  }

  const latestMessage = messages[messages.length - 1]

  if (!messages || messages.length === 0)
    return <div className="h-full w-full"></div>

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden z-10">
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 mx-auto flex w-full flex-col justify-center">
        <div className="h-app-header bg-transparent flex w-full mask-b-from-4% mask-b-to-100% lg:hidden" />
      </div>
      <ChatContainerRoot className="relative w-full">
        <ConversationContent
          messages={messages}
          status={status}
          onDelete={onDelete}
          onEdit={onEdit}
          onReload={onReload}
          userId={userId}
          messagePipelineSteps={messagePipelineSteps}
          currentMessageSteps={currentMessageSteps}
          metrics={metrics}
          isActive={isActive}
          extractTextFromMessage={extractTextFromMessage}
          initialMessageCount={initialMessageCount}
          latestMessage={latestMessage}
          chatInterrupts={chatInterrupts}
        />
      </ChatContainerRoot>
    </div>
  )
}

function ConversationContent({
  messages,
  status,
  onDelete,
  onEdit,
  onReload,
  userId,
  messagePipelineSteps,
  currentMessageSteps,
  metrics,
  isActive,
  extractTextFromMessage,
  initialMessageCount,
  latestMessage,
  chatInterrupts,
}: {
  messages: MessageType[]
  status: "streaming" | "ready" | "submitted" | "error"
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  userId?: string
  messagePipelineSteps: Map<string, PipelineStep[]>
  currentMessageSteps: PipelineStep[]
  metrics: any
  isActive: boolean
  extractTextFromMessage: (msg?: MessageType) => string
  initialMessageCount: React.MutableRefObject<number>
  latestMessage: MessageType
  chatInterrupts: InterruptState[]
}) {
  const { scrollToBottom, isAtBottom, state } = useStickToBottomContext()
  const lastAutoscrollMessageRef = useRef<string | null>(null)

  useEffect(() => {
    if (!latestMessage) return
    const isAssistantDone = latestMessage.role === "assistant" && status !== "streaming"
    if (!isAssistantDone) {
      return
    }

    const nearBottom = state?.isNearBottom ?? isAtBottom
    if (!nearBottom) {
      return
    }

    const messageKey = `${latestMessage.id}:${(latestMessage as any)?.parts?.length ?? 0}`
    if (lastAutoscrollMessageRef.current === messageKey) {
      return
    }

    lastAutoscrollMessageRef.current = messageKey

    const raf = requestAnimationFrame(() => {
      scrollToBottom({
        animation: {
          damping: 0.75,
          stiffness: 0.09,
          mass: 1.1,
        },
        wait: 32,
      })
    })

    return () => cancelAnimationFrame(raf)
  }, [latestMessage, status, scrollToBottom, isAtBottom, state?.isNearBottom])

  return (
    <ChatContainerContent
          className="custom-scrollbar flex w-full h-full flex-col items-center pt-20 pb-4"
          style={{
            scrollbarGutter: "stable both-edges",
            scrollbarWidth: "none",
          }}
        >
          {messages?.map((message, index) => {
            const isLast =
              index === messages.length - 1 && status !== "submitted"
            const hasScrollAnchor =
              isLast && messages.length > initialMessageCount.current

            // Para mensajes del asistente, buscar el mensaje del usuario anterior
            const userMessage =
              message.role === "assistant" && index > 0
                ? extractTextFromMessage(messages[index - 1])
                : undefined

            const messageText = extractTextFromMessage(message)

            // Extract attachments from experimental_attachments (AI SDK v5)
            const anyMessage = message as any
            const attachments = anyMessage.experimental_attachments || undefined

            // Check if this is the LAST assistant message - show pipeline BEFORE it
            const isLastAssistantMessage = message.role === "assistant" && isLast
            const currentMessageSteps = messagePipelineSteps.get(message.id) || []
            const shouldShowPipelineBeforeThisMessage = isLastAssistantMessage && currentMessageSteps.length > 0

            // Extract optimization data for insights (use current message steps)
            const optimizationData = shouldShowPipelineBeforeThisMessage 
              ? extractPipelineOptimizations(currentMessageSteps, [])
              : null

            return (
              <Fragment key={message.id}>
                {/* DISABLED: AgentExecutionFlow redundant with PipelineTimeline in message-assistant.tsx */}
                {/* Show pipeline BEFORE the final assistant response (only if we have steps) */}
                {/* {shouldShowPipelineBeforeThisMessage && (
                  <div className="group flex w-full max-w-4xl flex-col items-start gap-3 px-6 pb-3">
                    <AgentExecutionFlow 
                      steps={currentMessageSteps} 
                      mode={optimizationData?.directResponse ? 'direct' : 'delegated'}
                    />
                  </div>
                )} */}

                <Message
                  id={message.id}
                  variant={message.role}
                  // Extract attachments from experimental_attachments
                  attachments={attachments}
                  isLast={isLast}
                  onDeleteAction={onDelete}
                  onEditAction={onEdit}
                  onReloadAction={onReload}
                  hasScrollAnchor={hasScrollAnchor}
                  parts={message.parts}
                  status={status}
                  userMessage={userMessage} // Pasar contexto del usuario
                  userId={userId} // For image generation
                  model={(message as any)?.model}
                >
                  {messageText}
                </Message>
              </Fragment>
            )
          })}

          {/* DISABLED: AgentExecutionFlow redundant with PipelineTimeline in message-assistant.tsx */}
          {/* Pipeline LIVE: Show when streaming OR waiting for response (no assistant message yet OR streaming) */}
          {(status === "submitted" || (status === "streaming" && messages.length > 0 && messages[messages.length - 1].role === "user")) && (
            <div className="group min-h-scroll-anchor flex w-full max-w-4xl flex-col items-start gap-2 px-6 pb-3">
              <Loader />
            </div>
          )}

          {/* DISABLED: AgentExecutionFlow redundant with PipelineTimeline in message-assistant.tsx */}
          {/* Pipeline LIVE during streaming: Show when assistant message is streaming */}
          {/* {status === "streaming" && messages.length > 0 && messages[messages.length - 1].role === "assistant" && currentMessageSteps.length > 0 && (
            <div className="group flex w-full max-w-4xl flex-col items-start gap-2 px-6 pb-3">
              <AgentExecutionFlow steps={currentMessageSteps} />
            </div>
          )} */}

          {/* Show TypingIndicator when streaming but no content yet */}
          {status === "streaming" && messages.length > 0 && messages[messages.length - 1].role === "assistant" && currentMessageSteps.length === 0 && (
            <TypingIndicator />
          )}

          {/* ❌ REMOVED: ApprovalMessage (duplicate form gris claro)
              ✅ KEPT: ConfirmationPanel (form oscuro con editable inputs) in chat.tsx
          */}
          {/* {chatInterrupts.length > 0 && (
            <div className="w-full max-w-4xl px-6 pb-3">
              {chatInterrupts.map(interrupt => (
                <ApprovalMessage
                  key={interrupt.executionId}
                  interrupt={interrupt}
                  onApproved={() => {
                    console.log('✅ Approval approved, execution continuing...')
                  }}
                  onRejected={() => {
                    console.log('❌ Approval rejected, execution cancelled')
                  }}
                />
              ))}
            </div>
          )} */}

          {/* Simple In-Chat Confirmation */}
          {/* Removed legacy InChatConfirmation (now handled via pendingToolConfirmation modal) */}

          <div className="pointer-events-none sticky bottom-0 flex w-full max-w-4xl items-end justify-end gap-4 px-6 pb-2">
            <ScrollButton className="absolute top-[-50px] right-[30px]" />
          </div>
        </ChatContainerContent>
  )
}

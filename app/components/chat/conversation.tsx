import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container"
import { Loader } from "@/components/prompt-kit/loader"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { UIMessage as MessageType } from "ai"
import { useRef, useMemo, Fragment } from "react"
import { Message } from "./message"
import { PipelineTimeline, type PipelineStep } from './pipeline-timeline'
import { OptimizationInsights, extractPipelineOptimizations } from './optimization-insights'
import { RealTimeOptimization, createOptimizationStatus, type OptimizationStatus } from './real-time-optimization'
import { useOptimizationStatus } from '@/app/hooks/use-optimization-status'
import { PerformanceMetrics } from './performance-metrics'

type ConversationProps = {
  messages: MessageType[]
  status?: "streaming" | "ready" | "submitted" | "error"
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
}

export function Conversation({
  messages,
  status = "ready",
  onDelete,
  onEdit,
  onReload,
}: ConversationProps) {
  const initialMessageCount = useRef(messages.length)

  // Extract pipeline steps PER MESSAGE instead of globally
  const messagePipelineSteps = useMemo(() => {
    const messageSteps: Map<string, PipelineStep[]> = new Map()
    
  // ...existing code...
    
    messages.forEach((msg, msgIndex) => {
      if (!msg.parts || !Array.isArray(msg.parts)) return
      
      const steps: PipelineStep[] = []
  // ...existing code...
      
      msg.parts.forEach((part, partIndex) => {
        // Use any casting to handle custom execution-step type
        const anyPart = part as any
        if (anyPart && anyPart.type === 'execution-step' && anyPart.step) {
          const step = anyPart.step as PipelineStep
          // ...existing code...
          steps.push(step)
        }
      })

      // Sort by timestamp and deduplicate
      const sortedSteps = steps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      const uniqueSteps = sortedSteps.filter((step, index, arr) => {
        if (step.id) {
          return arr.findIndex(s => s.id === step.id) === index
        }
        const key = `${step.agent}-${step.action}-${step.content?.slice(0, 50)}-${step.timestamp}`
        return arr.findIndex(s => 
          `${s.agent}-${s.action}-${s.content?.slice(0, 50)}-${s.timestamp}` === key
        ) === index
      })
      
      if (uniqueSteps.length > 0) {
        messageSteps.set(msg.id, uniqueSteps)
        console.log(`📊 [FRONTEND DEBUG] Message ${msg.id} has ${uniqueSteps.length} pipeline steps`)
      }
    })
    
    return messageSteps
  }, [messages])

  // Get all steps for global optimization status (backwards compatibility)
  const allActivePipelineSteps = useMemo(() => {
    const allSteps: PipelineStep[] = []
    messagePipelineSteps.forEach(steps => allSteps.push(...steps))
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


  if (!messages || messages.length === 0)
    return <div className="h-full w-full"></div>

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden z-10">
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 mx-auto flex w-full flex-col justify-center">
        <div className="h-app-header bg-transparent flex w-full lg:hidden lg:h-0" />
        <div className="h-app-header bg-transparent flex w-full mask-b-from-4% mask-b-to-100% lg:hidden" />
      </div>
      <ChatContainerRoot className="relative w-full">
        <ChatContainerContent
          className="flex w-full h-full flex-col items-center pt-16 md:pt-20 pb-[calc(env(safe-area-inset-bottom)+80px)] overscroll-y-contain"
          style={{
            scrollbarGutter: "stable both-edges",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorY: "contain",
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
                {/* Show pipeline BEFORE the final assistant response (only if we have steps) */}
                {shouldShowPipelineBeforeThisMessage && (
                  <div className="group flex w-full max-w-4xl flex-col items-start gap-3 px-6 pb-3">
                    <div className="w-full space-y-3">
                      <div className="flex items-center gap-2 text-xs text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="font-medium">Pipeline completed</span>
                        <span className="text-green-300/70">• {currentMessageSteps.length} steps executed</span>
                      </div>
                      <PipelineTimeline steps={currentMessageSteps} />
                      {optimizationData && (
                        <OptimizationInsights pipeline={optimizationData} />
                      )}
                      {/* Show final performance metrics */}
                      {metrics && (
                        <PerformanceMetrics metrics={metrics} />
                      )}
                    </div>
                  </div>
                )}

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
                >
                  {messageText}
                </Message>
              </Fragment>
            )
          })}

          {/* Pipeline LIVE: Show when streaming OR waiting for response (no assistant message yet OR streaming) */}
          {(status === "submitted" || (status === "streaming" && messages.length > 0 && messages[messages.length - 1].role === "user")) && (
            <div className="group min-h-scroll-anchor flex w-full max-w-4xl flex-col items-start gap-2 px-6 pb-3">
              <div className="w-full space-y-3">
                {currentMessageSteps.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-blue-400 mb-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="font-medium">Executing pipeline</span>
                      <span className="text-blue-300/70">• {currentMessageSteps.length} steps in progress</span>
                    </div>
                    <PipelineTimeline steps={currentMessageSteps} />
                    
                    {/* Real-time optimization feedback during execution */}
                    {optimizationStatus && (
                      <RealTimeOptimization status={optimizationStatus} />
                    )}
                    
                    {/* Show performance metrics during execution */}
                    {metrics && isActive && (
                      <PerformanceMetrics metrics={metrics} />
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-blue-400 mb-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="font-medium">Initializing pipeline</span>
                      <span className="text-blue-300/70">• Preparing delegation</span>
                    </div>
                    
                    {/* Show analyzing state when no pipeline steps yet - using initial optimization status */}
                    <RealTimeOptimization status={{
                      stage: 'analyzing',
                      route: 'direct',
                      optimizations: ['Query complexity analysis', 'Initializing optimization pipeline'],
                      timeElapsed: 0
                    }} />
                    
                    <Loader />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pipeline LIVE during streaming: Show when assistant message is streaming */}
          {status === "streaming" && messages.length > 0 && messages[messages.length - 1].role === "assistant" && currentMessageSteps.length > 0 && (
            <div className="group flex w-full max-w-4xl flex-col items-start gap-2 px-6 pb-3">
              <div className="w-full space-y-3">
                <div className="flex items-center gap-2 text-xs text-amber-400 mb-3">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">Pipeline active</span>
                  <span className="text-amber-300/70">• {currentMessageSteps.length} steps updating</span>
                </div>
                <PipelineTimeline steps={currentMessageSteps} />
                
                {/* Real-time optimization during streaming */}
                {optimizationStatus && (
                  <RealTimeOptimization status={optimizationStatus} />
                )}
              </div>
            </div>
          )}
  <div className="pointer-events-none sticky bottom-0 flex w-full max-w-4xl items-end justify-end gap-4 px-6 pb-2">
            <ScrollButton className="absolute top-[-50px] right-[30px]" />
          </div>
        </ChatContainerContent>
      </ChatContainerRoot>
    </div>
  )
}

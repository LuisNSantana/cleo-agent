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

  // Extract pipeline steps from all messages for active delegation display
  const activePipelineSteps = useMemo(() => {
    try {
      const steps: PipelineStep[] = []
      
      console.log(`📊 [FRONTEND DEBUG] Processing ${messages.length} messages for pipeline steps`)
      
      messages.forEach((msg, msgIndex) => {
        if (!msg.parts || !Array.isArray(msg.parts)) return
        
        console.log(`📝 [FRONTEND DEBUG] Message ${msgIndex} (${msg.role}) has ${msg.parts.length} parts`)
        
        msg.parts.forEach((part, partIndex) => {
          // Use any casting to handle custom execution-step type
          const anyPart = part as any
          if (anyPart && anyPart.type === 'execution-step' && anyPart.step) {
            const step = anyPart.step as PipelineStep
            console.log(`🎯 [FRONTEND DEBUG] Found execution step in msg ${msgIndex}, part ${partIndex}:`, {
              id: step.id,
              agent: step.agent,
              action: step.action,
              content: step.content?.slice(0, 50),
              metadata: step.metadata
            })
            steps.push(step)
          }
        })
      })

      // Sort by timestamp
      steps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      // Simple deduplication by step ID to avoid exact duplicates
      const uniqueSteps = steps.filter((step, index, arr) => {
        // If step has an ID, deduplicate by ID
        if (step.id) {
          return arr.findIndex(s => s.id === step.id) === index
        }
        // Otherwise, deduplicate by content+timestamp combination
        const key = `${step.agent}-${step.action}-${step.content?.slice(0, 50)}-${step.timestamp}`
        return arr.findIndex(s => 
          `${s.agent}-${s.action}-${s.content?.slice(0, 50)}-${s.timestamp}` === key
        ) === index
      })
      
      console.log(`📊 [FRONTEND DEBUG] Pipeline processing complete:`, {
        totalSteps: steps.length,
        uniqueSteps: uniqueSteps.length,
        stepsByAgent: uniqueSteps.reduce((acc, step) => {
          acc[step.agent] = (acc[step.agent] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      })
      
      return uniqueSteps
    } catch (error) {
      console.error('❌ [FRONTEND DEBUG] Error extracting pipeline steps:', error)
      return []
    }
  }, [messages])  // AI SDK v5: extract concatenated text from UIMessage.parts for display
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
    <div className="relative flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto z-10">
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 mx-auto flex w-full flex-col justify-center">
        <div className="h-app-header bg-transparent flex w-full lg:hidden lg:h-0" />
        <div className="h-app-header bg-transparent flex w-full mask-b-from-4% mask-b-to-100% lg:hidden" />
      </div>
      <ChatContainerRoot className="relative w-full">
        <ChatContainerContent
          className="flex w-full flex-col items-center pt-20 pb-4"
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
            const shouldShowPipelineBeforeThisMessage = isLastAssistantMessage && activePipelineSteps.length > 0

            return (
              <Fragment key={message.id}>
                {/* Show pipeline BEFORE the final assistant response (only if we have steps) */}
                {shouldShowPipelineBeforeThisMessage && (
                  <div className="group flex w-full max-w-4xl flex-col items-start gap-2 px-6 pb-3">
                    <div className="w-full">
                      <div className="flex items-center gap-2 text-xs text-green-400 mb-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="font-medium">Pipeline completed</span>
                        <span className="text-green-300/70">• {activePipelineSteps.length} steps executed</span>
                      </div>
                      <PipelineTimeline steps={activePipelineSteps} />
                    </div>
                  </div>
                )}

                <Message
                  id={message.id}
                  variant={message.role}
                  // Extract attachments from experimental_attachments
                  attachments={attachments}
                  isLast={isLast}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onReload={onReload}
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
              <div className="w-full">
                {activePipelineSteps.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-blue-400 mb-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="font-medium">Executing pipeline</span>
                      <span className="text-blue-300/70">• {activePipelineSteps.length} steps in progress</span>
                    </div>
                    <PipelineTimeline steps={activePipelineSteps} />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-blue-400 mb-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="font-medium">Initializing pipeline</span>
                      <span className="text-blue-300/70">• Preparing delegation</span>
                    </div>
                    <Loader />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pipeline LIVE during streaming: Show when assistant message is streaming */}
          {status === "streaming" && messages.length > 0 && messages[messages.length - 1].role === "assistant" && activePipelineSteps.length > 0 && (
            <div className="group flex w-full max-w-4xl flex-col items-start gap-2 px-6 pb-3">
              <div className="w-full">
                <div className="flex items-center gap-2 text-xs text-amber-400 mb-3">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">Pipeline active</span>
                  <span className="text-amber-300/70">• {activePipelineSteps.length} steps updating</span>
                </div>
                <PipelineTimeline steps={activePipelineSteps} />
              </div>
            </div>
          )}
      <div className="absolute bottom-0 flex w-full max-w-4xl flex-1 items-end justify-end gap-4 px-6 pb-2">
            <ScrollButton className="absolute top-[-50px] right-[30px]" />
          </div>
        </ChatContainerContent>
      </ChatContainerRoot>
    </div>
  )
}

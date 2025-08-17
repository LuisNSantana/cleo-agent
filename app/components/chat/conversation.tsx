import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container"
import { Loader } from "@/components/prompt-kit/loader"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { UIMessage as MessageType } from "ai"
import { useRef } from "react"
import { Message } from "./message"

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
    <div className="relative flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto">
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 mx-auto flex w-full flex-col justify-center">
        <div className="h-app-header bg-background flex w-full lg:hidden lg:h-0" />
        <div className="h-app-header bg-background flex w-full mask-b-from-4% mask-b-to-100% lg:hidden" />
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

            return (
              <Message
                key={message.id}
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
            )
          })}
      {status === "submitted" &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "user" && (
        <div className="group min-h-scroll-anchor flex w-full max-w-4xl flex-col items-start gap-2 px-6 pb-2">
                <Loader />
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

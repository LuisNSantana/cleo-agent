// AI SDK v5 compatible useChat hook
import { toast } from "@/components/ui/toast"
import { getOrCreateGuestUserId } from "@/lib/api"
import { MessageAISDK } from "@/lib/chat-store/messages/api"
import { Attachment } from "@/lib/file-handling"
import { isImageFile } from "@/lib/image-utils"
import { getCleoPrompt, sanitizeModelName } from "@/lib/prompts"
import { API_ROUTE_CHAT } from "@/lib/routes"
import type { UserProfile } from "@/lib/user/types"
import type { UIMessage } from "ai"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

// Utility function to convert UIMessage to MessageAISDK for AI SDK v5 compatibility
function convertToMessageAISDK(message: UIMessage | ChatMessage): MessageAISDK {
  // Extract content from message
  let content = ""
  
  if ('content' in message && typeof message.content === 'string') {
    content = message.content
  } else if (message.parts && Array.isArray(message.parts)) {
    // Extract text from parts for AI SDK v5
    const textParts = message.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text || "")
    content = textParts.join(" ") || "User message"
  } else {
    content = "User message"
  }

  return {
    id: message.id || Date.now().toString(),
    role: message.role,
    content,
    parts: message.parts,
    createdAt: (message as any).createdAt,
    experimental_attachments: (message as any).experimental_attachments,
  }
}

// Helper function to ensure parts array exists
function ensureParts(message: ChatMessage): void {
  if (!message.parts) {
    message.parts = []
  }
}

// Extended message type with content property for AI SDK v5 compatibility
export interface ChatMessage extends UIMessage {
  id: string
  content: string
  parts: any[]
  createdAt?: Date
  experimental_attachments?: Array<{
    name: string
    contentType: string
    url: string
  }>
}

type UseChatCoreProps = {
  initialMessages: UIMessage[]
  draftValue: string
  cacheAndAddMessage: (message: MessageAISDK) => Promise<void>
  chatId: string | null
  user: UserProfile | null
  files: File[]
  createOptimisticAttachments: (
    files: File[]
  ) => Array<{ name: string; contentType: string; url: string }>
  setFiles: (files: File[]) => void
  checkLimitsAndNotify: (uid: string) => Promise<boolean>
  cleanupOptimisticAttachments: (attachments?: Array<{ url?: string }>) => void
  ensureChatExists: (uid: string, input: string) => Promise<string | null>
  handleFileUploads: (
    uid: string,
    chatId: string
  ) => Promise<Attachment[] | null>
  selectedModel: string
  clearDraft: () => void
  bumpChat: (chatId: string) => void
}

export function useChatCore({
  initialMessages,
  draftValue,
  cacheAndAddMessage,
  chatId,
  user,
  files,
  setFiles,
  ensureChatExists,
  handleFileUploads,
  selectedModel,
  clearDraft,
}: UseChatCoreProps) {
  // State management - AI SDK v5 requires manual input management
  const [input, setInput] = useState(draftValue || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasDialogAuth, setHasDialogAuth] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)

  // Refs and derived state
  const hasSentFirstMessageRef = useRef(false)
  const prevChatIdRef = useRef<string | null>(chatId)
  const isAuthenticated = useMemo(() => !!user?.id, [user?.id])
  // Generate dynamic system prompt with current model info
  const systemPrompt = useMemo(() => {
    if (user?.system_prompt) {
      return user.system_prompt
    }

    // Get current model name for logging
    const currentModelName = sanitizeModelName(selectedModel || "unknown-model")

    // Log model information for debugging

    // Return Cleo's modular prompt with current model info
    return getCleoPrompt(currentModelName, "default")
  }, [user?.system_prompt, selectedModel])

  // Search params handling
  const searchParams = useSearchParams()
  const prompt = searchParams.get("prompt")

  // Handle errors directly in onError callback
  const handleError = useCallback((error: Error) => {
    console.error("Chat error:", error)
    console.error("Error message:", error.message)
    let errorMsg = error.message || "Something went wrong."

    if (errorMsg === "An error occurred" || errorMsg === "fetch failed") {
      errorMsg = "Something went wrong. Please try again."
    }

    toast({
      title: errorMsg,
      status: "error",
    })
  }, [])

  // Manual state management for chat
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages as ChatMessage[]
  )
  const [status, setStatus] = useState<"ready" | "in_progress" | "error">(
    "ready"
  )
  const [error, setError] = useState<Error | null>(null)

  // Map internal status to Conversation component expected status
  const conversationStatus = useMemo(() => {
    switch (status) {
      case "in_progress":
        return "submitted" as const
      case "error":
        return "error" as const
      default:
        return "ready" as const
    }
  }, [status])

  // Map internal status to ChatInput component expected status (includes "streaming")
  const chatInputStatus = useMemo(() => {
    switch (status) {
      case "in_progress":
        return "streaming" as const
      case "error":
        return "error" as const
      default:
        return "ready" as const
    }
  }, [status])
  const abortControllerRef = useRef<AbortController | null>(null)

  // Custom sendMessage function
  const sendMessage = useCallback(
    async ({
      text,
      files,
    }: {
      text: string
      files?: FileList
      experimental_attachments?: unknown[]
    }) => {
      // For guest users, get or create a proper guest user ID
      let effectiveUserId: string | null = user?.id || null
      if (!effectiveUserId) {
        effectiveUserId = await getOrCreateGuestUserId(user)
        if (!effectiveUserId) {
          handleError(new Error("Unable to create user session"))
          return
        }
      }

      let effectiveChatId = chatId
      if (!effectiveChatId) {
        effectiveChatId = await ensureChatExists(effectiveUserId, text)
        if (!effectiveChatId) {
          handleError(new Error("Unable to create chat session"))
          return
        }
      }

      setStatus("in_progress")
      setError(null)

      // Process files if any (following AI SDK v5 pattern)
      const parts: Array<{
        type: "text" | "file"
        text?: string
        mediaType?: string
        url?: string
        name?: string
      }> = [{ type: "text", text }]

      if (files && files.length > 0) {
        // Convert files to data URLs (like AI SDK v5 does automatically)
        const fileDataUrls = await Promise.all(
          Array.from(files).map(
            (file) =>
              new Promise<{
                type: "file"
                mediaType: string
                url: string
                name: string
              }>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                  const result = {
                    type: "file" as const,
                    mediaType: file.type,
                    url: reader.result as string,
                    name: file.name,
                  }
                  resolve(result)
                }
                reader.onerror = (error) => {
                  reject(error)
                }
                reader.readAsDataURL(file)
              })
          )
        )

        parts.push(...fileDataUrls)
      }

      // Create attachments for display (convert file parts to attachment format)
      const attachments = parts
        .filter((part) => part.type === "file")
        .map((part) => ({
          name: part.name || "file",
          contentType: part.mediaType || "application/octet-stream",
          url: part.url || "",
        }))

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: parts.length > 1 ? parts : text, // Use multimodal content if files, otherwise text
        createdAt: new Date(),
        parts: parts,
        experimental_attachments:
          attachments.length > 0 ? attachments : undefined,
      } as ChatMessage

      setMessages((prev: ChatMessage[]) => [...prev, userMessage])
      cacheAndAddMessage(convertToMessageAISDK(userMessage))

      try {
        abortControllerRef.current = new AbortController()

        const response = await fetch(API_ROUTE_CHAT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            chatId: effectiveChatId,
            userId: effectiveUserId,
            model: selectedModel,
            isAuthenticated,
            systemPrompt,
            enableSearch,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to send message")
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")

        let buffer = ""
        const assistantMessageObj: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "",
          createdAt: new Date(),
          parts: [],
        } as ChatMessage

        setMessages((prev: ChatMessage[]) => [...prev, assistantMessageObj])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          buffer += chunk

          // Parse streaming data line by line
          const lines = buffer.split("\n")
          buffer = lines.pop() || "" // Keep incomplete line in buffer

          for (const line of lines) {
            // Skip SSE terminator line
            if (line.trim() === "data: [DONE]") {
              continue
            }
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                
                // Debug: Log ALL data types we receive
                console.log('🔍 [STREAM] Received data type:', data.type, data)

                // Handle different types of streaming data
                switch (data.type) {
                  case "tool-input-start": {
                    // Add tool invocation part in partial-call state
                    if (!assistantMessageObj.parts) {
                      assistantMessageObj.parts = []
                    }
                    assistantMessageObj.parts.push({
                      type: "tool-invocation",
                      toolInvocation: {
                        state: "partial-call",
                        toolName: data.toolName,
                        toolCallId: data.toolCallId,
                        args: {},
                      },
                    } as any)
                    break
                  }

                  case "tool-input-available": {
                    // Update tool invocation with full arguments (call state)
                    ensureParts(assistantMessageObj)
                    const toolPart = assistantMessageObj.parts!.find(
                      (p: any) =>
                        p.type === "tool-invocation" &&
                        p.toolInvocation?.toolCallId === data.toolCallId
                    ) as any
                    if (toolPart) {
                      toolPart.toolInvocation.state = "call"
                      toolPart.toolInvocation.args = data.input
                    }
                    break
                  }

                  case "tool-output-available": {
                    // Update tool invocation with result (completed state)
                    const toolPart = assistantMessageObj.parts.find(
                      (p: any) =>
                        p.type === "tool-invocation" &&
                        p.toolInvocation?.toolCallId === data.toolCallId
                    ) as any
                    if (toolPart) {
                      toolPart.toolInvocation.state = "result"
                      toolPart.toolInvocation.result = data.output
                    }
                    break
                  }

                  case "text-start":
                    // Start text part
                    assistantMessageObj.parts.push({
                      type: "text",
                      text: "",
                    })
                    break

                  case "start":
                  case "start-step":
                    // Stream initialization events - no action needed
                    break

                  case "text-delta":
                    // Update text part
                    const textPart = assistantMessageObj.parts.findLast(
                      (p) => p.type === "text"
                    )
                    if (textPart && textPart.type === "text") {
                      textPart.text += data.delta
                      // Update content for backward compatibility
                      assistantMessageObj.content = assistantMessageObj.parts
                        .filter((p) => p.type === "text")
                        .map((p) => (p.type === "text" ? p.text : ""))
                        .join("")
                    }
                    break

                  case "reasoning-start":
                    // Start reasoning part
                    console.log('🧠 [STREAM] Reasoning started')
                    assistantMessageObj.parts.push({
                      type: "reasoning",
                      text: "",
                    })
                    break

                  case "reasoning-delta":
                    // Update reasoning part
                    console.log('🧠 [STREAM] Reasoning delta:', data.delta?.substring(0, 50))
                    const reasoningPart = assistantMessageObj.parts.findLast(
                      (p) => p.type === "reasoning"
                    )
                    if (reasoningPart && reasoningPart.type === "reasoning") {
                      reasoningPart.text += data.delta
                    }
                    break

                  case "reasoning-end":
                    // Finish reasoning part - the actual reasoning content might be here
                    console.log('🧠 [STREAM] Reasoning ended:', JSON.stringify(data, null, 2))
                    const endReasoningPart = assistantMessageObj.parts.findLast(
                      (p) => p.type === "reasoning"
                    )
                    if (endReasoningPart && endReasoningPart.type === "reasoning" && data.text) {
                      endReasoningPart.text = data.text
                      console.log('🧠 [STREAM] Set reasoning text:', data.text.substring(0, 200))
                    }
                    break

                  case "finish":
                    console.log('✅ [STREAM] Finish event received:', JSON.stringify(data, null, 2))
                    // Check if reasoning is included in the finish event
                    if (data.reasoning) {
                      console.log('🧠 [STREAM] Found reasoning in finish event:', data.reasoning.substring(0, 200))
                      // Add reasoning part if it doesn't exist
                      const existingReasoningPart = assistantMessageObj.parts.find(p => p.type === "reasoning")
                      if (existingReasoningPart) {
                        existingReasoningPart.text = data.reasoning
                      } else {
                        assistantMessageObj.parts.unshift({
                          type: "reasoning",
                          text: data.reasoning,
                        })
                      }
                    }
                    break

                  case "finish-step":
                    console.log('🔍 [STREAM] Finish-step event:', JSON.stringify(data, null, 2))
                    break

                  default:
                    console.log('⚠️ [STREAM] Unknown data type:', data.type, JSON.stringify(data, null, 2))
                    break
                }

                // Update the message in state
                setMessages((prev: ChatMessage[]) => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = {
                    ...assistantMessageObj,
                  }
                  return newMessages
                })
              } catch {
                // If JSON parsing fails, treat as plain text (fallback)
                const textPart = assistantMessageObj.parts.findLast(
                  (p) => p.type === "text"
                )
                if (textPart && textPart.type === "text") {
                  textPart.text += line.slice(6)
                  assistantMessageObj.content += line.slice(6)
                } else {
                  assistantMessageObj.parts.push({
                    type: "text",
                    text: line.slice(6),
                  })
                  assistantMessageObj.content += line.slice(6)
                }

                setMessages((prev: ChatMessage[]) => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = {
                    ...assistantMessageObj,
                  }
                  return newMessages
                })
              }
            }
          }
        }

        // Cache final assistant message
        cacheAndAddMessage(convertToMessageAISDK({
          ...assistantMessageObj,
          parts: assistantMessageObj.parts,
        } as UIMessage))
        setStatus("ready")
      } catch (err) {
        const error = err as Error
        if (error.name !== "AbortError") {
          setError(error)
          setStatus("error")
          handleError(error)
        }
      }
    },
    [
      user,
      chatId,
      selectedModel,
      isAuthenticated,
      systemPrompt,
      enableSearch,
      messages,
      cacheAndAddMessage,
      handleError,
      ensureChatExists,
    ]
  )

  // Stop function
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setStatus("ready")
    }
  }, [])

  // Regenerate function
  const regenerate = useCallback(async () => {
    if (messages.length === 0) return

    // Remove last assistant message and resend last user message
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m: any) => m.role === "user")
    if (lastUserMessage) {
      const messagesWithoutLastAssistant = messages.filter(
        (m: any, i: number) => !(i === messages.length - 1 && m.role === "assistant")
      )
      setMessages(messagesWithoutLastAssistant)
      
      // Handle both AI SDK v5 (parts) and legacy (content) message structure
      let messageText = ""
      if (lastUserMessage.parts && Array.isArray(lastUserMessage.parts)) {
        // AI SDK v5 structure
        const textPart = lastUserMessage.parts.find((part: any) => part.type === "text")
        messageText = textPart?.text || ""
      } else if ((lastUserMessage as any).content) {
        // Legacy structure
        messageText = typeof (lastUserMessage as any).content === "string" 
          ? (lastUserMessage as any).content 
          : ""
      }
      
      await sendMessage({ text: messageText })
    }
  }, [messages, sendMessage])

  // Handle search params on mount
  useEffect(() => {
    if (prompt && typeof window !== "undefined") {
      requestAnimationFrame(() => setInput(prompt))
    }
  }, [prompt])

  // Sync local messages state with initialMessages when it changes (e.g., switching chats)
  // But don't sync if we're in the middle of submitting to avoid overwriting optimistic updates
  // Also, only sync if the chatId has changed to avoid conflicts during message streaming
  useEffect(() => {
    const chatIdChanged = prevChatIdRef.current !== chatId
    if (!isSubmitting && (chatIdChanged || initialMessages.length > messages.length)) {
      setMessages(initialMessages as ChatMessage[])
    }
  }, [initialMessages, isSubmitting, chatId, messages.length])

  // Reset messages when navigating from a chat to home
  if (
    prevChatIdRef.current !== null &&
    chatId === null &&
    messages.length > 0
  ) {
    setMessages([])
    prevChatIdRef.current = chatId
  } else {
    prevChatIdRef.current = chatId
  }

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setInput(value)
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault()

      if (!input.trim() || isSubmitting) return

      const messageText = input.trim() // Guardar el texto antes de limpiar
      const currentFiles = [...files] // Guardar archivos antes de limpiar
      setInput("") // Limpiar input inmediatamente
      setFiles([]) // Limpiar archivos inmediatamente
      clearDraft() // Limpiar draft inmediatamente
      setIsSubmitting(true)

      try {
        // Handle file uploads to Supabase for documents (if needed)
        let supabaseAttachments: Attachment[] = []
        const documentFiles = currentFiles.filter((file) => !isImageFile(file))
        if (documentFiles.length > 0 && user?.id && chatId) {
          const uploadedAttachments = await handleFileUploads(user.id, chatId)
          if (uploadedAttachments) {
            supabaseAttachments = uploadedAttachments
          }
        }

        // Create FileList with ALL files (images AND documents) for AI analysis
        let allFilesList: FileList | undefined = undefined
        if (currentFiles.length > 0) {
          const dt = new DataTransfer()
          currentFiles.forEach((file) => {
            dt.items.add(file)
          })
          allFilesList = dt.files
        }

        // Send message using AI SDK v5 sendMessage with ALL files
        await sendMessage({
          text: messageText,
          ...(allFilesList && { files: allFilesList }),
          // Add Supabase attachments for UI display if any
          ...(supabaseAttachments.length > 0 && {
            experimental_attachments: supabaseAttachments.map((att) => ({
              name: att.name,
              contentType: att.contentType,
              url: att.url,
            })),
          }),
        })

        // Input and files already cleared at the start
      } catch (error) {
        console.error("Submit error:", error)
        toast({
          title: "Failed to send message",
          status: "error",
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      input,
      isSubmitting,
      files,
      user?.id,
      chatId,
      handleFileUploads,
      sendMessage,
      setFiles,
      clearDraft,
      toast,
    ]
  )

  // Handle regenerate
  const handleRegenerate = useCallback(async () => {
    try {
      await regenerate()
    } catch (error) {
      console.error("Regenerate error:", error)
    }
  }, [regenerate])

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading: status === "in_progress",
    error,
    stop,
    reload: handleRegenerate,
    append: sendMessage, // For backward compatibility
    isSubmitting,
    hasDialogAuth,
    setHasDialogAuth,
    enableSearch,
    setEnableSearch,
    isAuthenticated,
    systemPrompt,
    status,
    conversationStatus, // Mapped status for Conversation component
    chatInputStatus, // Mapped status for ChatInput component (includes "streaming")
    hasSentFirstMessageRef,
    submit: () => handleSubmit({ preventDefault: () => {} }),
    handleSuggestion: (suggestion: string) => {
      setInput(suggestion)
    },
    handleReload: handleRegenerate,
  }
}

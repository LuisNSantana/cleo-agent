// AI SDK v5 compatible useChat hook
import { toast } from "@/components/ui/toast"
import { getOrCreateGuestUserId } from "@/lib/api"
import { MessageAISDK } from "@/lib/chat-store/messages/api"
import { Attachment } from "@/lib/file-handling"
import { isImageFile } from "@/lib/image-utils"
import { generatePersonalizedPrompt } from "@/lib/prompts/personality"
import { getCleoPrompt, sanitizeModelName } from "@/lib/prompts"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { API_ROUTE_CHAT } from "@/lib/routes"
import type { UserProfile } from "@/lib/user/types"
import type { UIMessage } from "ai"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue, useTransition } from "react"
import { debounce } from "lodash"

// 🔧 Performance & Robustness Utilities
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_BASE = 1000 // 1s base delay

// File validation with logging
function validateFiles(files: File[]): { isValid: boolean; errors: string[] } {
  const startTime = performance.now()
  
  if (!files || files.length === 0) {
    return { isValid: true, errors: [] }
  }

  const errors: string[] = []
  
  for (const file of files) {
    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File "${file.name}" exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
      continue
    }
    
    // Type validation
    const isValidType = isImageFile(file) || 
      file.type.startsWith('text/') || 
      file.type === 'application/pdf' ||
      file.type === 'application/json'
    
    if (!isValidType) {
      errors.push(`File "${file.name}" has unsupported type: ${file.type}`)
    }
  }

  const duration = performance.now() - startTime
  // Validation completed

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Type guard for user messages
function isValidUserMessage(input: string, files: File[]): boolean {
  return (input.trim().length > 0) || (files && files.length > 0)
}

// Utility function to convert UIMessage to MessageAISDK for AI SDK v5 compatibility
function convertToMessageAISDK(message: UIMessage | ChatMessage): MessageAISDK {
  // Handle messages with experimental_attachments - convert to multimodal format for backend
  if ((message as any).experimental_attachments && Array.isArray((message as any).experimental_attachments)) {
    const attachments = (message as any).experimental_attachments
    const content: any[] = []
    
    // Add text content
    const textContent = (message as any).content || 
      (message.parts?.find((p: any) => p.type === 'text')?.text) || 'User message'
    
    content.push({
      type: "text",
      text: textContent
    })
    
    // Add attachment content
    for (const attachment of attachments) {
      if (attachment.contentType?.startsWith('image/')) {
        content.push({
          type: "file",
          name: attachment.name,
          mediaType: attachment.contentType,
          url: attachment.url,
        })
      } else if (!attachment.contentType?.startsWith('image/')) {
        // For non-image files (documents, etc.)
        content.push({
          type: "file", 
          name: attachment.name,
          mediaType: attachment.contentType,
          url: attachment.url,
        })
      }
    }
    
  // Converted message with attachments for multimodal content
    
    return {
      id: message.id || Date.now().toString(),
      role: message.role,
      content: content as any, // Use multimodal array format for backend
      parts: message.parts,
      createdAt: (message as any).createdAt,
    }
  }
  
  // Handle regular text messages
  let content = ""
  
  if ((message as any).content && typeof (message as any).content === 'string') {
    content = (message as any).content
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
  // 🚀 Performance tracking
  const performanceRef = useRef({
    inputChanges: 0,
    debouncedCalls: 0,
    rerenders: 0,
    lastRender: performance.now()
  })

  // State management - AI SDK v5 requires manual input management
  const [input, setInput] = useState(draftValue || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasDialogAuth, setHasDialogAuth] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  // Defer heavy consumers of the input value to keep typing responsive
  const deferredInput = useDeferredValue(input)
  // Mark heavy state updates (like large message list changes) as non-urgent
  const [isUiPending, startUiTransition] = useTransition()

  // 🎯 Performance: AbortController for stream cancellation
  const retryCountRef = useRef<number>(0)

  // Refs and derived state  
  const hasSentFirstMessageRef = useRef(false)
  const prevChatIdRef = useRef<string | null>(chatId)
  
  // 🎯 Performance: Memoized derived values
  const isAuthenticated = useMemo(() => !!user?.id, [user?.id])
  
  const { preferences } = useUserPreferences()

  // 🎯 Performance: Track re-renders
  useEffect(() => {
    performanceRef.current.rerenders++
    const now = performance.now()
    performanceRef.current.lastRender = now
  })
  
  // Generate dynamic system prompt with current model info and personality settings
    const systemPrompt = useMemo(() => {
      // Get current model name for logging
      const currentModelName = sanitizeModelName(selectedModel || "unknown-model")

      // Build the base Cleo prompt (personality-aware if available)
      let basePrompt: string
      if (preferences.personalitySettings) {
        basePrompt = generatePersonalizedPrompt(currentModelName, preferences.personalitySettings)
      } else {
        basePrompt = getCleoPrompt(currentModelName, "default")
      }

      // If the user has a custom system prompt, append it as an addendum instead of replacing
      if (user?.system_prompt && user.system_prompt.trim().length > 0) {
        const addendum = user.system_prompt.trim()
        return `${basePrompt}\n\nUSER ADDENDUM:\n${addendum}`
      }

      return basePrompt
    }, [user?.system_prompt, selectedModel, preferences.personalitySettings])

  // Search params handling
  const searchParams = useSearchParams()
  const prompt = searchParams.get("prompt")

  // 🎯 Performance: Debounced error handling
  const debouncedHandleError = useMemo(
  () => debounce((error: Error) => {
      
      let errorMsg = error.message || "Something went wrong."
      if (errorMsg === "An error occurred" || errorMsg === "fetch failed") {
        errorMsg = "Something went wrong. Please try again."
      }

      // Reset retry count on user-facing error
      retryCountRef.current = 0

      toast({
        title: errorMsg,
        status: "error",
      })
    }, 500),
    []
  )

  // Handle errors directly in onError callback
  const handleError = useCallback((error: Error) => {
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

  // Error state for UI consumers
  const [error, setError] = useState<Error | null>(null)

  // Core sendMessage with SSE streaming handling
  const sendMessage = useCallback(
    async ({
      text,
      experimental_attachments,
    }: {
      text: string
      experimental_attachments?: Array<{
        name: string
        contentType: string
        url: string
      }>
    }) => {
      // Optimistically add the user message with attachments for display
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        createdAt: new Date(),
        parts: [{ type: "text", text }],
        ...(experimental_attachments ? { experimental_attachments } : {}),
      }
      startUiTransition(() => {
        setMessages((prev) => [...prev, userMessage])
      })

      // Prepare controller
      if (abortControllerRef.current) {
        try { abortControllerRef.current.abort() } catch {}
      }
      abortControllerRef.current = new AbortController()
      setStatus("in_progress")
      setError(null)

      try {
        const effectiveUserId = isAuthenticated
          ? (user?.id as string)
          : await getOrCreateGuestUserId(user)
        if (!effectiveUserId) {
          throw new Error('Unable to resolve a user id (guest sign-in failed)')
        }

        // Ensure chat exists if needed
        let effectiveChatId = chatId
        try {
          if (!effectiveChatId && ensureChatExists) {
            effectiveChatId = await ensureChatExists(effectiveUserId, text)
          }
        } catch (e) {
          // ensureChatExists failed
        }
        if (!effectiveChatId) {
          throw new Error('Unable to create or locate a chat session')
        }

        const response = await fetch(API_ROUTE_CHAT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: effectiveUserId,
            chatId: effectiveChatId,
            model: selectedModel,
            isAuthenticated,
            systemPrompt,
            enableSearch,
            messages: [...messages, userMessage].map(convertToMessageAISDK),
          }),
          signal: abortControllerRef.current.signal,
        })

  // Sending chat request

        if (!response.ok) {
          let errText = "Failed to send message"
          try {
            const errorData = await response.json()
            errText = errorData.error || errText
          } catch {}
          throw new Error(errText)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")

        // Prepare assistant placeholder
        let buffer = ""
        const assistantMessageObj: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "",
          createdAt: new Date(),
          parts: [],
        } as ChatMessage

        startUiTransition(() => {
          setMessages((prev: ChatMessage[]) => [...prev, assistantMessageObj])
        })

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

                      // If this is (or looks like) the openDocument tool, surface the document content
                      try {
                        const toolName = toolPart?.toolInvocation?.toolName
                        const output = data.output
                        // Detect document-shaped result even if toolName differs
                        const docContent: string =
                          (output && typeof output === 'object' && (
                            output.documentContent ||
                            output.document?.fullContent ||
                            output.canvasEditorAction?.content
                          )) || ''
                        const docTitle: string | undefined =
                          (output && typeof output === 'object' && (output.document?.title || output.document?.filename)) || undefined

                        // Avoid duplicate surfacing if already done for this tool call
                        const alreadySurfaced = Boolean(toolPart?.toolInvocation?.resultSurfaced)
                        const isDocumentTool = toolName === 'openDocument' || (!!docContent && docContent.length > 0)

                        if (!alreadySurfaced && isDocumentTool && typeof docContent === 'string' && docContent.trim().length > 0) {
                          const header = docTitle ? `Contenido de ${docTitle}:\n\n` : ''

                          // Mark as surfaced to prevent duplicates
                          try { (toolPart.toolInvocation as any).resultSurfaced = true } catch {}

                          // Push as a text part so it appears in the assistant message directly
                          assistantMessageObj.parts.push({
                            type: 'text',
                            text: `${header}${docContent}`,
                          })

                          // Update concatenated content for backward compatibility
                          assistantMessageObj.content = assistantMessageObj.parts
                            .filter((p) => p.type === 'text')
                            .map((p: any) => (p.type === 'text' ? p.text : ''))
                            .join('')
                        }
                      } catch {}
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
                    assistantMessageObj.parts.push({
                      type: "reasoning",
                      text: "",
                    })
                    break

                  case "reasoning-delta":
                    // Update reasoning part
                    const reasoningPart = assistantMessageObj.parts.findLast(
                      (p) => p.type === "reasoning"
                    )
                    if (reasoningPart && reasoningPart.type === "reasoning") {
                      reasoningPart.text += data.delta
                    }
                    break

                  case "reasoning-end":
                    // Finish reasoning part - the actual reasoning content might be here
                    const endReasoningPart = assistantMessageObj.parts.findLast(
                      (p) => p.type === "reasoning"
                    )
                    if (endReasoningPart && endReasoningPart.type === "reasoning" && data.text) {
                      endReasoningPart.text = data.text
                    }
                    break

                  case "finish":
                    // Check if reasoning is included in the finish event
                    if (data.reasoning) {
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

                    // Capture finish-event text if present and no text part exists
                    try {
                      const finishText = typeof (data?.text) === 'string' ? (data.text as string) : ''
                      const hasAnyTextPart = assistantMessageObj.parts.some((p: any) => p.type === 'text' && (p.text || '').trim().length > 0)
                      if (finishText && !hasAnyTextPart) {
                        assistantMessageObj.parts.push({ type: 'text', text: finishText })
                        assistantMessageObj.content = finishText
                      }
                    } catch {}

                    // DISABLED: Fallback synthesis system - let the model generate its own responses
                    break

                  case "finish-step":
                    break

                  default:
                    break
                }

                // Update the message in state
                startUiTransition(() => {
                  setMessages((prev: ChatMessage[]) => {
                    const newMessages = [...prev]
                    newMessages[newMessages.length - 1] = {
                      ...assistantMessageObj,
                    }
                    return newMessages
                  })
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

                startUiTransition(() => {
                  setMessages((prev: ChatMessage[]) => {
                    const newMessages = [...prev]
                    newMessages[newMessages.length - 1] = {
                      ...assistantMessageObj,
                    }
                    return newMessages
                  })
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
    }, [
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
    ])

  // 🛑 Enhanced stop function with logging
  const stop = useCallback(() => {
    const stopStartTime = performance.now()
    
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort()
        setStatus("ready")
        setIsSubmitting(false)
        
        const stopDuration = performance.now() - stopStartTime
        
        toast({
          title: "Message cancelled",
          status: "info",
        })
      } catch (error) {
        // Swallow error and keep UI responsive
      }
    } else {
      // No active stream to cancel
    }
  }, [isSubmitting])

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
      startUiTransition(() => {
        setMessages(messagesWithoutLastAssistant)
      })
      
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

  // Input is updated immediately; debounce should be applied to side-effects, not the input state itself.

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    performanceRef.current.inputChanges++
    // Immediate update for UX responsiveness; side-effects should implement their own debouncing.
    setInput(value)
  }, [])

  // 🧹 Cleanup debounced functions on unmount
  useEffect(() => {
    return () => {
    debouncedHandleError.cancel()
    }
  }, [debouncedHandleError])

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault()

  // No debounced input to cancel; input updates are immediate

      // 🔒 Early validation with logging
  if (!isValidUserMessage(input, files)) {
        return
      }

  if (isSubmitting) {
        return
      }

      // 📁 Validate files before processing
      const fileValidation = validateFiles(files)
      if (!fileValidation.isValid) {
        fileValidation.errors.forEach(error => {
          toast({
            title: error,
            status: "error",
          })
        })
        return
      }

      const submitStartTime = performance.now()
      const messageText = input.trim() // Guardar el texto antes de limpiar
      const currentFiles = [...files] // Guardar archivos antes de limpiar
      
  // Start submission

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

        // Convert files to experimental_attachments format
        const fileAttachments: Array<{
          name: string
          contentType: string
          url: string
        }> = []

        if (currentFiles.length > 0) {
          for (const file of currentFiles) {
            // Convert file to data URL
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onload = (e) => resolve(e.target?.result as string)
              reader.readAsDataURL(file)
            })
            
            fileAttachments.push({
              name: file.name,
              contentType: file.type,
              url: dataUrl,
            })
          }
        }

        // Combine file attachments with Supabase attachments
        const allAttachments = [
          ...fileAttachments,
          ...supabaseAttachments.map((att) => ({
            name: att.name,
            contentType: att.contentType,
            url: att.url,
          }))
        ]

  // Send message with attachments

        // Send message using experimental_attachments format
        await sendMessage({
          text: messageText,
          ...(allAttachments.length > 0 && {
            experimental_attachments: allAttachments,
          }),
        })

        // Input and files already cleared at the start
      } catch (error) {
        const duration = performance.now() - submitStartTime
  // Submit error, will retry if possible
        
        // 🔄 Retry logic with exponential backoff
        if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
          retryCountRef.current++
          const retryDelay = RETRY_DELAY_BASE * Math.pow(2, retryCountRef.current - 1)
          
          
          setTimeout(() => {
            // Restore input and files for retry
            setInput(messageText)
            setFiles(currentFiles)
            toast({
              title: `Retrying... (${retryCountRef.current}/${MAX_RETRY_ATTEMPTS})`,
              status: "info",
            })
          }, retryDelay)
        } else {
          // Max retries reached, use debounced error handler
          debouncedHandleError(error as Error)
          retryCountRef.current = 0 // Reset for future attempts
        }
      } finally {
  const totalDuration = performance.now() - submitStartTime
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
      // Regenerate error
    }
  }, [regenerate])

  return {
    messages,
    input,
  deferredInput,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading: status === "in_progress",
    error,
    stop,
    reload: handleRegenerate,
    append: sendMessage, // For backward compatibility
    isSubmitting,
  isUiPending,
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
    
    // 📊 Performance metrics (for debugging)
    _performance: {
      inputChanges: performanceRef.current.inputChanges,
      debouncedCalls: performanceRef.current.debouncedCalls,
      rerenders: performanceRef.current.rerenders,
      efficiency: performanceRef.current.inputChanges > 0 
        ? ((performanceRef.current.inputChanges - performanceRef.current.debouncedCalls) / performanceRef.current.inputChanges * 100).toFixed(1) + '%'
        : '0%'
    }
  }
}

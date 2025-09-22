// AI SDK v5 compatible useChat hook
import { toast } from "@/components/ui/toast"
import { getOrCreateGuestUserId } from "@/lib/api"
import { MessageAISDK } from "@/lib/chat-store/messages/api"
import { Attachment } from "@/lib/file-handling"
import { isImageFile } from "@/lib/image-utils"
import { generatePersonalizedPrompt } from "@/lib/prompts/personality"
import { getCleoPrompt, sanitizeModelName } from "@/lib/prompts"
import { getModelInfo } from "@/lib/models"
import { MODEL_DEFAULT } from "@/lib/config"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { API_ROUTE_CHAT, API_ROUTE_CHAT_GUEST } from "@/lib/routes"
import type { UserProfile } from "@/lib/user/types"
import type { UIMessage } from "ai"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue, useTransition } from "react"
import { debounce } from "lodash"
import { useGuestMemory } from "@/app/hooks/use-guest-memory"

// 🔧 Performance & Robustness Utilities
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_BASE = 1000 // 1s base delay

// Global counter for unique ID generation
let messageIdCounter = 0

// Generate unique message ID to prevent React key conflicts
function generateUniqueMessageId(): string {
  const timestamp = Date.now()
  const counter = ++messageIdCounter
  const random = Math.random().toString(36).substr(2, 6)
  return `msg_${timestamp}_${counter}_${random}`
}

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
      file.type === 'application/json' ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    
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
      id: message.id || generateUniqueMessageId(),
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
    id: message.id || generateUniqueMessageId(),
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

  // Guest memory for non-authenticated users
  const guestMemory = useGuestMemory()

  // State management - AI SDK v5 requires manual input management
  const [input, setInput] = useState(draftValue || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasDialogAuth, setHasDialogAuth] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  // Pending tool confirmation state (single at a time for now)
  const [pendingToolConfirmation, setPendingToolConfirmation] = useState<null | {
    toolCallId: string
    toolName: string
    confirmationId: string
    preview: any
    pendingAction?: any
    category?: string
    sensitivity?: string
    undoable?: boolean
  }>(null)
  // Track seen confirmation IDs to avoid duplicate UI prompts from repeated SSE events
  const seenConfirmationIdsRef = useRef<Set<string>>(new Set())
  async function respondToToolConfirmation(accept: boolean) {
    if (!pendingToolConfirmation) return
    const body = {
      confirmationId: pendingToolConfirmation.confirmationId,
      toolCallId: pendingToolConfirmation.toolCallId,
      accept,
    }
    try {
      const res = await fetch('/api/confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pendingToolConfirmation.confirmationId, approved: accept })
      })
      if (!res.ok) throw new Error('Failed confirming tool')
      const json = await res.json()
      if (accept && json.executed) {
        const toolMsg: ChatMessage = {
          id: `tool-${pendingToolConfirmation.toolCallId}`,
          role: 'assistant',
          content: '',
          createdAt: new Date(),
          parts: [
            {
              type: 'tool-invocation',
              toolInvocation: {
                state: 'result',
                toolName: pendingToolConfirmation.toolName,
                toolCallId: pendingToolConfirmation.toolCallId,
                result: json.result || { success: true, message: json.message || 'Action completed' },
              },
            } as any,
          ],
        }
        setMessages((m) => [...m, toolMsg])
      }
    } catch (e) {
      console.error('Confirm tool error', e)
    } finally {
      setPendingToolConfirmation(null)
    }
  }
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
  // Track performance metrics - only update when needed
  useEffect(() => {
    performanceRef.current.rerenders++
    const now = performance.now()
    performanceRef.current.lastRender = now
  }, []) // Add empty dependency array to prevent infinite re-renders
  
  // Generate dynamic system prompt with current model info and personality settings
    const systemPrompt = useMemo(() => {
      // Get current model name for logging
      const currentModelName = sanitizeModelName(selectedModel || "unknown-model")

      // Determine the appropriate prompt variant based on the model
      let promptVariant: 'default' | 'local' | 'llama31' | 'cybersecurity' = 'default'
      
      if (currentModelName.includes('llama3.1') || currentModelName.includes('llama-3.1')) {
        promptVariant = 'llama31' // Use optimized Llama 3.1 prompt
      } else if (currentModelName.startsWith('ollama:') || currentModelName.includes('local')) {
        promptVariant = 'local' // Use local optimized prompt for other local models
      }

      // Build the base Cleo prompt (personality-aware if available)
      let basePrompt: string
      if (preferences.personalitySettings) {
        basePrompt = generatePersonalizedPrompt(currentModelName, preferences.personalitySettings)
      } else {
        basePrompt = getCleoPrompt(currentModelName, promptVariant)
      }

      // Intentionally silenced in production to avoid leaking internal details
      if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  // ...existing code...
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

  // Load guest memory for non-authenticated users
  useEffect(() => {
    if (!isAuthenticated && guestMemory.hasMemory && messages.length === 0) {
      // Convert guest memory to chat messages for display
      const guestMessagesAsChat = guestMemory.guestMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt || new Date(),
        parts: [{ type: "text" as const, text: msg.content }]
      })) as ChatMessage[]
      
      setMessages(guestMessagesAsChat)
    }
  }, [isAuthenticated, guestMemory.hasMemory, guestMemory.guestMessages, messages.length])

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
        id: generateUniqueMessageId(),
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

  const endpoint = isAuthenticated ? API_ROUTE_CHAT : API_ROUTE_CHAT_GUEST

  // Validate selected model before sending. If the frontend has an unknown model id
  // (for example from legacy favorites or stale cached chats), fall back to the
  // application default model to avoid server-side 'Model not found' errors.
  const resolvedModel = getModelInfo(selectedModel) ? selectedModel : MODEL_DEFAULT
  if (resolvedModel !== selectedModel) {
    console.warn(`[ChatAPI] Invalid model requested: ${selectedModel}. Falling back to ${resolvedModel}`)
  }

  // Prepare messages for request
  let messagesToSend: ChatMessage[]
  if (isAuthenticated) {
    // For authenticated users, use current session messages
    messagesToSend = [...messages, userMessage]
  } else {
    // For guests, use memory + current message
    const guestMessagesFormatted = guestMemory.guestMessages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt || new Date()
    })) as ChatMessage[]
    
    messagesToSend = [...guestMessagesFormatted, userMessage]
    
    // Add user message to guest memory
    guestMemory.addMessage({
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      createdAt: userMessage.createdAt
    } as MessageAISDK)
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: effectiveUserId,
      chatId: effectiveChatId,
      model: resolvedModel,
      isAuthenticated,
      systemPrompt,
      enableSearch,
      messages: messagesToSend.map(convertToMessageAISDK),
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
                  case 'tool-confirmation': {
                    try {
                      const c = (data as any).confirmation
                      if (c?.confirmationId) {
                        if (seenConfirmationIdsRef.current.has(c.confirmationId)) {
                          // Duplicate event - ignore
                          if (process.env.NODE_ENV !== 'production') console.debug('[confirmation] duplicate tool-confirmation ignored', c.confirmationId)
                        } else {
                          seenConfirmationIdsRef.current.add(c.confirmationId)
                          if (process.env.NODE_ENV !== 'production') console.debug('[confirmation] new tool-confirmation', c.confirmationId)
                        }
                        setPendingToolConfirmation({
                          toolCallId: c.toolCallId,
                          toolName: c.toolName,
                          confirmationId: c.confirmationId,
                          preview: c.preview,
                          pendingAction: c.pendingAction,
                        })
                      }
                    } catch {}
                    break
                  }
                  case "pending-confirmation":
                    try {
                      // Only set if no active confirmation to avoid overlap
                      if (!pendingToolConfirmation && data.confirmationId) {
                        if (seenConfirmationIdsRef.current.has(data.confirmationId)) {
                          if (process.env.NODE_ENV !== 'production') console.debug('[confirmation] duplicate pending-confirmation ignored', data.confirmationId)
                          break
                        }
                        seenConfirmationIdsRef.current.add(data.confirmationId)
                        if (process.env.NODE_ENV !== 'production') console.debug('[confirmation] new pending-confirmation', data.confirmationId)
                        setPendingToolConfirmation({
                          toolCallId: data.confirmationId || `confirm-${Date.now()}`,
                          toolName: data.toolName || 'tool',
                          confirmationId: data.confirmationId,
                          preview: {
                            message: data.message,
                            params: data.params
                          },
                          category: data.category,
                          sensitivity: data.sensitivity,
                          undoable: data.undoable,
                        })
                      }
                    } catch {}
                    break
                  case "confirmation-resolved":
                    try {
                      if (pendingToolConfirmation && pendingToolConfirmation.confirmationId === data.confirmationId) {
                        setPendingToolConfirmation(null)
                        if (data.confirmationId) {
                          if (process.env.NODE_ENV !== 'production') console.debug('[confirmation] resolved and cleared', data.confirmationId, 'approved:', data.approved)
                        }
                      }
                    } catch {}
                    break
                  case "tool-invocation": {
                    // New SSE shape from /api/multi-model-chat: surface tool call/result in real time
                    try {
                      const ti = (data as any).toolInvocation as {
                        state: "partial-call" | "call" | "result"
                        toolName: string
                        toolCallId: string
                        args?: any
                        result?: any
                      }
                      if (!ti || !ti.toolCallId) break

                      ensureParts(assistantMessageObj)

                      // Find existing tool part by call id
                      let toolPart = assistantMessageObj.parts!.find(
                        (p: any) =>
                          p.type === "tool-invocation" &&
                          p.toolInvocation?.toolCallId === ti.toolCallId
                      ) as any

                      if (!toolPart) {
                        // Create a new tool invocation part
                        toolPart = {
                          type: "tool-invocation",
                          toolInvocation: {
                            state: ti.state || "call",
                            toolName: ti.toolName || "tool",
                            toolCallId: ti.toolCallId,
                            ...(ti.args !== undefined ? { args: ti.args } : {}),
                            ...(ti.result !== undefined ? { result: ti.result } : {}),
                          },
                        }
                        assistantMessageObj.parts!.push(toolPart)
                      } else {
                        // Update existing invocation state/args/result
                        try { toolPart.toolInvocation.state = ti.state || toolPart.toolInvocation.state } catch {}
                        if (ti.args !== undefined) {
                          try { toolPart.toolInvocation.args = ti.args } catch {}
                        }
                        if (ti.result !== undefined) {
                          try { toolPart.toolInvocation.result = ti.result } catch {}
                        }
                      }
                    } catch {}
                    break
                  }
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

                  case "execution-step": {
                    // Bridge for orchestrator-backed SSE: push execution step as a part
                    try {
                      ensureParts(assistantMessageObj)
                      assistantMessageObj.parts.push({
                        type: 'execution-step',
                        step: (data as any).step,
                      } as any)
                    } catch {}
                    break
                  }

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

                  case "delegation-start":
                    // Convert delegation start to execution step
                    try {
                      ensureParts(assistantMessageObj)
                      const step = {
                        id: `delegation-start-${data.agentId}-${Date.now()}`,
                        timestamp: data.timestamp || new Date().toISOString(),
                        agent: data.agentName || data.agentId,
                        action: 'delegation' as const,
                        content: `Starting delegation to ${data.agentName}: ${data.task}`,
                        metadata: { 
                          delegation: true, 
                          targetAgent: data.agentId,
                          task: data.task
                        }
                      }
                      assistantMessageObj.parts.push({
                        type: 'execution-step',
                        step,
                      } as any)
                    } catch {}
                    break

                  case "delegation-processing":
                    // Convert delegation processing to execution step
                    try {
                      ensureParts(assistantMessageObj)
                      const step = {
                        id: `delegation-processing-${data.agentId}-${Date.now()}`,
                        timestamp: data.timestamp || new Date().toISOString(),
                        agent: data.agentName || data.agentId,
                        action: 'delegation' as const,
                        content: `${data.agentName} is processing the task...`,
                        metadata: { 
                          delegation: true, 
                          targetAgent: data.agentId,
                          status: data.status
                        }
                      }
                      assistantMessageObj.parts.push({
                        type: 'execution-step',
                        step,
                      } as any)
                    } catch {}
                    break

                  case "delegation-progress":
                    // Update existing delegation step or create new one
                    try {
                      ensureParts(assistantMessageObj)
                      const step = {
                        id: `delegation-progress-${data.agentId}-${Date.now()}`,
                        timestamp: data.timestamp || new Date().toISOString(),
                        agent: data.agentName || data.agentId,
                        action: 'delegation' as const,
                        content: `${data.agentName} progress: ${data.status}${data.progress ? ` (${data.progress}%)` : ''}`,
                        metadata: { 
                          delegation: true, 
                          targetAgent: data.agentId,
                          status: data.status,
                          progress: data.progress
                        }
                      }
                      assistantMessageObj.parts.push({
                        type: 'execution-step',
                        step,
                      } as any)
                    } catch {}
                    break

                  case "delegation-complete":
                    // Convert delegation completion to execution step
                    try {
                      ensureParts(assistantMessageObj)
                      const step = {
                        id: `delegation-complete-${data.agentId}-${Date.now()}`,
                        timestamp: data.timestamp || new Date().toISOString(),
                        agent: data.agentName || data.agentId,
                        action: 'delegation' as const,
                        content: `${data.agentName} completed the task successfully`,
                        metadata: { 
                          delegation: true, 
                          targetAgent: data.agentId,
                          result: data.result,
                          status: 'completed'
                        }
                      }
                      assistantMessageObj.parts.push({
                        type: 'execution-step',
                        step,
                      } as any)
                    } catch {}
                    break

                  case "delegation-error":
                    // Convert delegation error to execution step
                    try {
                      ensureParts(assistantMessageObj)
                      const step = {
                        id: `delegation-error-${data.agentId}-${Date.now()}`,
                        timestamp: data.timestamp || new Date().toISOString(),
                        agent: data.agentName || data.agentId,
                        action: 'delegation' as const,
                        content: `${data.agentName} failed: ${data.error}`,
                        metadata: { 
                          delegation: true, 
                          targetAgent: data.agentId,
                          error: data.error,
                          status: 'failed'
                        }
                      }
                      assistantMessageObj.parts.push({
                        type: 'execution-step',
                        step,
                      } as any)
                    } catch {}
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
        const finalAssistantMessage = convertToMessageAISDK({
          ...assistantMessageObj,
          parts: assistantMessageObj.parts,
        } as UIMessage)
        
        if (isAuthenticated) {
          cacheAndAddMessage(finalAssistantMessage)
        } else {
          // For guest users, add to guest memory
          guestMemory.addMessage(finalAssistantMessage)
        }
        
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
    // Remove messages.length from dependencies to prevent infinite loop (React Error #185)
    // Instead, check if initialMessages is different from current messages
    if (!isSubmitting && (chatIdChanged || initialMessages.length > messages.length)) {
      setMessages(initialMessages as ChatMessage[])
    }
  }, [initialMessages, isSubmitting, chatId]) // Removed messages.length to fix infinite loop

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

        // Combine attachments with de-duplication logic:
        // - Prefer Supabase URLs for documents (server stored)
        // - Keep data URLs for images (we don't upload images to Supabase here)
        const supaSet = new Set(
          supabaseAttachments.map((att) => `${att.name}|${att.contentType}`)
        )
        const supaMapped = supabaseAttachments.map((att) => ({
          name: att.name,
          contentType: att.contentType,
          url: att.url,
        }))

        const filteredLocal = fileAttachments.filter((att) => {
          const key = `${att.name}|${att.contentType}`
          const isImage = att.contentType?.startsWith('image/')
          // Keep images; for non-images, only keep if there's no Supabase entry
          return isImage || !supaSet.has(key)
        })

        const allAttachments = [
          ...supaMapped,
          ...filteredLocal,
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
    pendingToolConfirmation,
    acceptToolConfirmation: () => respondToToolConfirmation(true),
    rejectToolConfirmation: () => respondToToolConfirmation(false),
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

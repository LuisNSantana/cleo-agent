// AI SDK v5 compatible useChat hook
import { getCleoPrompt, sanitizeModelName } from "@/lib/prompts"
import { toast } from "@/components/ui/toast"
import { Attachment } from "@/lib/file-handling"
import { API_ROUTE_CHAT } from "@/lib/routes"
import type { UserProfile } from "@/lib/user/types"
import type { UIMessage } from "@ai-sdk/react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getOrCreateGuestUserId } from '@/lib/api'

// Extended message type with content property
type ChatMessage = UIMessage & {
  content: string
}

type UseChatCoreProps = {
  initialMessages: UIMessage[]
  draftValue: string
  cacheAndAddMessage: (message: UIMessage) => void
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
    const currentModelName = sanitizeModelName(selectedModel || 'unknown-model')
    
    // Log model information for debugging
    console.log(`[CLEO] Active model: ${currentModelName}`)
    
    // Return Cleo's modular prompt with current model info
    return getCleoPrompt(currentModelName, 'default')
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
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages as ChatMessage[])
  const [status, setStatus] = useState<'ready' | 'in_progress' | 'error'>('ready')
  const [error, setError] = useState<Error | null>(null)
  
  // Map internal status to Conversation component expected status
  const conversationStatus = useMemo(() => {
    switch (status) {
      case 'in_progress':
        return 'submitted' as const
      case 'error':
        return 'error' as const
      default:
        return 'ready' as const
    }
  }, [status])
  const abortControllerRef = useRef<AbortController | null>(null)

  // Custom sendMessage function
  const sendMessage = useCallback(async ({ text }: { text: string; experimental_attachments?: unknown[] }) => {
    // For guest users, get or create a proper guest user ID
    let effectiveUserId: string | null = user?.id || null
    if (!effectiveUserId) {
      effectiveUserId = await getOrCreateGuestUserId(user)
      if (!effectiveUserId) {
        handleError(new Error('Unable to create user session'))
        return
      }
    }
    
    let effectiveChatId = chatId
    if (!effectiveChatId) {
      effectiveChatId = await ensureChatExists(effectiveUserId, text)
      if (!effectiveChatId) {
        handleError(new Error('Unable to create chat session'))
        return
      }
    }

    setStatus('in_progress')
    setError(null)
    
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      createdAt: new Date(),
      parts: [{ type: 'text', text }],
    } as ChatMessage
    
    setMessages(prev => [...prev, userMessage])
    cacheAndAddMessage(userMessage)

    try {
      abortControllerRef.current = new AbortController()
      
      const response = await fetch(API_ROUTE_CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        throw new Error(errorData.error || 'Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let assistantMessage = ''
      const assistantMessageObj: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
        parts: [{ type: 'text', text: '' }],
      } as ChatMessage

      setMessages(prev => [...prev, assistantMessageObj])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        assistantMessage += chunk
        assistantMessageObj.content = assistantMessage
        assistantMessageObj.parts = [{ type: 'text', text: assistantMessage }]
        
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = { ...assistantMessageObj }
          return newMessages
        })
      }

      // Cache final assistant message
      cacheAndAddMessage({ 
        ...assistantMessageObj, 
        parts: [{ type: 'text', text: assistantMessage }]
      } as UIMessage)
      setStatus('ready')
      
    } catch (err) {
      const error = err as Error
      if (error.name !== 'AbortError') {
        setError(error)
        setStatus('error')
        handleError(error)
      }
    }
  }, [user, chatId, selectedModel, isAuthenticated, systemPrompt, enableSearch, messages, cacheAndAddMessage, handleError, ensureChatExists])

  // Stop function
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setStatus('ready')
    }
  }, [])

  // Regenerate function
  const regenerate = useCallback(async () => {
    if (messages.length === 0) return
    
    // Remove last assistant message and resend last user message
    const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      const messagesWithoutLastAssistant = messages.filter((m, i) => 
        !(i === messages.length - 1 && m.role === 'assistant')
      )
      setMessages(messagesWithoutLastAssistant)
      await sendMessage({ text: lastUserMessage.content })
    }
  }, [messages, sendMessage])

  // Handle search params on mount
  useEffect(() => {
    if (prompt && typeof window !== "undefined") {
      requestAnimationFrame(() => setInput(prompt))
    }
  }, [prompt])

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
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isSubmitting) return
    
    const messageText = input.trim() // Guardar el texto antes de limpiar
    setInput("") // Limpiar input inmediatamente
    setFiles([]) // Limpiar archivos inmediatamente
    clearDraft() // Limpiar draft inmediatamente
    setIsSubmitting(true)
    
    try {
      // Handle file uploads and attachments
      let attachments: Attachment[] = []
      if (files.length > 0 && user?.id && chatId) {
        const uploadedAttachments = await handleFileUploads(user.id, chatId)
        if (uploadedAttachments) {
          attachments = uploadedAttachments
        }
      }

      // Send message using AI SDK v5 sendMessage
      await sendMessage({
        text: messageText,
        // Add attachments if any
        ...(attachments.length > 0 && {
          experimental_attachments: attachments.map(att => ({
            name: att.name,
            contentType: att.contentType,
            url: att.url,
          }))
        })
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
  }, [input, isSubmitting, files, user?.id, chatId, handleFileUploads, sendMessage, setFiles, clearDraft, toast])

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
    hasSentFirstMessageRef,
    submit: () => handleSubmit({ preventDefault: () => {} } as React.FormEvent),
    handleSuggestion: (suggestion: string) => {
      setInput(suggestion)
    },
    handleReload: handleRegenerate,
  }
}

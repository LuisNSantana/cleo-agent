"use client"

import { useChat } from "@ai-sdk/react"
import type { MessageAISDK } from "@/lib/chat-store/messages/api"
import { useFileUpload } from "@/app/components/chat/use-file-upload"
import { useModel } from "@/app/components/chat/use-model"
import { useChatOperations } from "@/app/components/chat/use-chat-operations"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useUser } from "@/lib/user-store/provider"
import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import { AnimatePresence, motion } from "framer-motion"
import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { toast } from "@/components/ui/toast"
import { MESSAGE_MAX_LENGTH, SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { Attachment } from "@/lib/file-handling"
import { getEnhancedProjectSystemPrompt } from "@/lib/prompts/project"
import { getMessagesFromDb, getCachedMessages } from "@/lib/chat-store/messages/api"
import { cn } from "@/lib/utils"

// Helper to extract text from message parts
function extractTextFromParts(parts: any[]): string {
  if (!parts || !Array.isArray(parts)) return ""
  
  const textParts = parts
    .filter((part) => part?.type === "text")
    .map((part) => part.text || "")
    .filter(Boolean)
  
  return textParts.join("\n\n") || "User message"
}

// Convert UIMessage to MessageAISDK
function convertToMessageAISDK(message: any): MessageAISDK {
  return {
    id: message.id || crypto.randomUUID(),
    role: message.role,
    content: message.content || extractTextFromParts(message.parts),
    parts: message.parts,
    createdAt: new Date(),
    experimental_attachments: message.experimental_attachments,
  }
}

interface ProjectChatSessionProps {
  chatId: string
  projectId: string
  projectName: string
  projectDescription?: string
  projectNotes?: string
  projectDocs: Array<{ filename: string; title: string | null }>
  className?: string
}

export function ProjectChatSession({
  chatId,
  projectId,
  projectName,
  projectDescription,
  projectNotes,
  projectDocs,
  className
}: ProjectChatSessionProps) {
  const { user } = useUser()
  const { chats, bumpChat, createNewChat, updateChatModel, updateTitle } = useChats() // createNewChat needed for strict typing of useChatOperations
  const currentChat = chats.find(c => c.id === chatId) || null
  const { cacheAndAddMessage } = useMessages()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // File upload state for this session
  const {
    files,
    setFiles,
    handleFileUploads,
    handleFileUpload,
    handleFileRemove,
  } = useFileUpload()

  // Model management
  const { selectedModel, handleModelChange } = useModel({
     currentChat,
     user: user || null,
     updateChatModel,
     chatId
  })
  
  // Initialize AI SDK hook
  // Crucial: We use the chatId as the ID to ensure isolation
  const chatHelpers = useChat({
    id: chatId,
    // api: '/api/chat', // Default is used
    onFinish: (message: any) => cacheAndAddMessage(convertToMessageAISDK(message)),
    onError: (error) => {
      // Suppress specific validation error from AI SDK/Zod that doesn't affect functionality
      if (error.message.includes("Type validation failed") || error.message.includes("finishReason")) {
        console.warn("Suppressed chat validation error:", error)
        return
      }
      console.error("Chat error:", error)
      toast({ title: "Error en el chat", description: error.message, status: "error" })
    }
  })

  // Extract helpers
  const { messages, setMessages, stop, status, sendMessage } = chatHelpers as any

  const setInputMaybe = (chatHelpers as any).setInput

  // Local input state
  const [localInput, setLocalInput] = useState("")

  // Load initial messages on mount
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setMessages([]) // Start fresh
        
        // 1. Try cache
        const cached = await getCachedMessages(chatId)
        if (active && cached && cached.length > 0) {
          setMessages(cached as any)
        }
        
        // 2. Try DB
        const fresh = await getMessagesFromDb(chatId)
        if (active && fresh && fresh.length > 0) {
          setMessages(fresh as any)
        }
      } catch (e) {
        console.error("Failed to load messages for", chatId, e)
      }
    }
    load()
    return () => { active = false }
  }, [chatId, setMessages])

  // Chat Operations (for edit/delete context menu)
  const { handleDelete, handleEdit } = useChatOperations({
    isAuthenticated: true,
    chatId: chatId,
    messages: messages as any[],
    selectedModel,
    systemPrompt: SYSTEM_PROMPT_DEFAULT,
    createNewChat, // Required by type, not used effectively here
    setHasDialogAuth: () => {},
    setMessages: setMessages as any,
    setInput: () => {},
  })

  // Handle Input Change
  const handleInputChange = useCallback((value: string) => {
    setLocalInput(value)
    if (typeof setInputMaybe === 'function') {
      try { setInputMaybe(value) } catch {}
    }
  }, [setInputMaybe])

  // Submit Handler
  const submit = useCallback(async () => {
    if (!user?.id || !localInput.trim()) return
    setIsSubmitting(true)

    const textToSend = localInput
    const submittedFiles = [...files]
    setFiles([])
    setLocalInput("")

    try {
      if (textToSend.length > MESSAGE_MAX_LENGTH) {
        throw new Error(`Message too long (max ${MESSAGE_MAX_LENGTH})`)
      }

      let attachments: Attachment[] | null = []
      if (submittedFiles.length > 0) {
        attachments = await handleFileUploads(user.id, chatId)
        if (attachments === null) {
          setIsSubmitting(false) // Upload failed
          return 
        }
      }

      // Optimistic Update (handled by append, but we might need attachments pre-processing if not using standard file input)
      // Actually, append handles optimistic user message addition.
      
      const userMessageRequest = {
        role: 'user' as const,
        content: textToSend,
        experimental_attachments: attachments && attachments.length > 0 ? attachments : undefined,
      }

      // Update title on first message (optimistic)
      if (messages.length === 0) {
        const title = textToSend.slice(0, 50) + (textToSend.length > 50 ? '...' : '')
        // Clean up title (remove markdown, newlines)
        const cleanTitle = title.replace(/[#*`]/g, '').replace(/\n/g, ' ').trim()
        updateTitle(chatId, cleanTitle).catch(e => console.error("Failed to update title", e))
      }

      await sendMessage(userMessageRequest, {
        body: {
          chatId,
          userId: user.id,
          model: selectedModel,
          isAuthenticated: true,
          systemPrompt: getEnhancedProjectSystemPrompt(
             projectName,
             projectDescription,
             projectNotes,
             projectDocs.map(d => ({ filename: d.filename, title: d.title }))
          ),
          projectId,
          enableSearch: true,
        },
      })

      bumpChat(chatId)

    } catch (e: any) {
      console.error(e)
      toast({ title: "Failed to send", description: e.message, status: "error" })
    } finally {
       setIsSubmitting(false)
    }
  }, [
    user?.id, 
    localInput, 
    chatId, 
    files, 
    messages, 
    selectedModel, 
    projectName, 
    projectDescription, 
    projectNotes, 
    projectDocs,
    handleFileUploads,
    setFiles,
    sendMessage, // Added dependency
    bumpChat,
    updateTitle,
    projectId
  ])

  // Measure ChatInput height for dynamic bottom padding (mobile)
    const inputRef = useRef<HTMLDivElement | null>(null)
    const [inputHeight, setInputHeight] = useState(0)
    useEffect(() => {
      if (!inputRef.current) return
      const el = inputRef.current
      const ro = new ResizeObserver(() => {
        const h = el.getBoundingClientRect().height
        setInputHeight(Math.ceil(h + 8))
      })
      ro.observe(el)
      return () => ro.disconnect()
    }, [])
  
  // Props for sub-components
  const conversationProps = useMemo(() => ({
    messages: messages as any[],
    status: status as any,
    onDelete: handleDelete,
    onEdit: handleEdit,
    onReload: () => {}, // TODO: Implement reload if needed
    userId: user?.id,
  }), [messages, status, handleDelete, handleEdit, user?.id])

  const chatInputProps = useMemo(() => ({
    value: localInput,
    onValueChangeAction: handleInputChange,
    onSendAction: submit,
    isSubmitting,
    files,
    onFileUploadAction: handleFileUpload,
    onFileRemoveAction: handleFileRemove,
    onSuggestionAction: (s: string) => setLocalInput(s),
    hasSuggestions: false,
    onSelectModelAction: handleModelChange,
    selectedModel,
    isUserAuthenticated: true,
    stopAction: stop,
    status: status as any,
    setEnableSearchAction: () => {},
    enableSearch: true,
  }), [localInput, handleInputChange, submit, isSubmitting, files, handleFileUpload, handleFileRemove, selectedModel, stop, status, handleModelChange])

  return (
    <div 
      className={cn("flex flex-col h-full relative overflow-hidden", className)}
      style={{ ['--chat-input-height' as any]: `${inputHeight}px` }}
    >
      <div className="flex-1 overflow-y-auto w-full">
         <Conversation {...conversationProps} />
      </div>

      <motion.div
        className="z-50 mx-auto w-full max-w-3xl relative inset-x-0 bottom-0"
        layout="position"
        layoutId="chat-input-container"
        ref={inputRef}
      >
        <ChatInput {...chatInputProps} />
      </motion.div>
    </div>
  )
}

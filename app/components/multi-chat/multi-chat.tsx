"use client"

import { MultiModelConversation } from "@/app/components/multi-chat/multi-conversation"
import { toast } from "@/components/ui/toast"
import { getOrCreateGuestUserId } from "@/lib/api"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { useChatSession } from "@/lib/chat-store/session/provider"
import { getCleoPrompt } from "@/lib/prompts"
import { useModel } from "@/lib/model-store/provider"
import { useUser } from "@/lib/user-store/provider"
import { cn } from "@/lib/utils"
// Using any for message type to avoid strict role mismatch issues
type MessageType = any
import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useMemo, useState, useEffect } from "react"
import { MultiChatInput } from "./multi-chat-input"
import { useMultiChat } from "./use-multi-chat"

type GroupedMessage = {
  userMessage: MessageType
  responses: {
    model: string
    message: MessageType
    isLoading?: boolean
    provider: string
  }[]
  onDelete: (model: string, id: string) => void
  onEdit: (model: string, id: string, newText: string) => void
  onReload: (model: string) => void
}

export function MultiChat() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [prompt, setPrompt] = useState("")
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [multiChatId, setMultiChatId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { user } = useUser()
  const { models } = useModel()
  const { chatId } = useChatSession()
  const { messages: persistedMessages, isLoading: messagesLoading } =
    useMessages()
  const { createNewChat } = useChats()

  const availableModels = useMemo(() => {
    return models.map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
    }))
  }, [models])

  const modelsFromPersisted = useMemo(() => {
    return persistedMessages
      .filter((msg) => (msg as any).model)
      .map((msg) => (msg as any).model)
  }, [persistedMessages])

  const modelsFromLastGroup = useMemo(() => {
    const userMessages = persistedMessages.filter((msg) => msg.role === "user")
    if (userMessages.length === 0) return []

    const lastUserMessage = userMessages[userMessages.length - 1]
    const lastUserIndex = persistedMessages.indexOf(lastUserMessage)

    const modelsInLastGroup: string[] = []
    for (let i = lastUserIndex + 1; i < persistedMessages.length; i++) {
      const msg = persistedMessages[i]
      if (msg.role === "user") break
      if (msg.role === "assistant" && (msg as any).model) {
        modelsInLastGroup.push((msg as any).model)
      }
    }
    return modelsInLastGroup
  }, [persistedMessages])

  const allModelsToMaintain = useMemo(() => {
    const combined = [...new Set([...selectedModelIds, ...modelsFromPersisted])]
    return availableModels.filter((model) => combined.includes(model.id))
  }, [availableModels, selectedModelIds, modelsFromPersisted])

  useEffect(() => {
    if (selectedModelIds.length === 0 && modelsFromLastGroup.length > 0) {
      setSelectedModelIds(modelsFromLastGroup)
    }
  }, [selectedModelIds.length, modelsFromLastGroup])

  const modelChats = useMultiChat(allModelsToMaintain)
  const [enableSearch, setEnableSearch] = useState(false)
  // Generate system prompt with fallback to default Cleo prompt
  const systemPrompt = useMemo(
    () => user?.system_prompt || getCleoPrompt('multi-chat-model', 'default'),
    [user?.system_prompt]
  )
  const isAuthenticated = useMemo(() => !!user?.id, [user?.id])

  const createPersistedGroups = useCallback(() => {
    // When there's no active chat (Home), don't render persisted groups
    if (!chatId) return {} as { [key: string]: GroupedMessage }
    const extractTextFromParts = (parts?: any[]): string => {
      if (!parts || !Array.isArray(parts)) return ""
      return parts
        .filter((p) => p && p.type === "text")
        .map((p) => p.text || "")
        .filter(Boolean)
        .join("\n\n")
    }
    const persistedGroups: { [key: string]: GroupedMessage } = {}

    if (persistedMessages.length === 0) return persistedGroups

    const groups: {
      [key: string]: {
        userMessage: MessageType
        assistantMessages: MessageType[]
      }
    } = {}

    for (let i = 0; i < persistedMessages.length; i++) {
      const message = persistedMessages[i]

      if (message.role === "user") {
        const groupKey = (message as any).content || extractTextFromParts((message as any).parts)
        if (!groups[groupKey]) {
          groups[groupKey] = {
            userMessage: message,
            assistantMessages: [],
          }
        }
      } else if (message.role === "assistant") {
        let associatedUserMessage = null
        for (let j = i - 1; j >= 0; j--) {
          if (persistedMessages[j].role === "user") {
            associatedUserMessage = persistedMessages[j]
            break
          }
        }

        if (associatedUserMessage) {
          const groupKey = (associatedUserMessage as any).content || extractTextFromParts((associatedUserMessage as any).parts)
          if (!groups[groupKey]) {
            groups[groupKey] = {
              userMessage: associatedUserMessage,
              assistantMessages: [],
            }
          }
          groups[groupKey].assistantMessages.push(message)
        }
      }
    }

    Object.entries(groups).forEach(([groupKey, group]) => {
      if (group.userMessage) {
        persistedGroups[groupKey] = {
          userMessage: group.userMessage,
          responses: group.assistantMessages.map((msg, index) => {
            const model =
              (msg as any).model || selectedModelIds[index] || `model-${index}`
            const provider =
              models.find((m) => m.id === model)?.provider || "unknown"

            return {
              model,
              message: msg,
              isLoading: false,
              provider,
            }
          }),
          onDelete: () => {},
          onEdit: () => {},
          onReload: () => {},
        }
      }
    })

    return persistedGroups
  }, [persistedMessages, selectedModelIds, models, chatId])

  const messageGroups = useMemo(() => {
    // Home route (no chatId) must show a clean onboarding with no prior content
    if (!chatId) return [] as GroupedMessage[]
    const extractTextFromParts = (parts?: any[]): string => {
      if (!parts || !Array.isArray(parts)) return ""
      return parts
        .filter((p) => p && p.type === "text")
        .map((p) => p.text || "")
        .filter(Boolean)
        .join("\n\n")
    }
    const persistedGroups = createPersistedGroups()
    const liveGroups = { ...persistedGroups }

    modelChats.forEach((chat) => {
      for (let i = 0; i < chat.messages.length; i += 2) {
        const userMsg = chat.messages[i]
        const assistantMsg = chat.messages[i + 1]

        if (userMsg?.role === "user") {
          const groupKey = (userMsg as any).content || extractTextFromParts((userMsg as any).parts)

          if (!liveGroups[groupKey]) {
            liveGroups[groupKey] = {
              userMessage: userMsg,
              responses: [],
              onDelete: () => {},
              onEdit: () => {},
              onReload: () => {},
            }
          }

          if (assistantMsg?.role === "assistant") {
            const existingResponse = liveGroups[groupKey].responses.find(
              (r) => r.model === chat.model.id
            )

            if (!existingResponse) {
              liveGroups[groupKey].responses.push({
                model: chat.model.id,
                message: assistantMsg,
                isLoading: false,
                provider: chat.model.provider,
              })
            }
          } else if (
            chat.isLoading &&
            ((userMsg as any).content || extractTextFromParts((userMsg as any).parts)) === prompt &&
            selectedModelIds.includes(chat.model.id)
          ) {
            const placeholderMessage: MessageType = {
              id: `loading-${chat.model.id}`,
              role: "assistant",
              parts: [{ type: "text", text: "" }],
            }
            liveGroups[groupKey].responses.push({
              model: chat.model.id,
              message: placeholderMessage,
              isLoading: true,
              provider: chat.model.provider,
            })
          }
        }
      }
    })

    return Object.values(liveGroups)
  }, [createPersistedGroups, modelChats, prompt, selectedModelIds, chatId])

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) return

    if (selectedModelIds.length === 0) {
      toast({
        title: "No models selected",
        description: "Please select at least one model to chat with.",
        status: "error",
      })
      return
    }

    setIsSubmitting(true)

    // Enforce max attachments cap to keep prompts manageable
    if (files.length > 5) {
      toast({
        title: "Máximo 5 archivos por mensaje",
        description: "Se enviarán solo los primeros 5 adjuntos.",
        status: "info",
      })
      setFiles((prev) => prev.slice(0, 5))
    }

    try {
      const uid = await getOrCreateGuestUserId(user)
      if (!uid) return

      const message_group_id = crypto.randomUUID()

      let chatIdToUse = multiChatId || chatId
      if (!chatIdToUse) {
        const createdChat = await createNewChat(
          uid,
          prompt,
          selectedModelIds[0],
          !!user?.id
        )
        if (!createdChat) {
          throw new Error("Failed to create chat")
        }
        chatIdToUse = createdChat.id
        setMultiChatId(chatIdToUse)
        window.history.pushState(null, "", `/c/${chatIdToUse}`)
      }

      const selectedChats = modelChats.filter((chat) =>
        selectedModelIds.includes(chat.model.id)
      )

      // Optional debug document id (set in browser console: localStorage.setItem('debugDocumentId', '<doc-id>'))
      let debugDocumentId: string | undefined
      if (typeof window !== 'undefined') {
        debugDocumentId = localStorage.getItem('debugDocumentId') || undefined
      }

  await Promise.all(
        selectedChats.map(async (chat) => {
          const options = {
            body: {
              chatId: chatIdToUse,
              userId: uid,
              model: chat.model.id,
              isAuthenticated: !!user?.id,
              systemPrompt: systemPrompt,
              enableSearch: enableSearch || !!debugDocumentId, // auto-enable if debug doc id present
              documentId: debugDocumentId,
              message_group_id,
              debugRag: true,
            },
          }

          chat.append({ role: "user", content: prompt }, options)
        })
      )

      setPrompt("")
      setFiles([])
    } catch (error) {
      console.error("Failed to send message:", error)
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        status: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    prompt,
    selectedModelIds,
    user,
    modelChats,
    systemPrompt,
    multiChatId,
    chatId,
    createNewChat,
  enableSearch,
  ])

  const handleFileUpload = useCallback((newFiles: File[]) => {
    setFiles((prev) => {
      const combined = [...prev, ...newFiles]
      if (combined.length > 5) {
        toast({
          title: "Máximo 5 archivos por mensaje",
          description: "Se conservarán los primeros 5.",
          status: "info",
        })
      }
      return combined.slice(0, 5)
    })
  }, [])

  const handleFileRemove = useCallback((fileToRemove: File) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove))
  }, [])

  const handleStop = useCallback(() => {
    modelChats.forEach((chat) => {
      if (chat.isLoading && selectedModelIds.includes(chat.model.id)) {
        chat.stop()
      }
    })
  }, [modelChats, selectedModelIds])

  const anyLoading = useMemo(
    () =>
      modelChats.some(
        (chat) => chat.isLoading && selectedModelIds.includes(chat.model.id)
      ),
    [modelChats, selectedModelIds]
  )

  const conversationProps = useMemo(() => ({ messageGroups }), [messageGroups])

  const inputProps = useMemo(
    () => ({
      value: prompt,
      onValueChangeAction: setPrompt,
      onSendAction: handleSubmit,
      isSubmitting,
      files,
      onFileUploadAction: handleFileUpload,
      onFileRemoveAction: handleFileRemove,
      selectedModelIds,
      onSelectedModelIdsChangeAction: setSelectedModelIds,
      isUserAuthenticated: isAuthenticated,
      stopAction: handleStop,
      status: anyLoading ? ("streaming" as const) : ("ready" as const),
      anyLoading,
      enableSearch,
      setEnableSearch,
    }),
    [
      prompt,
      handleSubmit,
      isSubmitting,
      files,
      handleFileUpload,
      handleFileRemove,
      selectedModelIds,
      isAuthenticated,
      handleStop,
      anyLoading,
      enableSearch,
    ]
  )

  const showOnboarding = messageGroups.length === 0 && !messagesLoading

  if (!mounted) return null

  return (
    <div
      className={cn(
        "@container/main relative flex h-full flex-col items-center overflow-hidden",
        showOnboarding ? "justify-end md:justify-center" : "justify-end"
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {showOnboarding ? (
          <motion.div
            key="onboarding"
            className="absolute bottom-[60%] mx-auto max-w-[50rem] md:relative md:bottom-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            layout="position"
            layoutId="onboarding"
            transition={{ layout: { duration: 0 } }}
          >
            <h1
              className="mb-6 mt-4 text-3xl md:text-4xl font-semibold tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-indigo-700 dark:from-white dark:to-indigo-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
              aria-label="Let cleo be with you."
            >
              Let cleo be with you.
            </h1>
          </motion.div>
        ) : (
          <motion.div
            key="conversation"
            className="w-full flex-1 overflow-hidden"
            layout="position"
            layoutId="conversation"
            transition={{
              layout: { duration: messageGroups.length === 1 ? 0.3 : 0 },
            }}
          >
            <MultiModelConversation {...conversationProps} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "z-50 mx-auto w-full max-w-3xl",
          showOnboarding ? "relative" : "fixed md:absolute right-0 bottom-0 left-0 pb-[max(env(safe-area-inset-bottom),0px)]"
        )}
        layout="position"
        layoutId="multi-chat-input-container"
        transition={{
          layout: { duration: messageGroups.length === 1 ? 0.3 : 0 },
        }}
      >
        <MultiChatInput {...inputProps} />
      </motion.div>
    </div>
  )
}

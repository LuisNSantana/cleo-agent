"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { CleoMascot } from "@/app/components/cleo-mascot"
import { Conversation } from "@/app/components/chat/conversation"
import { useModel } from "@/app/components/chat/use-model"
import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { useChatSession } from "@/lib/chat-store/session/provider"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useUser } from "@/lib/user-store/provider"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { redirect } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import { useChatCore } from "./use-chat-core"
import { useChatOperations } from "./use-chat-operations"
import { useFileUpload } from "./use-file-upload"

const FeedbackWidget = dynamic(
  () => import("./feedback-widget").then((mod) => mod.FeedbackWidget),
  { ssr: false }
)

const DialogAuth = dynamic(
  () => import("./dialog-auth").then((mod) => mod.DialogAuth),
  { ssr: false }
)

export function Chat() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const { chatId } = useChatSession()
  const {
    createNewChat,
    getChatById,
    updateChatModel,
    bumpChat,
    isLoading: isChatsLoading,
  } = useChats()

  const currentChat = useMemo(
    () => (chatId ? getChatById(chatId) : null),
    [chatId, getChatById]
  )

  const { messages: initialMessages, cacheAndAddMessage } = useMessages()
  const { user } = useUser()
  const { preferences } = useUserPreferences()
  const { draftValue, clearDraft } = useChatDraft(chatId)

  // File upload functionality
  const {
    files,
    setFiles,
    handleFileUploads,
    createOptimisticAttachments,
    cleanupOptimisticAttachments,
    handleFileUpload,
    handleFileRemove,
  } = useFileUpload()

  // Model selection
  const { selectedModel, handleModelChange } = useModel({
    currentChat: currentChat || null,
    user,
    updateChatModel,
    chatId,
  })

  // State to pass between hooks
  const [hasDialogAuth, setHasDialogAuth] = useState(false)
  const isAuthenticated = useMemo(() => !!user?.id, [user?.id])
  const systemPrompt = useMemo(
    () => user?.system_prompt || SYSTEM_PROMPT_DEFAULT,
    [user?.system_prompt]
  )

  // Chat operations (utils + handlers) - created first
  const { checkLimitsAndNotify, ensureChatExists, handleDelete, handleEdit } =
    useChatOperations({
      isAuthenticated,
      chatId,
      messages: initialMessages,
      selectedModel,
      systemPrompt,
      createNewChat,
      setHasDialogAuth,
      setMessages: () => {},
      setInput: () => {},
    })

  // Core chat functionality (initialization + state + actions)
  const {
    messages,
    input,
    handleInputChange,
    isSubmitting,
    stop,
    status,
    conversationStatus,
    chatInputStatus,
    hasSentFirstMessageRef,
    submit,
    handleSuggestion,
    handleReload,
    enableSearch,
    setEnableSearch,
  } = useChatCore({
    initialMessages,
    draftValue,
    cacheAndAddMessage,
    chatId,
    user,
    files,
    createOptimisticAttachments,
    setFiles,
    checkLimitsAndNotify,
    cleanupOptimisticAttachments,
    ensureChatExists,
    handleFileUploads,
    selectedModel,
    clearDraft,
    bumpChat,
  })

  // Memoize the conversation props to prevent unnecessary rerenders
  const conversationProps = useMemo(
    () => ({
      messages,
      status: conversationStatus,
      onDelete: handleDelete,
      onEdit: handleEdit,
      onReload: handleReload,
    }),
    [messages, conversationStatus, handleDelete, handleEdit, handleReload]
  )

  // Memoize the chat input props
  const chatInputProps = useMemo(
    () => ({
      value: input,
  onSuggestionAction: handleSuggestion,
  onValueChangeAction: handleInputChange,
  onSendAction: submit,
      isSubmitting,
      files,
  onFileUploadAction: handleFileUpload,
  onFileRemoveAction: handleFileRemove,
      hasSuggestions:
        preferences.promptSuggestions && !chatId && messages.length === 0,
  onSelectModelAction: handleModelChange,
      selectedModel,
      isUserAuthenticated: isAuthenticated,
  stopAction: stop,
      status: chatInputStatus,
  setEnableSearchAction: setEnableSearch,
      enableSearch,
    }),
    [
      input,
  handleSuggestion,
  handleInputChange,
  submit,
      isSubmitting,
      files,
  handleFileUpload,
  handleFileRemove,
      preferences.promptSuggestions,
      chatId,
      messages.length,
  handleModelChange,
      selectedModel,
      isAuthenticated,
  stop,
      chatInputStatus,
  setEnableSearch,
      enableSearch,
    ]
  )

  // Handle redirect for invalid chatId - only redirect if we're certain the chat doesn't exist
  // and we're not in a transient state during chat creation
  if (
    chatId &&
    !isChatsLoading &&
    !currentChat &&
    !isSubmitting &&
    status === "ready" &&
    messages.length === 0 &&
    !hasSentFirstMessageRef.current // Don't redirect if we've already sent a message in this session
  ) {
    return redirect("/")
  }

  const showOnboarding = !chatId && messages.length === 0

  if (!mounted) return null

  return (
    <div
      className={cn(
        "@container/main relative flex h-full flex-col items-center justify-end md:justify-center overflow-hidden"
      )}
    >
      <DialogAuth open={hasDialogAuth} setOpen={setHasDialogAuth} />

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
            transition={{
              layout: {
                duration: 0,
              },
            }}
          >
            {/* Desktop hero */}
            <div className="hidden md:block">
              <CleoMascot />
            </div>
            <h1
              className="hidden md:block mb-6 mt-4 text-4xl font-semibold tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-indigo-700 dark:from-white dark:to-indigo-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
              aria-label="Let cleo be with you."
            >
              Let cleo be with you.
            </h1>

            {/* Mobile hero (replicates desktop message + mini video) */}
            <div className="md:hidden flex flex-col items-center justify-center px-4 pt-6 pb-24">
              <div className="scale-75">
                <CleoMascot />
              </div>
              <h2
                className="mt-2 text-2xl font-semibold tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-indigo-700 dark:from-white dark:to-indigo-300 text-center"
                aria-label="Let cleo be with you."
              >
                Let cleo be with you.
              </h2>
            </div>
          </motion.div>
        ) : (
          <Conversation key="conversation" {...conversationProps} />
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "fixed md:relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-4xl bg-gradient-to-t from-background/80 to-transparent md:bg-transparent"
        )}
        layout="position"
        layoutId="chat-input-container"
        transition={{
          layout: {
            duration: messages.length === 1 ? 0.3 : 0,
          },
        }}
      >
        <ChatInput {...chatInputProps} />
      </motion.div>

      <FeedbackWidget authUserId={user?.id} />
    </div>
  )
}

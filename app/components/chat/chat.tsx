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
import { AnimatePresence, motion } from "framer-motion"
import dynamic from "next/dynamic"
import { redirect } from "next/navigation"
import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { useChatCore } from "./use-chat-core"
import { TipOnboarding } from "../onboarding/tip-onboarding"
import { useChatOperations } from "./use-chat-operations"
import { useFileUpload } from "./use-file-upload"
import ConfirmationPanel, { ConfirmationItem } from "@/components/chat/confirmation-panel"

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
  // Measure ChatInput height for dynamic bottom padding (mobile)
  const inputRef = useRef<HTMLDivElement | null>(null)
  const [inputHeight, setInputHeight] = useState(0)
  useEffect(() => {
    if (!inputRef.current) return
    const el = inputRef.current
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height
      // Add a small margin to ensure last message is fully visible
      setInputHeight(Math.ceil(h + 8))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
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
  const [placeholder, setPlaceholder] = useState<string | undefined>()
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
    pendingToolConfirmation,
    acceptToolConfirmation,
    rejectToolConfirmation,
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
      userId: user?.id, // For image generation
    }),
    [messages, conversationStatus, handleDelete, handleEdit, handleReload, user?.id]
  )

  const handleShowPlaceholder = useCallback((newPlaceholder: string) => {
    setPlaceholder(newPlaceholder)
  }, [])

  const handleClearPlaceholder = useCallback(() => {
    setPlaceholder(undefined)
  }, [])

  const showOnboarding = !chatId && messages.length === 0

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
      placeholder,
      onClearPlaceholderAction: handleClearPlaceholder,
      onShowPlaceholderAction: handleShowPlaceholder,
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
      placeholder,
      handleClearPlaceholder,
      handleShowPlaceholder,
    ]
  )

    // --- Confirmation Panel Integration ---
    // Heuristic category inference based on tool name
    const inferCategory = useCallback((toolName: string): string => {
      if (/calendar|event/i.test(toolName)) return 'calendarActions'
      if (/mail|email|inbox/i.test(toolName)) return 'emailActions'
      if (/file|doc|note|notion|document/i.test(toolName)) return 'fileActions'
      if (/delete|remove|destroy|purge/i.test(toolName)) return 'delete'
      if (/tweet|social|post/i.test(toolName)) return 'socialActions'
      return 'dataModification'
    }, [])

    // Sensitivity inference
    const inferSensitivity = useCallback((toolName: string): 'low'|'medium'|'high'|'critical' => {
      if (/delete|destroy|purge/i.test(toolName)) return 'critical'
      if (/update|modify|write|create|send/i.test(toolName)) return 'high'
      if (/open|read|fetch|get/i.test(toolName)) return 'low'
      return 'medium'
    }, [])

    const confirmationItems: ConfirmationItem[] = useMemo(() => {
      if (!pendingToolConfirmation) return []
      const previewSource: any = pendingToolConfirmation.preview || pendingToolConfirmation.pendingAction?.input || {}
      const details: {label: string; value: string}[] = []
      // Flatten simple key/value pairs into details (limit 12 to keep UI tidy)
      if (previewSource && typeof previewSource === 'object') {
        Object.entries(previewSource).slice(0, 12).forEach(([k,v]) => {
          if (v == null) return
          let valueStr: string
          if (typeof v === 'string') valueStr = v
          else if (typeof v === 'number' || typeof v === 'boolean') valueStr = String(v)
          else valueStr = JSON.stringify(v)
          // Truncate very long values
          if (valueStr.length > 220) valueStr = valueStr.slice(0, 217) + '…'
          details.push({ label: k, value: valueStr })
        })
      }
      return [{
        id: pendingToolConfirmation.confirmationId,
        toolName: pendingToolConfirmation.toolName,
        category: inferCategory(pendingToolConfirmation.toolName),
        sensitivity: inferSensitivity(pendingToolConfirmation.toolName),
        undoable: !/delete|destroy|purge/i.test(pendingToolConfirmation.toolName),
        timestamp: Date.now(),
        preview: {
          title: pendingToolConfirmation.toolName,
          summary: previewSource?.message || undefined,
          details,
          warnings: /delete|destroy|purge/i.test(pendingToolConfirmation.toolName) ? ["This action cannot be undone."] : undefined
        },
        message: typeof previewSource === 'string' ? previewSource : undefined
      }]
    }, [pendingToolConfirmation, inferCategory, inferSensitivity])

    const [confirmationLoadingId, setConfirmationLoadingId] = useState<string|null>(null)
    const handleResolveConfirmation = useCallback(async (id: string, approved: boolean) => {
      if (!pendingToolConfirmation) return
      setConfirmationLoadingId(id)
      try {
        if (approved) await acceptToolConfirmation()
        else await rejectToolConfirmation()
      } finally {
        // Clear loading state slightly after hook clears pendingToolConfirmation to avoid flicker
        setTimeout(() => setConfirmationLoadingId(null), 120)
      }
    }, [pendingToolConfirmation, acceptToolConfirmation, rejectToolConfirmation])

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

  if (!mounted) return null

  return (
    <div
      className={cn(
        "@container/main relative flex h-full flex-col items-center justify-end md:justify-center overflow-hidden"
      )}
      style={{ ['--chat-input-height' as any]: `${inputHeight}px` }}
    >
      <DialogAuth open={hasDialogAuth} setOpen={setHasDialogAuth} />

      <AnimatePresence initial={false} mode="popLayout">
        {showOnboarding ? (
          <motion.div
            key="onboarding"
            className="mx-auto max-w-[50rem] md:relative"
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
              className="hidden md:block mb-6 mt-4 text-4xl font-extrabold tracking-tight leading-tight relative text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
              aria-label="Let cleo be with you."
            >
              <span className="relative inline-block book-reveal-text bg-inherit">Let cleo be with you.</span>
            </h1>

            {/* Mobile hero (replicates desktop message + mini video) */}
            <div
              className="md:hidden flex flex-col items-center justify-center px-4"
              style={{
                // Respect notches and browser bars and ensure content centers in the visible viewport above the input area
                paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
                minHeight: 'calc(100dvh - var(--chat-input-height) - var(--spacing-app-header) - env(safe-area-inset-bottom) - 24px)'
              }}
            >
              <div className="scale-90 -translate-y-1">
                <CleoMascot />
              </div>
              <h2
                className="mt-3 text-2xl font-bold tracking-tight leading-tight text-center relative text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400"
                aria-label="Let cleo be with you."
              >
                <span className="relative inline-block book-reveal-text bg-inherit">Let cleo be with you.</span>
              </h2>
            </div>
            {/* First-run tips */}
            <div className="mt-4 flex justify-center">
              <TipOnboarding />
            </div>
          </motion.div>
        ) : (
          <>
            <Conversation key="conversation" {...conversationProps} />
            {confirmationItems.length > 0 && (
              <div className="w-full max-w-4xl mx-auto px-4 mt-2 md:static md:relative">
                {/* Sticky container on mobile: keeps confirmation visible above input */}
                <div className="md:static fixed left-0 right-0 bottom-[calc(var(--chat-input-height)+env(safe-area-inset-bottom)+8px)] z-40 px-4 md:px-0 pointer-events-none md:pointer-events-auto">
                  <div className="pointer-events-auto">
                <ConfirmationPanel
                  items={confirmationItems}
                  onResolve={handleResolveConfirmation}
                  loadingId={confirmationLoadingId}
                />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "fixed md:relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-4xl pb-2 md:pb-0 bg-gradient-to-t from-background/80 to-transparent md:bg-transparent"
        )}
        layout="position"
        layoutId="chat-input-container"
        transition={{
          layout: {
            duration: messages.length === 1 ? 0.3 : 0,
          },
        }}
        ref={inputRef}
      >
        <ChatInput {...chatInputProps} />
      </motion.div>

      <FeedbackWidget authUserId={user?.id} />
    </div>
  )
}

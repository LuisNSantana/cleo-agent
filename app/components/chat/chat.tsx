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
import type { AgentMode } from "@/app/api/chat/schema"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useUser } from "@/lib/user-store/provider"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import dynamic from "next/dynamic"
import { redirect } from "next/navigation"
import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { useChatCore } from "./use-chat-core"
import { TipOnboarding } from "../onboarding/tip-onboarding"
import { WelcomeMessage } from "./welcome-message"
import { useChatOperations } from "./use-chat-operations"
import { useFileUpload } from "./use-file-upload"
import ConfirmationPanel, { ConfirmationItem } from "@/components/chat/confirmation-panel"
import { VoiceMode } from "@/app/components/voice/voice-mode"
import { ProjectChatHeader } from "./project-chat-header"
import { useQuery } from "@tanstack/react-query"

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
  const [voiceModeOpen, setVoiceModeOpen] = useState(false)
  const [agentMode, setAgentMode] = useState<AgentMode>('super') // Default to Super Ankie
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

  // Fetch project info if this chat belongs to a project
  const { data: projectInfo } = useQuery({
    queryKey: ['chat-project', currentChat?.project_id],
    queryFn: async () => {
      if (!currentChat?.project_id) return null
      const response = await fetch(`/api/projects/${currentChat.project_id}`)
      if (!response.ok) return null
      return response.json()
    },
    enabled: !!currentChat?.project_id,
  })

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

  // FIX: Clear visual state when navigating to New Chat
  // This prevents old messages from showing until refresh
  const prevChatIdRef = useRef<string | null>(chatId)
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      // chatId changed - force cleanup of any stale UI state
      prevChatIdRef.current = chatId
      setFiles([]) // Clear files immediately
    }
  }, [chatId, setFiles])

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
    agentMode,
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
      onVoiceModeAction: isAuthenticated ? () => setVoiceModeOpen(true) : undefined,
      agentMode,
      onAgentModeChangeAction: setAgentMode,
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
      agentMode,
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
      
      console.log('🔍 [CHAT.TSX] Building confirmationItems from:', {
        toolName: pendingToolConfirmation.toolName,
        hasPreview: !!pendingToolConfirmation.preview,
        hasEmailData: !!pendingToolConfirmation.preview?.emailData,
        previewKeys: Object.keys(pendingToolConfirmation.preview || {})
      })
      
      // Use the preview directly if it exists (for interrupts with rich data like emails)
      if (pendingToolConfirmation.preview && typeof pendingToolConfirmation.preview === 'object') {
        return [{
          id: pendingToolConfirmation.confirmationId,
          toolName: pendingToolConfirmation.toolName,
          category: pendingToolConfirmation.category || inferCategory(pendingToolConfirmation.toolName),
          sensitivity: (pendingToolConfirmation.sensitivity as any) || inferSensitivity(pendingToolConfirmation.toolName),
          undoable: pendingToolConfirmation.undoable ?? (!/delete|destroy|purge/i.test(pendingToolConfirmation.toolName)),
          timestamp: Date.now(),
          preview: pendingToolConfirmation.preview, // Use the rich preview directly
          message: pendingToolConfirmation.preview.summary
        }]
      }
      
      // Fallback for legacy confirmations without rich preview
      const previewSource: any = pendingToolConfirmation.pendingAction?.input || {}
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
    const handleResolveConfirmation = useCallback(async (id: string, approved: boolean, editedData?: any) => {
      if (!pendingToolConfirmation) return
      setConfirmationLoadingId(id)
      try {
        if (approved) {
          console.log('📧 [CHAT] Approving with edited data:', editedData)
          await acceptToolConfirmation(editedData)
        } else {
          await rejectToolConfirmation()
        }
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

      {/* Project Chat Header - Show when chat belongs to a project */}
      {currentChat?.project_id && projectInfo && !projectInfo._error && (
        <ProjectChatHeader
          projectId={currentChat.project_id}
          projectName={projectInfo.name || "Project"}
        />
      )}

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
            <WelcomeMessage />
          </motion.div>
        ) : (
          <Conversation key="conversation" {...conversationProps} />
        )}
      </AnimatePresence>

      {/* Tool Approval Panel - renders above input when approval is needed */}
      {confirmationItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="z-50 mx-auto w-full max-w-3xl px-4 pb-4"
        >
          <ConfirmationPanel
            items={confirmationItems}
            onResolve={handleResolveConfirmation}
            loadingId={confirmationLoadingId}
          />
        </motion.div>
      )}

      <motion.div
        className={cn(
          "z-50 mx-auto w-full max-w-3xl",
          showOnboarding ? "relative" : "relative inset-x-0 bottom-0"
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

      {/* Voice Mode Modal */}
      {voiceModeOpen && (
        <VoiceMode
          chatId={chatId || undefined}
          onClose={() => setVoiceModeOpen(false)}
        />
      )}
    </div>
  )
}

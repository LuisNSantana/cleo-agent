"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import { useChatOperations } from "@/app/components/chat/use-chat-operations"
import { useFileUpload } from "@/app/components/chat/use-file-upload"
import { useModel } from "@/app/components/chat/use-model"
import { ProjectChatItem } from "@/app/components/layout/sidebar/project-chat-item"
import { toast } from "@/components/ui/toast"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import type { MessageAISDK } from "@/lib/chat-store/messages/api"
import { MESSAGE_MAX_LENGTH, SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { Attachment } from "@/lib/file-handling"
// API_ROUTE_CHAT no longer used with useChat v5
import { useUser } from "@/lib/user-store/provider"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react"
import { ChatCircleIcon, PencilSimple, Check, X } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useCallback, useMemo, useState, useEffect } from "react"
import type { Chat } from "@/lib/chat-store/types"

type Project = {
  id: string
  name: string
  user_id: string
  created_at: string
  description?: string | null
  notes?: string | null
}

type ProjectViewProps = {
  projectId: string
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

// Extract text content from parts array for AI SDK v5
function extractTextFromParts(parts: any[]): string {
  if (!parts || !Array.isArray(parts)) return ""
  
  const textParts = parts
    .filter((part) => part?.type === "text")
    .map((part) => part.text || "")
    .filter(Boolean)
  
  return textParts.join("\n\n") || "User message"
}

export function ProjectView({ projectId }: ProjectViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const { user } = useUser()
  const { createNewChat, bumpChat } = useChats()
  const { cacheAndAddMessage } = useMessages()
  const pathname = usePathname()
  const {
    files,
    setFiles,
    handleFileUploads,
    createOptimisticAttachments,
    cleanupOptimisticAttachments,
    handleFileUpload,
    handleFileRemove,
  } = useFileUpload()

  // Fetch project details
  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch project")
      }
      return response.json()
    },
  })

  // Local editable fields for project meta
  const [desc, setDesc] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [savingMeta, setSavingMeta] = useState(false)
  const [name, setName] = useState<string>("")
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)

  // Hydrate local state from fetched project (safe effect)
  useEffect(() => {
    if (project) {
      setName(project.name || "")
      setDesc(project.description || "")
      setNotes(project.notes || "")
    }
  }, [project?.id])

  const saveProjectMeta = useCallback(async () => {
    if (!project) return
    try {
      setSavingMeta(true)
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc, notes }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast({ title: 'Proyecto actualizado', status: 'success' })
    } catch (e: any) {
      toast({ title: 'No se pudo actualizar el proyecto', status: 'error' })
    } finally {
      setSavingMeta(false)
    }
  }, [project, desc, notes])

  const saveProjectName = useCallback(async () => {
    if (!project) return
    try {
      setSavingName(true)
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc, notes }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast({ title: 'Nombre actualizado', status: 'success' })
      setEditingName(false)
    } catch (e: any) {
      toast({ title: 'No se pudo actualizar el nombre', status: 'error' })
    } finally {
      setSavingName(false)
    }
  }, [project, name, desc, notes])

  // ---------- Project Documents List ----------
  type ProjectDoc = {
    id: string
    filename: string
    title: string | null
    updated_at: string
    created_at: string
    chat_id: string | null
    project_id: string | null
  }

  const { data: projectDocs = [], refetch: refetchDocs } = useQuery<ProjectDoc[]>({
    queryKey: ['project-docs', projectId],
    queryFn: async () => {
      const res = await fetch('/api/documents')
      if (!res.ok) throw new Error('Failed to load documents')
      const all = await res.json()
      return (all || []).filter((d: any) => d.project_id === projectId)
    },
  })

  const handleReindexDoc = useCallback(async (docId: string) => {
    try {
      const res = await fetch('/api/rag/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, force: true })
      })
      if (!res.ok) throw new Error(await res.text())
      toast({ title: 'Reindexación iniciada', status: 'success' })
    } catch (e: any) {
      toast({ title: 'No se pudo reindexar', status: 'error' })
    }
  }, [])

  const handleDeleteDoc = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      await refetchDocs()
      toast({ title: 'Documento eliminado', status: 'success' })
    } catch (e: any) {
      toast({ title: 'No se pudo eliminar', status: 'error' })
    }
  }, [refetchDocs])

  // Get chats from the chat store and filter for this project
  const { chats: allChats } = useChats()

  // Filter chats for this project
  const chats = allChats.filter((chat: Chat) => chat.project_id === projectId)

  const isAuthenticated = useMemo(() => !!user?.id, [user?.id])

  // Handle errors directly in onError callback
  const handleError = useCallback((error: Error) => {
    let errorMsg = "Something went wrong."
    try {
      const parsed = JSON.parse(error.message)
      errorMsg = parsed.error || errorMsg
    } catch {
      errorMsg = error.message || errorMsg
    }
    toast({
      title: errorMsg,
      status: "error",
    })
  }, [])

  const chatHelpers = useChat({
    id: `project-${projectId}-${currentChatId}`,
    onFinish: (message: any) => cacheAndAddMessage(convertToMessageAISDK(message)),
    onError: handleError,
  })
  const messages = (chatHelpers as any).messages as any[]
  const input = (chatHelpers as any).input as string
  const handleSubmit = (chatHelpers as any).handleSubmit as (e?: any, options?: any) => void
  const status = (chatHelpers as any).status as any
  const reload = (chatHelpers as any).reload as (options?: any) => void
  const stop = (chatHelpers as any).stop as () => void
  const setMessages = (chatHelpers as any).setMessages as (updater: any) => void
  const setInput = (chatHelpers as any).setInput as (value: string | ((prev: string) => string)) => void

  const { selectedModel, handleModelChange } = useModel({
    currentChat: null,
    user,
    updateChatModel: () => Promise.resolve(),
    chatId: null,
  })

  // Simplified ensureChatExists for authenticated project context
  const ensureChatExists = useCallback(
    async (userId: string) => {
      // If we already have a current chat ID, return it
      if (currentChatId) {
        return currentChatId
      }

      // Only create a new chat if we haven't started one yet
      if (messages.length === 0) {
        try {
          const newChat = await createNewChat(
            userId,
            input,
            selectedModel,
            true, // Always authenticated in this context
            SYSTEM_PROMPT_DEFAULT,
            projectId
          )

          if (!newChat) return null

          setCurrentChatId(newChat.id)
          // Redirect to the chat page as expected
          window.history.pushState(null, "", `/c/${newChat.id}`)
          return newChat.id
        } catch (err: unknown) {
          let errorMessage = "Something went wrong."
          try {
            const errorObj = err as { message?: string }
            if (errorObj.message) {
              const parsed = JSON.parse(errorObj.message)
              errorMessage = parsed.error || errorMessage
            }
          } catch {
            const errorObj = err as { message?: string }
            errorMessage = errorObj.message || errorMessage
          }
          toast({
            title: errorMessage,
            status: "error",
          })
          return null
        }
      }

      return currentChatId
    },
    [
      currentChatId,
      messages.length,
      createNewChat,
      input,
      selectedModel,
      projectId,
    ]
  )

  const { handleDelete, handleEdit } = useChatOperations({
    isAuthenticated: true, // Always authenticated in project context
    chatId: null,
    messages,
    selectedModel,
    systemPrompt: SYSTEM_PROMPT_DEFAULT,
    createNewChat,
    setHasDialogAuth: () => {}, // Not used in project context
    setMessages,
    setInput,
  })

  // Simple input change handler for project context (no draft saving needed)
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value)
    },
    [setInput]
  )

  const submit = useCallback(async () => {
    setIsSubmitting(true)

    if (!user?.id) {
      setIsSubmitting(false)
      return
    }

    // At this point user is guaranteed
    const uid = user.id as string

    const optimisticId = `optimistic-${Date.now().toString()}`
    const optimisticAttachments =
      files.length > 0 ? createOptimisticAttachments(files) : []
    const optimisticMessage = {
      id: optimisticId,
      content: input,
      role: "user" as const,
      createdAt: new Date(),
      experimental_attachments:
        optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
    }

  setMessages((prev: any[]) => [...prev, optimisticMessage])
    setInput("")

    const submittedFiles = [...files]
    setFiles([])

    try {
      const currentChatId = await ensureChatExists(uid)
      if (!currentChatId) {
  setMessages((prev: any[]) => prev.filter((msg: any) => msg.id !== optimisticId))
        cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
        return
      }

      if (input.length > MESSAGE_MAX_LENGTH) {
        toast({
          title: `The message you submitted was too long, please submit something shorter. (Max ${MESSAGE_MAX_LENGTH} characters)`,
          status: "error",
        })
  setMessages((prev: any[]) => prev.filter((msg: any) => msg.id !== optimisticId))
        cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
        return
      }

      let attachments: Attachment[] | null = []
      if (submittedFiles.length > 0) {
        attachments = await handleFileUploads(uid, currentChatId)
        if (attachments === null) {
          setMessages((prev: any[]) => prev.filter((m: any) => m.id !== optimisticId))
          cleanupOptimisticAttachments(
            optimisticMessage.experimental_attachments
          )
          return
        }
      }

      const options = {
        body: {
          chatId: currentChatId,
          userId: uid,
          model: selectedModel,
          isAuthenticated: true,
          systemPrompt: SYSTEM_PROMPT_DEFAULT,
          enableSearch,
        },
        experimental_attachments: attachments || undefined,
      }

      handleSubmit(undefined, options)
  setMessages((prev: any[]) => prev.filter((msg: any) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      cacheAndAddMessage(convertToMessageAISDK(optimisticMessage))

      // Bump existing chats to top (non-blocking, after submit)
      if (messages.length > 0) {
        bumpChat(currentChatId)
      }
    } catch {
  setMessages((prev: any[]) => prev.filter((msg: any) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      toast({ title: "Failed to send message", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    user,
    files,
    createOptimisticAttachments,
    input,
    setMessages,
    setInput,
    setFiles,
    cleanupOptimisticAttachments,
    ensureChatExists,
    handleFileUploads,
    selectedModel,
    handleSubmit,
    cacheAndAddMessage,
    messages.length,
    bumpChat,
    enableSearch,
  ])

  // Header CTA: hidden file input change handler (auto-upload)
  const onHeaderFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || [])
    if (picked.length === 0) return
    // stage files into uploader state
    picked.forEach((f) => handleFileUpload([f]))

    // auto-upload for fast flow
    if (!user?.id) return
    const uid = user.id as string
    const cid = await ensureChatExists(uid)
    if (!cid) return
    await handleFileUploads(uid, cid)
    await refetchDocs()
    toast({ title: 'Documentos añadidos', status: 'success' })
    // allow re-selecting same file
    e.currentTarget.value = ''
  }, [handleFileUpload, user?.id, ensureChatExists, handleFileUploads, refetchDocs])

  const handleReload = useCallback(async () => {
    if (!user?.id) {
      return
    }

    const options = {
      body: {
        chatId: null,
        userId: user.id,
        model: selectedModel,
        isAuthenticated: true,
        systemPrompt: SYSTEM_PROMPT_DEFAULT,
      },
    }

    reload(options)
  }, [user, selectedModel, reload])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Memoize the conversation props to prevent unnecessary rerenders
  const conversationProps = useMemo(
    () => ({
      messages,
      status,
      onDelete: handleDelete,
      onEdit: handleEdit,
      onReload: handleReload,
    }),
    [messages, status, handleDelete, handleEdit, handleReload]
  )

  // Memoize the chat input props
  const chatInputProps = useMemo(
    () => ({
      value: input,
  onSuggestionAction: () => {},
  onValueChangeAction: handleInputChange,
  onSendAction: submit,
      isSubmitting,
      files,
  onFileUploadAction: handleFileUpload,
  onFileRemoveAction: handleFileRemove,
      hasSuggestions: false,
  onSelectModelAction: handleModelChange,
      selectedModel,
      isUserAuthenticated: isAuthenticated,
  stopAction: stop,
      status,
  setEnableSearchAction: setEnableSearch,
      enableSearch,
    }),
    [
      input,
      handleInputChange,
      submit,
      isSubmitting,
      files,
      handleFileUpload,
      handleFileRemove,
      handleModelChange,
      selectedModel,
      isAuthenticated,
      stop,
      status,
  setEnableSearch,
      enableSearch,
    ]
  )

  // Always show onboarding when on project page, regardless of messages
  const showOnboarding = pathname === `/p/${projectId}`

  return (
    <div
      className={cn(
        "relative flex min-h-screen w-full flex-col items-center overflow-x-hidden bg-[--background] pt-[calc(var(--spacing-app-header)+28px)] md:pt-[calc(var(--spacing-app-header)+8px)]",
        showOnboarding && chats.length === 0
          ? "justify-center"
          : showOnboarding && chats.length > 0
            ? "justify-start md:pt-24"
            : "justify-end"
      )}
    >
      {/* Project Overview Panel */}
      <div className="w-full max-w-3xl p-4">
  <div className="radius-lg bg-[--background] border divider-subtle p-4 mb-4">
          {/* Project header inside the card */}
          <div className="mb-2 md:mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {editingName ? (
                  <>
                    <input
                      className="w-[min(60vw,420px)] radius-md bg-transparent border divider-subtle px-2 py-1 text-base md:text-lg"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveProjectName()
                        if (e.key === 'Escape') { setEditingName(false); setName(project?.name || name) }
                      }}
                      autoFocus
                    />
                    <button
                      className="inline-flex items-center justify-center rounded-md border divider-subtle p-1.5 text-xs hover:bg-white/5 disabled:opacity-50"
                      onClick={saveProjectName}
                      disabled={savingName}
                      aria-label="Guardar nombre"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-md border divider-subtle p-1.5 text-xs hover:bg-white/5"
                      onClick={() => { setEditingName(false); setName(project?.name || name) }}
                      aria-label="Cancelar"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <h1 className="truncate text-xl md:text-2xl font-semibold">{name || 'Proyecto'}</h1>
                    <button
                      className="inline-flex items-center justify-center rounded-md border divider-subtle p-1.5 text-xs hover:bg-white/5"
                      onClick={() => setEditingName(true)}
                      aria-label="Editar nombre"
                      title="Editar nombre"
                    >
                      <PencilSimple size={16} />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="inline-flex items-center gap-1 rounded-full border divider-subtle bg-[--surface-1] px-2 py-0.5">{projectDocs?.length || 0} docs</span>
                <span className="inline-flex items-center gap-1 rounded-full border divider-subtle bg-[--surface-1] px-2 py-0.5">Scope: proyecto</span>
              </div>
            </div>
            <div className="shrink-0 self-start md:self-auto">
              <button
                className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm shadow-sm hover:opacity-90 transition"
                onClick={() => {
                  const fileInput = document.querySelector<HTMLInputElement>(`#project-file-input-${projectId}`)
                  fileInput?.click()
                }}
              >
                Añadir documento
              </button>
              {/* Hidden input for CTA */}
              <input
                id={`project-file-input-${projectId}`}
                type="file"
                multiple
                className="sr-only hidden"
                onChange={onHeaderFileChange}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">Descripción</span>
              <textarea
                className="min-h-[80px] w-full radius-md bg-transparent border divider-subtle p-2"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Describe el objetivo, alcance y contexto de este proyecto"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">Notas</span>
              <textarea
                className="min-h-[80px] w-full radius-md bg-transparent border divider-subtle p-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pega resúmenes, decisiones, enlaces, etc."
              />
            </label>
            <div className="flex gap-2">
              <button
                className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-3 py-2 disabled:opacity-50 shadow-sm hover:opacity-90 transition"
                onClick={saveProjectMeta}
                disabled={savingMeta}
              >
                {savingMeta ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick add documents - reuse chat file upload hooks */}
  <div className="radius-lg bg-[--background] border divider-subtle p-4 mb-6">
          <h3 className="text-base font-medium mb-2">Añadir documentos al proyecto</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              className="rounded-md border divider-subtle px-3 py-2 text-sm hover:bg-white/5 transition"
              onClick={() => {
                const fileInput = document.querySelector<HTMLInputElement>(`#project-file-input-${projectId}`)
                fileInput?.click()
              }}
            >
              Elegir archivos
            </button>
            <button
              className="rounded-md bg-primary text-primary-foreground px-3 py-2 disabled:opacity-50 shadow-sm hover:opacity-90 transition"
              onClick={async () => {
                if (!user?.id) return
                const cid = await ensureChatExists(user.id)
                if (!cid) return
                await handleFileUploads(user.id, cid)
                toast({ title: 'Documentos añadidos', status: 'success' })
                await refetchDocs()
              }}
              disabled={files.length === 0}
            >
              Subir ahora
            </button>
          </div>
          {files.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">{files.length} archivos listos para subir</div>
          )}
        </div>

        {/* Documents list */}
  <div className="radius-lg bg-[--background] border divider-subtle p-4">
          <h3 className="text-base font-medium mb-3">Documentos del proyecto</h3>
          {projectDocs.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aún no hay documentos. Sube algunos arriba para alimentar el contexto del proyecto.</div>
          ) : (
            <ul className="divide-y">
              {projectDocs.map(doc => (
                <li key={doc.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{doc.title || doc.filename}</div>
                    <div className="text-xs text-muted-foreground">Actualizado {formatDate(doc.updated_at)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="rounded-md border divider-subtle px-2 py-1 text-sm hover:bg-white/5"
                      onClick={() => handleReindexDoc(doc.id)}
                    >
                      Reindexar
                    </button>
                    <button
                      className="rounded-md border divider-subtle px-2 py-1 text-sm text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDeleteDoc(doc.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <AnimatePresence initial={false} mode="popLayout">
        {showOnboarding ? (
          <motion.div
            key="onboarding"
            className="relative mx-auto max-w-[50rem] md:relative"
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
            <div className="mb-6 flex items-center justify-center gap-2">
              <ChatCircleIcon className="text-muted-foreground" size={24} />
              <h1 className="text-center text-3xl font-medium tracking-tight">
                {project?.name || ""}
              </h1>
            </div>
          </motion.div>
        ) : (
          <Conversation key="conversation" {...conversationProps} />
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl"
        )}
        layout="position"
        layoutId="chat-input-container"
        transition={{
          layout: {
            duration: messages.length === 1 ? 0.3 : 0,
          },
        }}
      >
  <ChatInput {...chatInputProps} hideModelSelector />
      </motion.div>

      {showOnboarding && chats.length > 0 ? (
        <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-20">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">
            Recent chats
          </h2>
          <div className="space-y-2">
            {chats.map((chat: Chat) => (
              <ProjectChatItem key={chat.id} chat={chat} formatDate={formatDate} />
            ))}
          </div>
        </div>
      ) : showOnboarding && chats.length === 0 ? (
        <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-20">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">
            No chats yet
          </h2>
        </div>
      ) : null}
    </div>
  )
}

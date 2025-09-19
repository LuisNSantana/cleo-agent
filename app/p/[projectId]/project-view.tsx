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
import { createClient } from "@/lib/supabase/client"
import { uploadFile, validateFile } from "@/lib/file-handling"
import type { Chat } from "@/lib/chat-store/types"

type Project = {
  id: string
  name: string
  user_id: string | null
  created_at: string
  description?: string | null
  notes?: string | null
  _auth_failed?: boolean
  _error?: boolean
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
  console.log(`[ProjectView] MOUNTED with projectId:`, projectId);
  if (typeof window !== 'undefined') {
    console.log(`[ProjectView] window.location.pathname:`, window.location.pathname);
  }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const { user } = useUser();
  const { createNewChat, bumpChat } = useChats();
  const { cacheAndAddMessage } = useMessages();
  const pathname = usePathname();
  console.log(`[ProjectView] User:`, user);
  console.log(`[ProjectView] Pathname:`, pathname);
  console.log(`[ProjectView] Prop projectId:`, projectId);
  
  const {
    files,
    setFiles,
    handleFileUploads,
    createOptimisticAttachments,
    cleanupOptimisticAttachments,
    handleFileUpload,
    handleFileRemove,
  } = useFileUpload()

  // Add an effect to track when pathname changes
  useEffect(() => {
    console.log(`[ProjectView] ==> PATHNAME CHANGE DETECTED <==`)
    console.log(`[ProjectView] Previous pathname: ${pathname}`)
    console.log(`[ProjectView] Expected project: ${projectId}`)
    console.log(`[ProjectView] URL pathname should be: /p/${projectId}`)
    
    if (!pathname.includes(`/p/${projectId}`)) {
      console.warn(`[ProjectView] ⚠️  PATHNAME MISMATCH! Expected /p/${projectId}, got ${pathname}`)
    } else {
      console.log(`[ProjectView] ✅ Pathname matches expected project route`)
    }
  }, [pathname, projectId])

  // Fetch project details
  const { data: project, refetch: refetchProject, isLoading: projectLoading, error: projectError } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      console.log(`[ProjectView] Fetching project ${projectId}`)
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch project")
      }
      const data = await response.json()
      
      console.log(`[ProjectView] Project data received:`, { 
        id: data.id, 
        name: data.name, 
        _auth_failed: data._auth_failed, 
        _error: data._error 
      })
      
      return data
    },
    enabled: !!projectId,
    retry: (failureCount, error) => {
      console.log(`[ProjectView] Query failed (attempt ${failureCount}):`, error)
      return failureCount < 3
    }
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
    if (project && !project._auth_failed && !project._error) {
      setName(project.name || "")
      setDesc(project.description || "")
      setNotes(project.notes || "")
    }
  }, [project?.id, project?._auth_failed, project?._error])

  // Refetch project when user becomes available
  useEffect(() => {
    if (user?.id && project?._auth_failed) {
      console.log(`[ProjectView] User now available, refetching project`)
      refetchProject()
    }
  }, [user?.id, project?._auth_failed, refetchProject])

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
    // Use a stable id to avoid resetting the hook between first and subsequent messages
    id: `project-${projectId}`,
    onFinish: (message: any) => cacheAndAddMessage(convertToMessageAISDK(message)),
    onError: handleError,
  })
  const messages = (chatHelpers as any).messages as any[]
  // In project context we manage a local input to avoid relying on chatHelpers.setInput (which may be undefined)
  const [localInput, setLocalInput] = useState<string>("")
  const handleSubmit = (chatHelpers as any).handleSubmit as (e?: any, options?: any) => void
  const status = (chatHelpers as any).status as any
  const reload = (chatHelpers as any).reload as (options?: any) => void
  const stop = (chatHelpers as any).stop as () => void
  const setMessages = (chatHelpers as any).setMessages as (updater: any) => void
  const setInputMaybe = (chatHelpers as any).setInput as
    | ((value: string | ((prev: string) => string)) => void)
    | undefined

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

      // Create a new chat if none exists yet (even if there are optimistic messages)
      try {
        const newChat = await createNewChat(
          userId,
          localInput,
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
    },
    [
      currentChatId,
      createNewChat,
      localInput,
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
    setInput: () => {},
  })

  // Simple input change handler for project context (no draft saving needed)
  const handleInputChange = useCallback(
    (value: string) => {
      setLocalInput(value)
      // Best-effort: if chatHelpers exposes setInput, keep it in sync
      if (typeof setInputMaybe === 'function') {
        try { setInputMaybe(value) } catch {}
      }
    },
    [setInputMaybe]
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
    const textToSend = localInput
    const optimisticAttachments =
      files.length > 0 ? createOptimisticAttachments(files) : []
    const optimisticMessage = {
      id: optimisticId,
      content: textToSend,
      role: "user" as const,
      createdAt: new Date(),
      experimental_attachments:
        optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
    }

  setMessages((prev: any[]) => [...prev, optimisticMessage])

    const submittedFiles = [...files]
    setFiles([])

    try {
      const ensuredChatId = await ensureChatExists(uid)
      if (!ensuredChatId) {
  setMessages((prev: any[]) => prev.filter((msg: any) => msg.id !== optimisticId))
        cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
        return
      }

      if (textToSend.length > MESSAGE_MAX_LENGTH) {
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
        attachments = await handleFileUploads(uid, ensuredChatId)
        if (attachments === null) {
          setMessages((prev: any[]) => prev.filter((m: any) => m.id !== optimisticId))
          cleanupOptimisticAttachments(
            optimisticMessage.experimental_attachments
          )
          return
        }
      }

      // Ensure the chat hook has the input text when it relies on internal state
      if (typeof setInputMaybe === 'function') {
        try { setInputMaybe(textToSend) } catch {}
      }

      const options = {
        body: {
          chatId: ensuredChatId,
          userId: uid,
          model: selectedModel,
          isAuthenticated: true,
          systemPrompt: SYSTEM_PROMPT_DEFAULT,
          enableSearch,
          // Explicitly pass the text for the first message to avoid race conditions
          text: textToSend,
        },
        experimental_attachments: attachments || undefined,
      }

      handleSubmit(undefined, options)
      // Clear inputs after submit has been dispatched
      setLocalInput("")
      if (typeof setInputMaybe === 'function') {
        try { setInputMaybe("") } catch {}
      }
  setMessages((prev: any[]) => prev.filter((msg: any) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      cacheAndAddMessage(convertToMessageAISDK(optimisticMessage))

      // Bump existing chats to top (non-blocking, after submit)
      if (messages.length > 0) {
        bumpChat(ensuredChatId)
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
    localInput,
    setMessages,
    setLocalInput,
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
  const [isUploadingDocs, setIsUploadingDocs] = useState(false)
  const [pendingProjectDocs, setPendingProjectDocs] = useState<
    { id: string; name: string; status: 'uploading' | 'processing' | 'error' }[]
  >([])

  const uploadProjectDocuments = useCallback(async (pickedFiles: File[]) => {
    if (!pickedFiles || pickedFiles.length === 0) return
    if (!user?.id) {
      toast({ title: 'Inicia sesión para subir documentos', status: 'error' })
      return
    }
    setIsUploadingDocs(true)
    try {
      const supabase = createClient()
      if (!supabase) {
        toast({ title: 'Subidas no disponibles en esta instalación', status: 'error' })
        return
      }

      for (const file of pickedFiles) {
        const validation = await validateFile(file)
        if (!validation.isValid) {
          toast({ title: 'Archivo no soportado', description: validation.error, status: 'error' })
          continue
        }

        // Add to pending list
        const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
        setPendingProjectDocs(prev => [...prev, { id: tempId, name: file.name, status: 'uploading' }])

        // 1) Subir a almacenamiento para obtener URL pública
        const publicUrl = await uploadFile(supabase as any, file)

        // Update status to processing (server-side content extraction)
        setPendingProjectDocs(prev => prev.map(p => p.id === tempId ? { ...p, status: 'processing' } : p))

        // 2) Procesar contenido (pdf/doc/txt) en el servidor
        let contentMd = ''
        try {
          const proc = await fetch('/api/process-attachment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: publicUrl, contentType: file.type || 'application/octet-stream', name: file.name })
          })
          if (proc.ok) {
            const data = await proc.json()
            contentMd = data?.content || ''
          }
        } catch {}

        // 3) Crear documento del proyecto (no del chat)
        const create = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, title: file.name, content_md: contentMd, project_id: projectId })
        })
        if (!create.ok) {
          const errTxt = await create.text().catch(() => '')
          // Mark as error but continue to next files
          setPendingProjectDocs(prev => prev.map(p => p.id === tempId ? { ...p, status: 'error' } : p))
          toast({ title: 'No se pudo crear el documento', description: errTxt || undefined, status: 'error' })
        } else {
          // Remove from pending once created
          setPendingProjectDocs(prev => prev.filter(p => p.id !== tempId))
        }
      }

      await refetchDocs()
      toast({ title: 'Documentos añadidos', status: 'success' })
    } catch (e) {
      toast({ title: 'No se pudo subir documentos', status: 'error' })
    } finally {
      setIsUploadingDocs(false)
      setFiles([])
    }
  }, [user?.id, projectId, setFiles, refetchDocs])

  const onHeaderFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    // capture element reference before async boundaries to avoid null currentTarget
    const inputEl = e.currentTarget
    const picked = Array.from(e.target.files || [])
    if (picked.length === 0) return
    // Auto-upload to project documents (do not attach to chat UI)
    await uploadProjectDocuments(picked)
    // allow re-selecting same file (guard against nullified currentTarget)
    if (inputEl) {
      inputEl.value = ''
    } else {
      const fallback = document.querySelector<HTMLInputElement>(`#project-file-input-${projectId}`)
      if (fallback) fallback.value = ''
    }
  }, [uploadProjectDocuments, projectId])

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
    value: localInput,
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
    localInput,
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
  
  // Debug logging for showOnboarding
  console.log(`[ProjectView] Debug - pathname: '${pathname}', expected: '/p/${projectId}', showOnboarding: ${showOnboarding}`);

  // Early return for critical loading/error states
  if (projectLoading && !project) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[--background] pt-[calc(var(--spacing-app-header)+28px)] md:pt-[calc(var(--spacing-app-header)+8px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando proyecto...</p>
        </div>
      </div>
    )
  }

  if (projectError && !project) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[--background] pt-[calc(var(--spacing-app-header)+28px)] md:pt-[calc(var(--spacing-app-header)+8px)]">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error cargando proyecto</p>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={() => refetchProject()}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

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
      data-project-view={projectId}
      data-pathname={pathname}
      data-testid={`project-view-${projectId}`}
    >
      {/* Debug info - remove after fixing */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed top-20 right-4 z-50 bg-red-500 text-white p-2 text-xs rounded">
          Project: {projectId}<br/>
          Path: {pathname}<br/>
          User: {user?.id || 'none'}<br/>
          Project loaded: {project ? 'yes' : 'no'}
        </div>
      )}
      
      {/* Always visible marker for debugging */}
      <div 
        className="fixed top-16 left-4 z-50 bg-blue-500 text-white px-2 py-1 text-xs rounded"
        style={{ fontSize: '10px' }}
      >
        ProjectView:{projectId}
      </div>
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
                    <h1 className="truncate text-xl md:text-2xl font-semibold">
                      {name || 'Proyecto'}
                      {project?._auth_failed && (
                        <span className="ml-2 text-xs text-yellow-500 font-normal">(Reautenticando...)</span>
                      )}
                      {project?._error && (
                        <span className="ml-2 text-xs text-red-400 font-normal">(Error de carga)</span>
                      )}
                    </h1>
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
                if (files.length === 0) return
                await uploadProjectDocuments(files)
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
          {projectDocs.length === 0 && pendingProjectDocs.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aún no hay documentos. Sube algunos arriba para alimentar el contexto del proyecto.</div>
          ) : (
            <ul className="divide-y">
              {pendingProjectDocs.map(p => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3 opacity-80">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border divider-subtle bg-[--surface-1] px-2 py-0.5">
                        {p.status === 'uploading' ? 'Subiendo…' : p.status === 'processing' ? 'Procesando…' : 'Error'}
                      </span>
                      {isUploadingDocs && <span className="text-muted-foreground">(en curso)</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="rounded-md border divider-subtle px-2 py-1 text-sm opacity-50 cursor-not-allowed"
                      disabled
                    >
                      Reindexar
                    </button>
                    <button
                      className="rounded-md border divider-subtle px-2 py-1 text-sm text-red-400 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
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

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
import { getProjectSystemPrompt, getEnhancedProjectSystemPrompt } from "@/lib/prompts/project"
// API_ROUTE_CHAT no longer used with useChat v5
import { useUser } from "@/lib/user-store/provider"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react"
import { ChatCircleIcon, PencilSimple, Check, X } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useMemo, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { uploadFile, validateFile } from "@/lib/file-handling"
import type { Chat } from "@/lib/chat-store/types"
import { getMessagesFromDb, getCachedMessages } from "@/lib/chat-store/messages/api"
import { ProjectChatSession } from "@/app/components/project/project-chat-session"

import { ProjectContextPanel } from "@/app/components/project/project-context-panel"
import { Settings, Maximize2, Minimize2, FileText, PanelRightOpen, PanelRightClose } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const { user } = useUser();
  const { createNewChat, bumpChat, deleteChat } = useChats();
  const { cacheAndAddMessage } = useMessages();
  const pathname = usePathname();
  const router = useRouter();
  
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
  const { data: project, refetch: refetchProject, isLoading: projectLoading, error: projectError } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch project")
      }
      const data = await response.json()
      return data
    },
    enabled: !!projectId,
    retry: (failureCount, error) => {
      return failureCount < 3
    }
  })

  // Local editable fields for project meta
  const [savingMeta, setSavingMeta] = useState(false)
  const [name, setName] = useState<string>("")
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)

  // Hydrate local state from fetched project (safe effect)
  useEffect(() => {
    if (project && !project._auth_failed && !project._error) {
      setName(project.name || "")
    }
  }, [project?.id, project?._auth_failed, project?._error])

  // Refetch project when user becomes available
  useEffect(() => {
    if (user?.id && project?._auth_failed) {
      console.log(`[ProjectView] User now available, refetching project`)
      refetchProject()
    }
  }, [user?.id, project?._auth_failed, refetchProject])

  const saveProjectName = useCallback(async () => {
    if (!project) return
    try {
      setSavingName(true)
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: project.description, notes: project.notes }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast({ title: 'Nombre actualizado', status: 'success' })
      setEditingName(false)
    } catch (e: any) {
      toast({ title: 'No se pudo actualizar el nombre', status: 'error' })
    } finally {
      setSavingName(false)
    }
  }, [project, name])

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
  const chats = useMemo(() => 
    allChats
      .filter((chat: Chat) => chat.project_id === projectId)
      .sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime()
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime()
        return dateB - dateA
      }), 
    [allChats, projectId]
  )

  // Auto-select latest chat on load if none selected
  useEffect(() => {
    if (!currentChatId && chats.length > 0) {
      // Find most recent
      const latest = chats[0]
      console.log(`[ProjectView] Auto-selecting latest chat: ${latest.id}`)
      setCurrentChatId(latest.id)
    }
  }, [chats, currentChatId])

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

  // ... inside ProjectView
  // Handle "New Chat" Action
  const handleNewChat = useCallback(async () => {
    if (!user?.id) return
    try {
      const newChat = await createNewChat(
        user.id,
        "New Project Chat", // Initial title
        'grok-4-fast-reasoning',
        true,
        SYSTEM_PROMPT_DEFAULT,
        projectId
      )
      if (newChat) {
        setCurrentChatId(newChat.id)
      }
    } catch (e) {
      console.error("Failed to create new chat", e)
      toast({ title: "Failed to create chat", status: "error" })
    }
  }, [user?.id, createNewChat, projectId])


  












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

  const handleDeleteChat = useCallback(async (chatIdToDelete: string) => {
    if (!user?.id) return
    
    const isCurrent = currentChatId === chatIdToDelete
    
    try {
      await deleteChat(chatIdToDelete)
      toast({ title: "Chat eliminado", status: "success" })
      
      if (isCurrent) {
        setCurrentChatId(null)
      }
    } catch (e) {
      console.error("Failed to delete chat", e)
      toast({ title: "Error al eliminar chat", status: "error" })
    }
  }, [deleteChat, currentChatId, user?.id])

  // Only show onboarding if no chat is selected
  const showOnboarding = !currentChatId

  // Update saveProjectMeta to accept arguments for auto-save
  const saveProjectMeta = useCallback(async (newDescription?: string, newNotes?: string) => {
    if (!project) return
    try {
      setSavingMeta(true)
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: project.name, 
          description: newDescription !== undefined ? newDescription : project.description, 
          notes: newNotes !== undefined ? newNotes : project.notes 
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      // Refetch to update local state
      refetchProject()
    } catch (e: any) {
      toast({ title: 'No se pudo actualizar el proyecto', status: 'error' })
      throw e
    } finally {
      setSavingMeta(false)
    }
  }, [project, refetchProject])

  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)

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

  // Calculate main content width based on panel state
  // On mobile, panels are stacked or toggled
  
  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-[--background] pt-[calc(var(--spacing-app-header))]"
      data-project-view={projectId}
    >
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0 h-full relative">
        {/* Project Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
             {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    className="w-[200px] rounded-md bg-muted px-2 py-1 text-base"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveProjectName()
                      if (e.key === 'Escape') { setEditingName(false); setName(project?.name || name) }
                    }}
                    autoFocus
                  />
                  <button onClick={saveProjectName} className="p-1 hover:bg-muted rounded"><Check size={16} /></button>
                  <button onClick={() => { setEditingName(false); setName(project?.name || name) }} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                   <h1 className="text-lg font-medium truncate">
                    {project?.name}
                  </h1>
                  <button 
                    onClick={() => setEditingName(true)} 
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded text-muted-foreground"
                    title="Edit Name"
                  >
                    <PencilSimple size={14} />
                  </button>
                </div>
              )}
              
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {projectDocs.length} docs
                </span>
              </div>
          </div>
          
          
          {/* Mobile toggle moved to absolute position for Sheet trigger */}
        </div>

        {/* Chat Conversation Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-hidden w-full">
            <AnimatePresence initial={false} mode="popLayout">
              {showOnboarding ? (
                <motion.div
                  key="onboarding"
                  className="h-full flex flex-col items-center justify-center p-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="max-w-md space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ChatCircleIcon className="text-primary" size={32} />
                    </div>
                    <h2 className="text-2xl font-semibold">Welcome to {project?.name}</h2>
                    <p className="text-muted-foreground">
                      This is your dedicated workspace. Upload documents, take notes, and chat with AI about your project.
                    </p>
                    
                    {/* Quick Start Actions */}
                    <div className="grid grid-cols-2 gap-3 mt-8">
                       <button 
                        onClick={() => document.querySelector<HTMLInputElement>(`#project-file-input-${projectId}`)?.click()}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:bg-muted/50 transition-colors"
                      >
                         <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                           <FileText size={20} />
                         </div>
                         <span className="text-sm font-medium">Add Documents</span>
                       </button>
                       <button 
                        onClick={handleNewChat}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:bg-muted/50 transition-colors"
                      >
                         <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                           <ChatCircleIcon size={20} />
                         </div>
                         <span className="text-sm font-medium">Start Chatting</span>
                       </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <ProjectChatSession 
                  key={currentChatId} // Crucial: Re-mounts session on chat switch
                  chatId={currentChatId!}
                  projectId={projectId}
                  projectName={project?.name || "Project"}
                  projectDescription={project?.description || undefined}
                  projectNotes={project?.notes || undefined}
                  projectDocs={projectDocs}
                  className="flex-1 h-full"
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Desktop Context Panel (Hidden on Mobile) */}
      <div className="hidden md:block h-full shrink-0 border-l">
        <ProjectContextPanel 
          project={project!}
          documents={projectDocs}
          chats={chats}
          selectedChatId={currentChatId}
          onSelectChat={(id) => setCurrentChatId(id)}
          onNewChat={handleNewChat}
          pendingDocuments={pendingProjectDocs}
          onUpload={uploadProjectDocuments}
          onReindex={handleReindexDoc}
          onDelete={handleDeleteDoc}
          onDeleteChat={handleDeleteChat}
          onSaveMeta={saveProjectMeta}
          isCollapsed={isRightPanelCollapsed}
          onToggleCollapse={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
          className="h-full border-none"
        />
      </div>

      {/* Mobile Context Panel (Sheet) */}
      <Sheet>
        <SheetTrigger asChild>
          <button 
           className="md:hidden absolute top-3 right-4 z-20 p-2 hover:bg-muted rounded-md bg-background/80 backdrop-blur-sm border shadow-sm"
          >
            <PanelRightOpen size={18} />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="p-0 w-[85%] sm:w-[400px]">
           <ProjectContextPanel 
            project={project!}
            documents={projectDocs}
            chats={chats}
            selectedChatId={currentChatId}
            onSelectChat={(id) => setCurrentChatId(id)}
            onNewChat={handleNewChat}
            pendingDocuments={pendingProjectDocs}
            onUpload={uploadProjectDocuments}
            onReindex={handleReindexDoc}
            onDelete={handleDeleteDoc}
            onDeleteChat={handleDeleteChat}
            onSaveMeta={saveProjectMeta}
            isCollapsed={false} // Always expanded in sheet
            className="h-full border-none w-full"
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

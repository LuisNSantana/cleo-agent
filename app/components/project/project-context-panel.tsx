"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronLeft, StickyNote, FileText, CheckCircle2, MessageSquare, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
// Import sub-components
import { DocumentDropzone } from "./document-dropzone"
import { CompactDocumentList } from "./compact-document-list"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { Chat } from "@/lib/chat-store/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Define types locally if not exported elsewhere
interface Project {
  id: string
  name: string
  description?: string | null
  notes?: string | null
}

interface ProjectDoc {
  id: string
  filename: string
  title: string | null
  updated_at: string
  created_at: string
}

interface ProjectContextPanelProps {
  project: Project
  documents: ProjectDoc[]
  chats: Chat[]
  selectedChatId: string | null
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  pendingDocuments?: any[]
  onUpload: (files: File[]) => Promise<void>
  onReindex: (id: string) => void
  onDelete: (id: string) => void
  onDeleteChat?: (id: string) => void
  onSaveMeta: (description: string, notes: string) => Promise<void>
  className?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function ProjectContextPanel({
  project,
  documents,
  chats = [],
  selectedChatId,
  onSelectChat,
  onNewChat,
  pendingDocuments = [],
  onUpload,
  onReindex,
  onDelete,
  onDeleteChat,
  onSaveMeta,
  className,
  isCollapsed = false,
  onToggleCollapse
}: ProjectContextPanelProps) {
  // Local state for auto-save forms
  const [description, setDescription] = useState(project.description || "")
  const [notes, setNotes] = useState(project.notes || "")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'docs' | 'notes' | 'chats'>('chats')
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)

  // ... (auto-save effect unchanged)

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric"
    })
  }

  if (isCollapsed) {
    return (
      <div className={cn("flex flex-col border-l bg-muted/10 w-[50px] items-center py-4 gap-4", className)}>
        <button 
          onClick={onToggleCollapse}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col gap-4 mt-2">
           <button 
            onClick={() => { onToggleCollapse?.(); setActiveTab('chats') }}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground relative"
            title="Chats"
          >
            <MessageSquare size={20} />
          </button>
           <button 
            onClick={() => { onToggleCollapse?.(); setActiveTab('docs') }}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground relative"
            title="Documents"
          >
            <FileText size={20} />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {documents.length}
            </span>
          </button>
          <button 
            onClick={() => { onToggleCollapse?.(); setActiveTab('notes') }}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground"
            title="Notes"
          >
            <StickyNote size={20} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col border-l bg-muted/10 h-full w-[350px] transition-all duration-300", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <h3 className="font-semibold text-sm">Project Hub</h3>
        <div className="flex items-center gap-1">
          {isSaving ? (
            <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
          ) : lastSaved ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 size={12} className="text-green-500" />
              Saved
            </span>
          ) : null}
          <button 
            onClick={onToggleCollapse}
            className="ml-2 p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Description Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Objective
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            className="w-full min-h-[60px] bg-transparent border rounded-md p-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none resize-none transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Tabs for content */}
        <div className="space-y-4">
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
             <button
              onClick={() => setActiveTab('chats')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                activeTab === 'chats' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare size={14} />
              Chats
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                activeTab === 'docs' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText size={14} />
              Docs
              <span className="ml-1 opacity-70">({documents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                activeTab === 'notes' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <StickyNote size={14} />
              Notes
            </button>
          </div>

          {activeTab === 'chats' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
               <button
                  onClick={onNewChat}
                  className="w-full flex items-center gap-2 p-2 rounded-md border border-dashed hover:bg-muted/50 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <MessageSquare size={16} />
                  <span>New Chat</span>
                </button>
               {chats.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground text-sm italic">
                   No chats yet. Start one!
                 </div>
               ) : (
                 <div className="space-y-1">
                   {chats.map(chat => (
                     <button
                       key={chat.id}
                       onClick={() => onSelectChat(chat.id)}
                       className={cn(
                         "group w-full text-left p-2 rounded-md text-sm transition-colors flex items-start gap-2 border relative",
                         selectedChatId === chat.id 
                           ? "bg-primary/5 border-primary/20 text-foreground ring-1 ring-primary/20" 
                           : "hover:bg-muted/50 border-transparent hover:border-border text-muted-foreground hover:text-foreground"
                       )}
                     >
                       <div className="flex-1 min-w-0">
                         <span className="font-medium truncate block w-full">
                           {chat.title || "Untitled Chat"}
                         </span>
                         <span className="text-[10px] opacity-70">
                           {formatDate((chat.updated_at || chat.created_at || new Date()).toString())}
                         </span>
                       </div>
                       {onDeleteChat && (
                         <div 
                           role="button"
                           onClick={(e) => {
                             e.stopPropagation()
                             setChatToDelete(chat.id)
                           }}
                           className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-all"
                           title="Eliminar chat"
                         >
                           <Trash2 size={12} />
                         </div>
                       )}
                     </button>
                   ))}
                 </div>
               )}
            </div>
          )}

          {activeTab === 'docs' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
              <DocumentDropzone 
                onUpload={onUpload} 
                isUploading={pendingDocuments.length > 0} 
              />
              <CompactDocumentList 
                documents={documents}
                pendingDocuments={pendingDocuments}
                onReindex={onReindex}
                onDelete={onDelete}
              />
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
               <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key facts, decisions, links, etc..."
                className="w-full min-h-[300px] bg-transparent border-0 p-0 text-sm focus:ring-0 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>


      <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el historial de esta conversación permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (chatToDelete && onDeleteChat) {
                  onDeleteChat(chatToDelete)
                }
                setChatToDelete(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

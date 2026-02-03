"use client"

import { FileText, Trash, RefreshCw, File } from "lucide-react"
import { cn } from "@/lib/utils"

// Reuse types from project-view or define shared types
interface ProjectDoc {
  id: string
  filename: string
  title: string | null
  updated_at: string
  created_at: string
  status?: 'uploading' | 'processing' | 'ready' | 'error'
}

interface CompactDocumentListProps {
  documents: ProjectDoc[]
  pendingDocuments?: any[]
  onReindex: (id: string) => void
  onDelete: (id: string) => void
  className?: string
}

export function CompactDocumentList({
  documents,
  pendingDocuments = [],
  onReindex,
  onDelete,
  className
}: CompactDocumentListProps) {
  
  const getFileIcon = (filename: string) => {
    // Simple extension check could go here
    return <FileText size={16} className="text-blue-500" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    })
  }

  if (documents.length === 0 && pendingDocuments.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground text-center py-4 italic", className)}>
        No documents yet
      </div>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Pending Documents */}
      {pendingDocuments.map(p => (
        <div key={p.id} className="group flex items-center justify-between rounded-md border border-dashed px-2 py-2 text-sm opacity-80">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 animate-pulse text-muted-foreground">
              <File size={16} />
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="truncate font-medium">{p.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {p.status === 'uploading' ? 'Uploading...' : 'Processing...'}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Ready Documents */}
      {documents.map(doc => (
        <div 
          key={doc.id} 
          className="group flex items-center justify-between rounded-md hover:bg-muted/50 px-2 py-2 text-sm transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0">
              {getFileIcon(doc.filename)}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="truncate font-medium" title={doc.title || doc.filename}>
                {doc.title || doc.filename}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatDate(doc.updated_at)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onReindex(doc.id)}
              className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground"
              title="Reindex document"
            >
              <RefreshCw size={12} />
            </button>
            <button
              onClick={() => onDelete(doc.id)}
              className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-red-500"
              title="Delete document"
            >
              <Trash size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

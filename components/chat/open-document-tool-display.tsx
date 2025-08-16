"use client"

import { Button } from '@/components/ui/button'
import { useCanvasEditorStore } from '@/lib/canvas-editor/store'
import { ExternalLinkIcon, FileTextIcon } from 'lucide-react'

interface OpenDocumentToolResult {
  success: boolean
  message?: string
  documentContent?: string
  document?: {
    id: string
    title: string
    filename: string
    contentPreview: string
    lastModified: string
    wordCount: number
    fullContent?: string
    htmlContent?: string
  }
  actionType?: 'edit' | 'collaborate' | 'review' | 'expand'
  error?: string
}

interface OpenDocumentToolDisplayProps {
  result: OpenDocumentToolResult
}

/**
 * Componente para mostrar el resultado de la herramienta openDocument
 */
export function OpenDocumentToolDisplay({ result }: OpenDocumentToolDisplayProps) {
  const open = useCanvasEditorStore(s => s.open)

  if (!result.success) {
    return (
      <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/50">
        <div className="flex items-start gap-3">
          <FileTextIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 dark:text-red-200 font-medium">
              Unable to open document
            </p>
            <p className="text-red-700 dark:text-red-300 text-sm mt-1">
              {result.error || 'Document not found or access denied'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { document } = result
  
  if (!document) {
    return null
  }

  const handleOpenDocument = () => {
    const content = document.fullContent || document.contentPreview || ''
    const htmlContent = document.htmlContent
    
    open({ 
      text: content, 
      mode: htmlContent ? 'rich' : 'markdown',
      html: htmlContent,
      documentId: document.id,
      filename: document.filename
    })
  }

  const actionTypeText = {
    'edit': 'editing',
    'collaborate': 'collaborative work',
    'review': 'reviewing',
    'expand': 'expanding'
  }[result.actionType || 'edit']

  return (
    <div className="space-y-3">
      {/* Mensaje de confirmación */}
      {result.message && (
        <div className="p-3 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/50">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            {result.message}
          </p>
        </div>
      )}

      {/* Tarjeta del documento */}
      <div className="border border-border rounded-lg p-4 bg-background">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <FileTextIcon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground truncate">
                {document.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {document.filename} • {document.wordCount} words
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last modified: {new Date(document.lastModified).toLocaleDateString()}
              </p>
              
              {/* Vista previa del contenido */}
              <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                <p className="line-clamp-3">
                  {document.contentPreview}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              onClick={handleOpenDocument}
              size="sm"
              className="flex items-center gap-2"
            >
              <ExternalLinkIcon className="h-4 w-4" />
              Open in Canvas Editor
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Ready for {actionTypeText}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

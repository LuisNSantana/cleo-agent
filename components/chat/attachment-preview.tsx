/**
 * Attachment Preview Component
 * 
 * Provides preview functionality for file attachments with Canvas Editor integration
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCanvasEditorStore } from '@/lib/canvas-editor/store'
import { FileText, File, Eye, Edit3, Download } from 'lucide-react'
import type { Attachment } from '@/lib/file-handling'

interface AttachmentPreviewProps {
  attachment: Attachment
  processedContent?: string // Content extracted from PDF/text files
}

export function AttachmentPreview({ attachment, processedContent }: AttachmentPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { open: openCanvas } = useCanvasEditorStore()

  const handleOpenInCanvas = () => {
    if (processedContent) {
      openCanvas({
        text: processedContent,
        mode: 'markdown',
        filename: attachment.name
      })
    }
  }

  const handlePreview = () => {
    setIsExpanded(!isExpanded)
  }

  const getFileIcon = () => {
    if (attachment.contentType?.includes('pdf')) {
      return <File className="size-6 text-red-500" />
    } else if (attachment.contentType?.startsWith('text')) {
      return <FileText className="size-6 text-blue-500" />
    } else {
      return <File className="size-6 text-gray-500" />
    }
  }

  const canPreview = processedContent && (
    attachment.contentType?.includes('pdf') || 
    attachment.contentType?.startsWith('text')
  )

  const canEditInCanvas = canPreview

  return (
    <div className="mb-3 rounded-md border bg-background">
      {/* File Header */}
      <div className="flex items-center gap-2 p-3">
        <div className="flex-shrink-0">
          {getFileIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-sm">{attachment.name}</div>
          <div className="text-muted-foreground text-xs">
            {attachment.contentType?.split('/')[1]?.toUpperCase() || 'FILE'}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-1">
          {canPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreview}
              className="h-8 w-8 p-0"
              title="Preview content"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          
          {canEditInCanvas && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenInCanvas}
              className="h-8 w-8 p-0"
              title="Open in Canvas Editor"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
          
          {attachment.url && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 w-8 p-0"
              title="Download file"
            >
              <a href={attachment.url} download={attachment.name}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Content Preview */}
      {isExpanded && processedContent && (
        <div className="border-t">
          <div className="p-3">
            <div className="text-xs text-muted-foreground mb-2">
              Content Preview:
            </div>
            <div className="bg-muted rounded-md p-3 text-sm max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {processedContent.slice(0, 1000)}
                {processedContent.length > 1000 && '\n\n... [Content truncated, open in Canvas Editor to see full content]'}
              </pre>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={handleOpenInCanvas}
                className="h-7 text-xs"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Open in Canvas Editor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
"use client"

import { useState } from 'react'
import { useCanvasEditorStore } from '@/lib/canvas-editor/store'
import { FileText, Download, Edit3, Clock } from 'lucide-react'
import { markdownToHtml, wrapPrintHtml } from '@/lib/markdown-to-html'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const Markdown = dynamic(() => import("@/components/prompt-kit/markdown").then(m => m.Markdown))

interface GeneratedFileProps {
  filename: string
  content: string
  description?: string
  fileType?: 'md' | 'txt' | 'doc'
  wordCount?: number
  timestamp?: string
}

export function GeneratedFile({ 
  filename, 
  content, 
  description, 
  fileType = 'md',
  wordCount,
  timestamp 
}: GeneratedFileProps) {
  const { open: openEditor } = useCanvasEditorStore()
  const [isHovered, setIsHovered] = useState(false)

  const handleOpenInEditor = () => {
    openEditor({
      text: content,
      mode: 'rich',
      filename: filename
    })
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = () => {
    // Convertir Markdown básico a HTML e imprimir (usuario elige Guardar como PDF)
    const body = markdownToHtml(content)
    const html = wrapPrintHtml(filename.replace(/\.[^.]+$/, ''), body)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  const getFileIcon = () => {
    switch (fileType) {
      case 'md':
        return '📄'
      case 'txt':
        return '📝'
      case 'doc':
        return '📋'
      default:
        return '📄'
    }
  }

  const formatFileSize = (content: string) => {
    const bytes = new Blob([content]).size
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div 
      className={cn(
        "group relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50",
        "border border-blue-200 dark:border-blue-800 rounded-xl p-4 transition-all duration-300",
        "hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:border-blue-700",
        isHovered && "scale-[1.02]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl">{getFileIcon()}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm mb-1 truncate">
            {filename}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleOpenInEditor}
            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            title="Abrir en Canvas Editor"
          >
            <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            title="Descargar archivo"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      </div>

      {/* File Info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          <span>{formatFileSize(content)}</span>
        </div>
        {wordCount && (
          <div className="flex items-center gap-1">
            <span>📊</span>
            <span>{wordCount.toLocaleString()} palabras</span>
          </div>
        )}
        {timestamp && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{timestamp}</span>
          </div>
        )}
      </div>

      {/* Preview (Markdown) */}
      <div className="bg-background/70 rounded-lg p-3 mb-3 border border-border/50">
        <div className="text-xs text-muted-foreground mb-2">Vista previa:</div>
        <div className="relative max-h-48 overflow-hidden rounded-md">
          <Markdown className="prose prose-sm dark:prose-invert max-w-none">
            {content}
          </Markdown>
          {/* Fade gradient to indicate more content */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleOpenInEditor}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          Editar en Canvas
        </button>
        <button
          onClick={handleDownload}
          className="bg-background hover:bg-muted text-foreground text-sm font-medium py-2 px-3 rounded-lg border border-border transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Descargar
        </button>
        <button
          onClick={handleExportPdf}
          className="bg-background hover:bg-muted text-foreground text-sm font-medium py-2 px-3 rounded-lg border border-border transition-colors"
        >
          Exportar PDF
        </button>
      </div>

      {/* Hover effect overlay */}
      <div className={cn(
        "absolute inset-0 bg-blue-500/5 rounded-xl pointer-events-none transition-opacity duration-300",
        isHovered ? "opacity-100" : "opacity-0"
      )} />
    </div>
  )
}

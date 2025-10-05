"use client"

import { ReactNode, useEffect, useRef } from 'react'
import { useFileDetection } from '@/hooks/use-file-detection'
import { GeneratedFile } from './generated-file'
import { Loader2 } from 'lucide-react'
import { MessageContent } from '@/components/prompt-kit/message'
import { cn } from '@/lib/utils'
import { useCanvasEditorStore } from '@/lib/canvas-editor/store'

interface SmartMessageProps {
  children?: ReactNode
  content: string
  userMessage?: string
  enableFileDetection?: boolean
  isStreaming?: boolean
}

/**
 * Componente que procesa automáticamente mensajes para detectar y crear archivos
 */
export function SmartMessage({ 
  children, 
  content, 
  userMessage, 
  enableFileDetection = true,
  isStreaming = false,
}: SmartMessageProps) {
  const { cleanResponse, detectedFiles, isProcessing, hasFiles } = useFileDetection({
    response: content,
    userMessage,
    enabled: enableFileDetection,
    isStreaming,
  })
  const open = useCanvasEditorStore(s => s.open)
  const openedRef = useRef(false)

  // Auto-abrir el primer archivo detectado en el Canvas para revisión
  useEffect(() => {
    if (!isStreaming && !isProcessing && hasFiles && detectedFiles.length > 0 && !openedRef.current) {
      const first = detectedFiles[0]
      open({ text: first.content, mode: 'rich', filename: first.filename })
      openedRef.current = true
    }
  }, [isStreaming, isProcessing, hasFiles, detectedFiles, open])

  if (isProcessing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Procesando respuesta...
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* OPTIMIZED: ChatGPT/Claude style - NO bubble for assistant, plain text */}
      <MessageContent
        className={cn(
          // Base: Plain text, no bubble (modern chat UI best practice)
          "prose prose-lg dark:prose-invert w-full max-w-none",
          // Clean typography without background
          "text-gray-900 dark:text-zinc-100",
          // Better line height for readability
          "leading-relaxed tracking-[-0.011em]",
          // Typography refinements
          "prose-h1:scroll-m-20 prose-h1:text-2xl prose-h1:font-semibold",
          "prose-h2:mt-8 prose-h2:scroll-m-20 prose-h2:text-xl prose-h2:mb-3 prose-h2:font-medium",
          "prose-h3:scroll-m-20 prose-h3:text-base prose-h3:font-medium",
          "prose-h4:scroll-m-20 prose-h5:scroll-m-20 prose-h6:scroll-m-20",
          "prose-strong:font-medium",
          "prose-p:my-3 prose-li:my-1.5",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md",
          "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
          "prose-table:block prose-table:overflow-y-auto",
          // Links
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          // Lists
          "prose-ul:my-4 prose-ol:my-4",
          // Blockquotes
          "prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4"
        )}
        markdown={true}
        variant="plain"
      >
        {cleanResponse}
      </MessageContent>

      {/* Archivos detectados - mostrar como tarjetas adicionales */}
      {hasFiles && (
        <div className="grid gap-4">
          {detectedFiles.map((file, index) => (
            <GeneratedFile
              key={index}
              filename={file.filename}
              content={file.content}
              description={file.description}
              fileType={file.fileType}
              wordCount={file.wordCount}
              timestamp={new Date().toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Componente wrapper para mensajes del asistente con detección automática
 */
interface AssistantMessageWithFilesProps {
  content: string
  userMessage?: string
  children?: ReactNode
  isStreaming?: boolean
}

export function AssistantMessageWithFiles({ 
  content, 
  userMessage, 
  children,
  isStreaming = false,
}: AssistantMessageWithFilesProps) {
  return (
    <SmartMessage 
      content={content} 
      userMessage={userMessage}
      enableFileDetection={true}
      isStreaming={isStreaming}
    >
      {children}
    </SmartMessage>
  )
}

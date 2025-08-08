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
      {/* Contenido original - SIEMPRE mostrar */}
      <MessageContent
        className={cn(
          "prose dark:prose-invert relative min-w-full bg-transparent p-0",
          "prose-h1:scroll-m-20 prose-h1:text-2xl prose-h1:font-semibold prose-h2:mt-8 prose-h2:scroll-m-20 prose-h2:text-xl prose-h2:mb-3 prose-h2:font-medium prose-h3:scroll-m-20 prose-h3:text-base prose-h3:font-medium prose-h4:scroll-m-20 prose-h5:scroll-m-20 prose-h6:scroll-m-20 prose-strong:font-medium prose-table:block prose-table:overflow-y-auto"
        )}
        markdown={true}
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

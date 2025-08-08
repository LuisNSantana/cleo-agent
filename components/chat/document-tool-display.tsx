"use client"

import { GeneratedFile } from './generated-file'
import { type DocumentToolResult } from '@/lib/tools/create-document'

interface DocumentToolDisplayProps {
  result: DocumentToolResult
}

/**
 * Componente para mostrar el resultado de la tool createDocument
 */
export function DocumentToolDisplay({ result }: DocumentToolDisplayProps) {
  if (!result.success) {
    return (
      <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/50">
        <p className="text-red-800 dark:text-red-200">
          ❌ Error al crear el documento: {result.message}
        </p>
      </div>
    )
  }

  const { document } = result
  
  return (
    <div className="space-y-3">
      {/* Mensaje de confirmación */}
      <div className="p-3 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-950/50">
        <p className="text-green-800 dark:text-green-200 text-sm">
          {result.message}
        </p>
      </div>

      {/* Archivo generado */}
      <GeneratedFile
        filename={document.filename}
        content={document.content}
        description={document.description}
        fileType="md"
        wordCount={document.wordCount}
        timestamp={new Date(document.timestamp).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      />
    </div>
  )
}

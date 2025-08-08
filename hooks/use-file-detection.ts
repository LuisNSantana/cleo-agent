"use client"

import { useEffect, useState } from 'react'
import { processResponseForFiles, type FileCandidate } from '@/lib/file-detection'

interface UseFileDetectionProps {
  response: string
  userMessage?: string
  enabled?: boolean
}

interface UseFileDetectionReturn {
  cleanResponse: string
  detectedFiles: FileCandidate[]
  isProcessing: boolean
  hasFiles: boolean
}

/**
 * Hook para detectar automáticamente contenido que debería convertirse en archivos
 */
export function useFileDetection({ 
  response, 
  userMessage, 
  enabled = true 
}: UseFileDetectionProps): UseFileDetectionReturn {
  const [cleanResponse, setCleanResponse] = useState(response)
  const [detectedFiles, setDetectedFiles] = useState<FileCandidate[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!enabled || !response.trim()) {
      setCleanResponse(response)
      setDetectedFiles([])
      return
    }

    setIsProcessing(true)

    // Simular procesamiento asíncrono para no bloquear la UI
    const processFiles = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100)) // Pequeño delay para suavidad
        
        const result = processResponseForFiles(response, userMessage)
        
        setCleanResponse(result.cleanResponse)
        setDetectedFiles(result.files)
      } catch (error) {
        console.error('Error processing files:', error)
        setCleanResponse(response)
        setDetectedFiles([])
      } finally {
        setIsProcessing(false)
      }
    }

    processFiles()
  }, [response, userMessage, enabled])

  return {
    cleanResponse,
    detectedFiles,
    isProcessing,
    hasFiles: detectedFiles.length > 0
  }
}

// (Eliminado hook useAutoFileCreation por no usarse actualmente)

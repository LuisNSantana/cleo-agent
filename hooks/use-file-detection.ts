"use client"

import { useEffect, useRef, useState } from 'react'
import { processResponseForFiles, type FileCandidate } from '@/lib/file-detection'

interface UseFileDetectionProps {
  response: string
  userMessage?: string
  enabled?: boolean
  isStreaming?: boolean
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
  enabled = true,
  isStreaming = false,
}: UseFileDetectionProps): UseFileDetectionReturn {
  const [cleanResponse, setCleanResponse] = useState(response)
  const [detectedFiles, setDetectedFiles] = useState<FileCandidate[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const spinnerTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || !response.trim()) {
      setCleanResponse(response)
      setDetectedFiles([])
      return
    }

    // Debounce the spinner to avoid flicker on fast parses
    if (spinnerTimerRef.current) window.clearTimeout(spinnerTimerRef.current)
    spinnerTimerRef.current = window.setTimeout(() => setIsProcessing(true), 250)

    // Simular procesamiento asíncrono para no bloquear la UI
    const processFiles = async () => {
      try {
        // Pequeño delay para suavidad
        await new Promise(resolve => setTimeout(resolve, 80))

  // Avoid heuristics while streaming to prevent early duplication/partial captures
  const result = processResponseForFiles(response, userMessage, { skipHeuristics: isStreaming })
        
        setCleanResponse(result.cleanResponse)
        setDetectedFiles(result.files)
      } catch (error) {
        console.error('Error processing files:', error)
        setCleanResponse(response)
        setDetectedFiles([])
      } finally {
        if (spinnerTimerRef.current) {
          window.clearTimeout(spinnerTimerRef.current)
          spinnerTimerRef.current = null
        }
        setIsProcessing(false)
      }
    }

    processFiles()
  }, [response, userMessage, enabled, isStreaming])

  return {
    cleanResponse,
    detectedFiles,
    isProcessing,
    hasFiles: detectedFiles.length > 0
  }
}

// (Eliminado hook useAutoFileCreation por no usarse actualmente)

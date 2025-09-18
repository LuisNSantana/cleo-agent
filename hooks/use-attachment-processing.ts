/**
 * Hook to process file attachments and extract content
 * 
 * Processes PDF and text files to extract content for Canvas Editor integration
 */

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { logger } from '@/lib/logger'
import type { Attachment } from '@/lib/file-handling'

interface ProcessedAttachment extends Attachment {
  processedContent?: string
  isProcessing?: boolean
  error?: string
}

export function useAttachmentProcessing(attachments: Attachment[] = []) {
  const [processedAttachments, setProcessedAttachments] = useState<ProcessedAttachment[]>([])

  // Create a stable signature of attachments so effect doesn't retrigger on referential changes
  const signature = useMemo(() => {
    if (!attachments || attachments.length === 0) return ""
    try {
      return JSON.stringify(
        attachments.map((a) => ({ n: a.name, c: a.contentType, u: a.url }))
      )
    } catch {
      // Fallback to length if unexpected values
      return `len:${attachments.length}`
    }
  }, [attachments])

  useEffect(() => {
    let cancelled = false
    const processAttachments = async () => {
      const processed = await Promise.all(
        attachments.map(async (attachment) => {
          // Skip if already processed or not a supported type
          if (!attachment.url || 
              (!attachment.contentType?.includes('pdf') && 
               !attachment.contentType?.startsWith('text'))) {
            return { ...attachment }
          }

          try {
            // Call API to process the attachment
            const response = await fetch('/api/process-attachment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: attachment.url,
                contentType: attachment.contentType,
                name: attachment.name,
              }),
            })

            if (!response.ok) {
              throw new Error(`Failed to process attachment: ${response.statusText}`)
            }

            const result = await response.json()
            return {
              ...attachment,
              processedContent: result.content,
              isProcessing: false,
            }
          } catch (error) {
            logger.error('ATTACHMENT-HOOK', 'Error processing attachment', error)
            return {
              ...attachment,
              error: error instanceof Error ? error.message : 'Unknown error',
              isProcessing: false,
            }
          }
        })
      )

      if (!cancelled) {
        setProcessedAttachments(processed)
      }
    }

    if (attachments.length > 0) {
      // Set initial state with processing flags
      setProcessedAttachments(
        attachments.map((att) => ({ ...att, isProcessing: true }))
      )
      processAttachments()
    } else {
      setProcessedAttachments([])
    }
    return () => {
      cancelled = true
    }
  }, [signature])

  return processedAttachments
}
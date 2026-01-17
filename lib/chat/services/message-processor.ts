/**
 * Message processing service
 * Handles message conversion, multimodal content, and image filtering
 */

// Message type for AI SDK compatibility - using any for maximum flexibility
type CoreMessage = any
import { convertUserMultimodalMessages } from '@/lib/chat/convert-messages'
import { filterImagesByModelLimit } from '@/lib/chat/image-filter'
import { MODEL_IMAGE_LIMITS } from '@/lib/image-management'
import { chatLogger } from './logger'

export interface ProcessedMessages {
  converted: CoreMessage[]
  imageCount: number
  hasMultimodal: boolean
}

export class MessageProcessorService {
  /**
   * Process and convert messages for model compatibility
   * Handles multimodal content, image limits, and format conversion
   */
  async processMessages(
    messages: CoreMessage[],
    modelId: string,
    supportsVision: boolean
  ): Promise<ProcessedMessages> {
    // Count images before conversion
    const imageCountBefore = this.countImages(messages)
    chatLogger.debug('Processing messages', {
      totalMessages: messages.length,
      imagesBefore: imageCountBefore,
    })

    // Convert multimodal messages to correct format
    let converted = await convertUserMultimodalMessages(messages, modelId, supportsVision)

    // Remove system messages (handled separately via system parameter)
    const beforeFilter = converted.length
    converted = converted.filter((m: any) => m?.role !== 'system') as CoreMessage[]
    if (beforeFilter !== converted.length) {
      chatLogger.debug('Removed system messages from payload', {
        removed: beforeFilter - converted.length,
      })
    }

    // Count images after conversion
    const imageCountAfter = this.countImages(converted)

    // Apply image limits
    const imageLimit = MODEL_IMAGE_LIMITS[modelId]?.maxImages || MODEL_IMAGE_LIMITS.default.maxImages

    if (imageCountAfter > imageLimit) {
      chatLogger.debug('Applying image limit filter', {
        before: imageCountAfter,
        limit: imageLimit,
      })
      converted = filterImagesByModelLimit(converted, modelId) as CoreMessage[]
    }

    const hasMultimodal = converted.some((msg: any) => Array.isArray(msg.content))

    return {
      converted,
      imageCount: imageCountAfter,
      hasMultimodal,
    }
  }

  /**
   * Extract text content from user message
   */
  extractUserText(message: CoreMessage): string {
    const msg = message as any

    // Handle AI SDK v5 structure (parts)
    if (msg.parts && Array.isArray(msg.parts)) {
      const textParts = msg.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text || '')
        .join(' ')
      return textParts
    }

    // Handle legacy structure (content)
    if (msg.content) {
      if (typeof msg.content === 'string') {
        return msg.content
      }
      if (Array.isArray(msg.content)) {
        const textParts = msg.content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text || part.content || '')
          .join(' ')
        return textParts
      }
    }

    return ''
  }

  /**
   * Create clean content for database storage
   * Replaces large attachments with descriptive placeholders
   */
  createCleanContentForDB(message: CoreMessage): string {
    const msg = message as any

    // Handle AI SDK v5 structure (parts)
    if (msg.parts && Array.isArray(msg.parts)) {
      const parts = msg.parts
        .map((part: any) => {
          if (part.type === 'text') {
            return part.text || ''
          }
          if (part.type === 'file') {
            return this.createFileLabel(part)
          }
          return ''
        })
        .filter((part: string) => part !== '')
        .join('\n\n')

      return parts || 'Mensaje del usuario'
    }

    // Handle legacy structure (content)
    if (msg.content) {
      if (typeof msg.content === 'string') {
        return msg.content
      }

      if (Array.isArray(msg.content)) {
        const parts = msg.content
          .map((part: any) => {
            if (part.type === 'text') {
              return part.text || part.content || ''
            }
            if (part.type === 'file') {
              return this.createFileLabel(part)
            }
            return ''
          })
          .filter((part: string) => part !== '')
          .join('\n\n')

        return parts || 'Mensaje del usuario'
      }

      return JSON.stringify(msg.content)
    }

    return 'Mensaje del usuario'
  }

  /**
   * Count images in message array
   */
  private countImages(messages: CoreMessage[]): number {
    return messages.reduce((acc: number, m: any) => {
      if (Array.isArray(m.content)) {
        const imageCount = m.content.filter(
          (p: any) => p.type === 'image' || (p.type === 'file' && p.mediaType?.startsWith('image/'))
        ).length
        return acc + imageCount
      }
      return acc
    }, 0)
  }

  /**
   * Create descriptive label for file attachment
   */
  private createFileLabel(part: any): string {
    const fileName = part.name || 'archivo'
    const fileType = part.mimeType || part.mediaType || 'unknown'

    if (fileType.startsWith('image/')) {
      return `[IMAGEN ADJUNTA: ${fileName}]`
    }
    if (fileType === 'application/pdf') {
      return `[PDF ADJUNTO: ${fileName}]`
    }
    return `[ARCHIVO ADJUNTO: ${fileName} (${fileType})]`
  }
}

export const messageProcessorService = new MessageProcessorService()

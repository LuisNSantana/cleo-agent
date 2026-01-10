/**
 * Image Management System
 * Handles intelligent image filtering, compression, and model-specific limits
 */

export interface ImageLimits {
  maxImages: number
  maxSizePerImage: number // in bytes
  supportedFormats: string[]
}

export const MODEL_IMAGE_LIMITS: Record<string, ImageLimits> = {
  'llama-4-maverick': {
    maxImages: 5,
    maxSizePerImage: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  'grok-3-mini': {
    maxImages: 10,
    maxSizePerImage: 20 * 1024 * 1024, // 20MB  
    supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  'default': {
    maxImages: 5,
    maxSizePerImage: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  }
}

// P1 FIX: Token budget constants for preventing context overflow
// Formula: base64 length / 4 ≈ tokens (conservative estimate)
export const IMAGE_TOKEN_LIMITS = {
  // Max total tokens for all images combined (500K leaves room for text/system prompt)
  maxTotalImageTokens: 500_000,
  // Tokens per character in base64 (1 token ≈ 4 chars)
  tokensPerChar: 0.25,
}

export interface MessageWithImages {
  role: string
  content: Array<{ type: string; image?: string; text?: string; [key: string]: any }>
  timestamp?: number
}

/**
 * Smart image filtering that preserves the most relevant images
 */
export function filterImagesForModel(
  messages: MessageWithImages[],
  model: string
): MessageWithImages[] {
  const limits = MODEL_IMAGE_LIMITS[model] || MODEL_IMAGE_LIMITS.default
  
  // Collect all images with metadata
  const imageData: Array<{
    messageIndex: number
    contentIndex: number
    image: string
    timestamp: number
    isFromCanvas?: boolean
    isRecent?: boolean
  }> = []
  
  messages.forEach((msg, msgIdx) => {
    if (Array.isArray(msg.content)) {
      msg.content.forEach((part, partIdx) => {
        if (part.type === 'image' && part.image) {
          imageData.push({
            messageIndex: msgIdx,
            contentIndex: partIdx,
            image: part.image,
            timestamp: msg.timestamp || 0,
            isFromCanvas: part.image.includes('data:image') && msg.role === 'user',
            isRecent: msgIdx >= messages.length - 3 // Last 3 messages
          })
        }
      })
    }
  })
  
  console.log(`[IMAGE MGMT] Found ${imageData.length} images, model limit: ${limits.maxImages}`)
  
  if (imageData.length <= limits.maxImages) {
    return messages // No filtering needed
  }
  
  // Priority-based selection
  const prioritizedImages = imageData
    .map((img, idx) => ({
      ...img,
      priority: calculateImagePriority(img, idx, imageData.length)
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limits.maxImages)
  
  // Create a set of indices to keep
  const keepImageIndices = new Set(
    prioritizedImages.map(img => `${img.messageIndex}-${img.contentIndex}`)
  )
  
  // Filter messages
  const filteredMessages = messages.map((msg, msgIdx) => {
    if (!Array.isArray(msg.content)) return msg
    
    const filteredContent = msg.content.map((part, partIdx) => {
      if (part.type === 'image' && part.image) {
        const key = `${msgIdx}-${partIdx}`
        if (keepImageIndices.has(key)) {
          return part // Keep this image
        } else {
          // Replace with descriptive text
          return {
            type: 'text' as const,
            text: '[Image removed due to model limit - describe the image content if needed]'
          }
        }
      }
      return part
    })
    
    return { ...msg, content: filteredContent }
  })
  
  console.log(`[IMAGE MGMT] Filtered to ${limits.maxImages} images`)
  return filteredMessages
}

/**
 * Calculate priority for image selection
 * Higher priority = more likely to be kept
 */
function calculateImagePriority(
  img: { messageIndex: number; isFromCanvas?: boolean; isRecent?: boolean; timestamp: number },
  index: number,
  total: number
): number {
  let priority = 0
  
  // Recent messages get higher priority
  if (img.isRecent) priority += 50
  
  // Canvas drawings get highest priority (user created content)
  if (img.isFromCanvas) priority += 100
  
  // More recent images in conversation get higher priority
  priority += (img.messageIndex / total) * 30
  
  // Timestamp-based priority (newer = higher)
  if (img.timestamp) {
    const ageHours = (Date.now() - img.timestamp) / (1000 * 60 * 60)
    priority += Math.max(0, 20 - ageHours) // Decay over 20 hours
  }
  
  return priority
}

/**
 * Compress image data URL for better performance
 */
export function compressImageDataUrl(dataUrl: string, quality: number = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions (max 1024px)
      const maxSize = 1024
      let { width, height } = img
      
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width *= ratio
        height *= ratio
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(compressedDataUrl)
    }
    
    img.src = dataUrl
  })
}

/**
 * Validate image against model limits
 */
export function validateImageForModel(dataUrl: string, model: string): {
  isValid: boolean
  error?: string
  compressed?: string
} {
  const limits = MODEL_IMAGE_LIMITS[model] || MODEL_IMAGE_LIMITS.default
  
  // Check format
  const format = dataUrl.split(';')[0].split(':')[1]
  if (!limits.supportedFormats.includes(format)) {
    return {
      isValid: false,
      error: `Unsupported format ${format}. Supported: ${limits.supportedFormats.join(', ')}`
    }
  }
  
  // Estimate size (rough calculation)
  const base64Data = dataUrl.split(',')[1]
  const sizeEstimate = (base64Data.length * 0.75) // Base64 to binary ratio
  
  if (sizeEstimate > limits.maxSizePerImage) {
    return {
      isValid: false,
      error: `Image too large (${(sizeEstimate / (1024 * 1024)).toFixed(1)}MB). Max: ${limits.maxSizePerImage / (1024 * 1024)}MB`
    }
  }
  
  return { isValid: true }
}

/**
 * Optimize images for a specific model before sending
 */
export async function optimizeImagesForModel(
  messages: MessageWithImages[],
  model: string
): Promise<MessageWithImages[]> {
  console.log(`[IMAGE MGMT] Optimizing images for model: ${model}`)
  
  // First, filter by count
  const countFiltered = filterImagesForModel(messages, model)
  
  // Then, validate and compress individual images
  const optimized = await Promise.all(
    countFiltered.map(async (msg) => {
      if (!Array.isArray(msg.content)) return msg
      
      const optimizedContent = await Promise.all(
        msg.content.map(async (part) => {
          if (part.type === 'image' && part.image) {
            const validation = validateImageForModel(part.image, model)
            if (!validation.isValid) {
              console.warn(`[IMAGE MGMT] Invalid image: ${validation.error}`)
              return {
                type: 'text' as const,
                text: `[Image removed: ${validation.error}]`
              }
            }
            
            // Compress if needed
            if (typeof window !== 'undefined' && part.image.startsWith('data:')) {
              try {
                const compressed = await compressImageDataUrl(part.image, 0.8)
                return { ...part, image: compressed }
              } catch (error) {
                console.warn('[IMAGE MGMT] Compression failed, using original')
                return part
              }
            }
          }
          return part
        })
      )
      
      return { ...msg, content: optimizedContent }
    })
  )
  
  console.log(`[IMAGE MGMT] Optimization complete`)
  return optimized
}

/**
 * P1 FIX: Filter images by total token budget
 * Removes oldest images first when total estimated tokens exceed budget
 * This prevents "maximum prompt length exceeded" errors
 */
export function filterImagesByTokenBudget(
  messages: any[],
  maxTokenBudget: number = IMAGE_TOKEN_LIMITS.maxTotalImageTokens
): any[] {
  // Collect all images with their estimated token counts
  const imageData: Array<{
    messageIndex: number
    contentIndex: number
    estimatedTokens: number
    isRecent: boolean
  }> = []

  messages.forEach((msg, msgIdx) => {
    if (Array.isArray(msg.content)) {
      msg.content.forEach((part: any, partIdx: number) => {
        if (part.type === 'image' && part.image) {
          // Estimate tokens: base64 length / 4
          const estimatedTokens = Math.ceil(part.image.length * IMAGE_TOKEN_LIMITS.tokensPerChar)
          imageData.push({
            messageIndex: msgIdx,
            contentIndex: partIdx,
            estimatedTokens,
            isRecent: msgIdx >= messages.length - 2 // Last 2 messages are "recent"
          })
        }
      })
    }
  })

  const totalTokens = imageData.reduce((sum, img) => sum + img.estimatedTokens, 0)
  
  console.log(`[IMAGE MGMT] Token budget check: ${totalTokens.toLocaleString()} tokens from ${imageData.length} images (budget: ${maxTokenBudget.toLocaleString()})`)

  if (totalTokens <= maxTokenBudget) {
    return messages // No filtering needed
  }

  // Sort by priority: recent images first, then by message order
  const prioritized = [...imageData].sort((a, b) => {
    if (a.isRecent !== b.isRecent) return a.isRecent ? -1 : 1
    return b.messageIndex - a.messageIndex // More recent messages first
  })

  // Keep images until we hit the budget
  let usedTokens = 0
  const keepSet = new Set<string>()
  
  for (const img of prioritized) {
    if (usedTokens + img.estimatedTokens <= maxTokenBudget) {
      keepSet.add(`${img.messageIndex}-${img.contentIndex}`)
      usedTokens += img.estimatedTokens
    }
  }

  console.log(`[IMAGE MGMT] Token budget filter: keeping ${keepSet.size}/${imageData.length} images (${usedTokens.toLocaleString()} tokens)`)

  // Filter messages
  return messages.map((msg, msgIdx) => {
    if (!Array.isArray(msg.content)) return msg

    const filteredContent = msg.content.map((part: any, partIdx: number) => {
      if (part.type === 'image' && part.image) {
        const key = `${msgIdx}-${partIdx}`
        if (keepSet.has(key)) {
          return part
        } else {
          return {
            type: 'text' as const,
            text: '[Image removed to stay within context limits]'
          }
        }
      }
      return part
    })

    return { ...msg, content: filteredContent }
  })
}

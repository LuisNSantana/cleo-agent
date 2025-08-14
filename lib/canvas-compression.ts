/**
 * Canvas Image Compression Utility
 * Optimizes canvas drawings to reduce API payload size and improve performance
 */

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.8,
  format: 'jpeg'
}

/**
 * Compress a canvas drawing data URL
 */
export function compressCanvasImage(
  dataUrl: string, 
  options: CompressionOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    
    // Create temporary canvas and image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }
    
    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img
        const maxWidth = opts.maxWidth!
        const maxHeight = opts.maxHeight!
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height
          
          if (width > height) {
            width = Math.min(width, maxWidth)
            height = width / aspectRatio
          } else {
            height = Math.min(height, maxHeight)
            width = height * aspectRatio
          }
        }
        
        // Set canvas size
        canvas.width = width
        canvas.height = height
        
        // Draw image with white background for JPEG
        if (opts.format === 'jpeg') {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        // Generate compressed data URL
        const mimeType = `image/${opts.format}`
        const compressedDataUrl = canvas.toDataURL(mimeType, opts.quality)
        
        // Calculate compression ratio
        const originalSize = dataUrl.length
        const compressedSize = compressedDataUrl.length
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1)
        
        console.log(`[CANVAS COMPRESSION] Reduced size by ${compressionRatio}% (${originalSize} → ${compressedSize} chars)`)
        
        resolve(compressedDataUrl)
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'))
    }
    
    img.src = dataUrl
  })
}

/**
 * Automatically compress canvas images in chat content
 */
export async function compressCanvasImagesInContent(
  content: Array<{ type: string; image?: any; text?: string; [key: string]: any }>
): Promise<Array<{ type: string; image?: any; text?: string; [key: string]: any }>> {
  if (typeof window === 'undefined') {
    // Server-side, return as-is
    return content
  }
  
  const compressedContent = await Promise.all(
    content.map(async (part) => {
      if (part.type === 'image' && typeof part.image === 'string' && part.image.startsWith('data:image')) {
        try {
          // Compress canvas drawings more aggressively
          const isLargeImage = part.image.length > 500000 // ~500KB threshold
          
          const compressionOptions: CompressionOptions = isLargeImage
            ? { maxWidth: 600, maxHeight: 450, quality: 0.7, format: 'jpeg' }
            : { maxWidth: 800, maxHeight: 600, quality: 0.8, format: 'jpeg' }
          
          const compressed = await compressCanvasImage(part.image, compressionOptions)
          return { ...part, image: compressed }
        } catch (error) {
          console.warn('[CANVAS COMPRESSION] Failed to compress image, using original:', error)
          return part
        }
      }
      return part
    })
  )
  
  return compressedContent
}

/**
 * Estimate data URL size in bytes
 */
export function estimateDataUrlSize(dataUrl: string): number {
  // Remove data URL prefix and calculate binary size
  const base64Data = dataUrl.split(',')[1] || ''
  return Math.floor(base64Data.length * 0.75) // Base64 to binary conversion ratio
}

/**
 * Check if compression is recommended for a data URL
 */
export function shouldCompressImage(dataUrl: string, maxSizeBytes: number = 1024 * 1024): boolean {
  const estimatedSize = estimateDataUrlSize(dataUrl)
  return estimatedSize > maxSizeBytes
}

/**
 * Smart compression that adapts to image content and size
 */
export async function smartCompressCanvasImage(dataUrl: string): Promise<string> {
  if (typeof window === 'undefined') {
    return dataUrl // Server-side, return as-is
  }
  
  const estimatedSize = estimateDataUrlSize(dataUrl)
  
  // No compression needed for small images
  if (estimatedSize < 200 * 1024) { // 200KB
    return dataUrl
  }
  
  // Progressive compression based on size
  let options: CompressionOptions
  
  if (estimatedSize > 2 * 1024 * 1024) { // > 2MB
    options = { maxWidth: 500, maxHeight: 400, quality: 0.6, format: 'jpeg' }
  } else if (estimatedSize > 1024 * 1024) { // > 1MB
    options = { maxWidth: 600, maxHeight: 450, quality: 0.7, format: 'jpeg' }
  } else { // > 200KB
    options = { maxWidth: 800, maxHeight: 600, quality: 0.8, format: 'jpeg' }
  }
  
  try {
    return await compressCanvasImage(dataUrl, options)
  } catch (error) {
    console.warn('[SMART COMPRESSION] Failed, using original:', error)
    return dataUrl
  }
}

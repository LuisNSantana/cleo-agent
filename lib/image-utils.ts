/**
 * Image utilities for vision-enabled models
 * Supports both Grok-4 (xAI) and Llama 4 Maverick (Groq) image processing
 */

// Supported image formats for vision models
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
] as const

export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number]

// Maximum image size limits
export const IMAGE_LIMITS = {
  // Grok-4 limits (xAI)
  GROK_MAX_SIZE: 20 * 1024 * 1024, // 20MiB
  // Groq limits (more conservative)
  GROQ_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  // General limit for UI
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
} as const

/**
 * Check if a file is a supported image type
 */
export function isImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type as SupportedImageType)
}

/**
 * Validate image file for vision processing
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (!isImageFile(file)) {
    return {
      isValid: false,
      error: `Unsupported image format. Supported formats: ${SUPPORTED_IMAGE_TYPES.join(', ')}`
    }
  }

  if (file.size > IMAGE_LIMITS.MAX_SIZE) {
    return {
      isValid: false,
      error: `Image size exceeds ${IMAGE_LIMITS.MAX_SIZE / (1024 * 1024)}MB limit`
    }
  }

  return { isValid: true }
}

/**
 * Convert image file to base64 data URL
 */
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Convert image file to base64 string (without data URL prefix)
 */
export async function imageToBase64String(file: File): Promise<string> {
  const dataUrl = await imageToBase64(file)
  // Remove data:image/jpeg;base64, prefix
  return dataUrl.split(',')[1]
}

/**
 * Create image content for AI SDK messages
 * Compatible with both Grok-4 and Llama vision models
 */
export async function createImageContent(file: File): Promise<{
  type: 'image_url'
  image_url: {
    url: string
  }
}> {
  const validation = validateImageFile(file)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  const base64 = await imageToBase64(file)
  
  return {
    type: 'image_url',
    image_url: {
      url: base64
    }
  }
}

/**
 * Create multiple image contents from files
 */
export async function createImageContents(files: File[]): Promise<Array<{
  type: 'image_url'
  image_url: {
    url: string
  }
}>> {
  const imageFiles = files.filter(isImageFile)
  
  if (imageFiles.length === 0) {
    return []
  }

  const imageContents = await Promise.all(
    imageFiles.map(file => createImageContent(file))
  )

  return imageContents
}

/**
 * Get image analysis prompt suggestions
 */
export function getImageAnalysisPrompts(): string[] {
  return [
    "¿Qué ves en esta imagen?",
    "Describe detalladamente esta imagen",
    "¿Qué texto puedes leer en esta imagen?",
    "Analiza los elementos principales de esta imagen",
    "¿Qué emociones transmite esta imagen?",
    "Identifica objetos y personas en esta imagen",
    "¿Hay algún problema o error en esta imagen?",
    "Explica el contexto de esta imagen"
  ]
}

/**
 * Compress an image file using a canvas to fit under maxBytes and within maxDimension.
 * Returns the original file if already small enough or compression fails.
 */
export async function compressImageFile(
  file: File,
  options: { maxBytes?: number; maxDimension?: number; quality?: number } = {}
): Promise<File> {
  const { maxBytes = 4 * 1024 * 1024, maxDimension = 2000, quality = 0.85 } = options

  try {
    if (!isImageFile(file)) return file
    if (file.size <= maxBytes) return file

    // Load image
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve(image)
      }
      image.onerror = (e) => {
        URL.revokeObjectURL(url)
        reject(e)
      }
      image.src = url
    })

    // Compute target size keeping aspect ratio
    let { width, height } = img
    if (width > height && width > maxDimension) {
      height = Math.round((height * maxDimension) / width)
      width = maxDimension
    } else if (height > width && height > maxDimension) {
      width = Math.round((width * maxDimension) / height)
      height = maxDimension
    } else if (width === height && width > maxDimension) {
      width = height = maxDimension
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    // Prefer WebP for better compression; fallback to JPEG if unsupported
    const mime = 'image/webp'
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), mime, quality)
    )
    if (!blob) return file

    // If still bigger than maxBytes, try a second pass at lower quality
    let outBlob = blob
    if (outBlob.size > maxBytes) {
      const blob2: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), mime, Math.max(0.6, quality - 0.25))
      )
      if (blob2 && blob2.size < outBlob.size) outBlob = blob2
    }

    // Construct a File preserving name but changing extension if needed
    const newName = file.name.replace(/\.(jpe?g|png|gif|webp|heic|heif|svg)$/i, '.webp')
    const compressed = new File([outBlob], newName, { type: 'image/webp', lastModified: Date.now() })
    return compressed.size < file.size ? compressed : file
  } catch {
    return file
  }
}

/**
 * Compress images in a list; non-images returned untouched.
 */
export async function preprocessImages(
  files: File[],
  options?: { maxBytes?: number; maxDimension?: number; quality?: number }
): Promise<File[]> {
  return Promise.all(files.map((f) => compressImageFile(f, options)))
}

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

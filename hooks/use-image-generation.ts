import { useState, useCallback } from "react"

// Global (module-level) sentinel to prevent parallel image generations from different hook instances
let globalGenerationLock = false
let globalLockTimestamp = 0
const MAX_LOCK_DURATION = 300000 // 5 minutes max lock duration

// Auto-cleanup stuck locks
setInterval(() => {
  if (globalGenerationLock && globalLockTimestamp > 0) {
    const lockAge = Date.now() - globalLockTimestamp
    if (lockAge > MAX_LOCK_DURATION) {
      console.warn('🔓 [AUTO-CLEANUP] Clearing stuck global image generation lock (age:', lockAge, 'ms)')
      globalGenerationLock = false
      globalLockTimestamp = 0
    }
  }
}, 60000) // Check every minute

import { detectImageGenerationIntent } from "@/lib/image-generation/intent-detection"

interface GeneratedImageData {
  imageUrl: string
  title: string
  description: string
  style?: string
  dimensions?: {
    width: number
    height: number
  }
}

interface ImageGenerationResult {
  success: boolean
  result?: GeneratedImageData
  model?: string
  usage?: {
    userId: string
    remaining: number
  }
  error?: string
  limitReached?: boolean
  limit?: number
  remaining?: number
}

interface UseImageGenerationProps {
  userId?: string
  onImageGenerated?: (result: GeneratedImageData) => void
}

export function useImageGeneration({ userId, onImageGenerated }: UseImageGenerationProps = {}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<GeneratedImageData | null>(null)

  // Simple toast replacement - in production you'd use a proper toast system
  const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    console.log(`[${variant.toUpperCase()}] ${title}: ${description}`)
    // You could integrate with any toast library here
  }

  const checkCanGenerate = useCallback(async () => {
    if (!userId) return { canGenerate: true, remaining: -1, limit: -1 }

    try {
      const response = await fetch(`/api/generate-image?userId=${userId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check limits')
      }
      
      return {
        canGenerate: data.canGenerate,
        remaining: data.remaining,
        limit: data.limit
      }
    } catch (error) {
      console.error('Error checking image generation limits:', error)
      return { canGenerate: false, remaining: 0, limit: 0 }
    }
  }, [userId])

  const generateImage = useCallback(async (prompt: string): Promise<ImageGenerationResult> => {
    console.log('🎯 [DEBUG] generateImage called, isGenerating:', isGenerating, 'prompt:', prompt.substring(0, 50))
    
    if (isGenerating || globalGenerationLock) {
      console.warn('⚠️ [DEBUG] Image generation already in progress (local or global), returning early')
      return { success: false, error: "Image generation already in progress" }
    }

    console.log('🎯 [DEBUG] Setting isGenerating/globalGenerationLock to true')
    setIsGenerating(true)
    globalGenerationLock = true
    globalLockTimestamp = Date.now()

    try {
      // Check if user can generate images
      const limitCheck = await checkCanGenerate()
      if (!limitCheck.canGenerate) {
        const message = `Daily image generation limit reached. You have used all ${limitCheck.limit} images for today. Try again tomorrow.`
        showToast("Limit Reached", message, "destructive")
        return {
          success: false,
          error: message,
          limitReached: true,
          limit: limitCheck.limit,
          remaining: limitCheck.remaining
        }
      }

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          userId
        }),
        // Add timeout to prevent hanging requests - 120 seconds for image generation
        signal: AbortSignal.timeout(120000) // 120 seconds timeout
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.limitReached) {
          showToast("Daily Limit Reached", data.error, "destructive")
          return {
            success: false,
            error: data.error,
            limitReached: true,
            limit: data.limit,
            remaining: data.remaining
          }
        }
        
        throw new Error(data.error || 'Failed to generate image')
      }

      if (data.success && data.result) {
        setLastGenerated(data.result)
        onImageGenerated?.(data.result)
        
        showToast("Image Generated!", `Successfully created: ${data.result.title}`)

        return {
          success: true,
          result: data.result,
          model: data.model,
          usage: data.usage
        }
      } else {
        throw new Error('Invalid response from image generation service')
      }

    } catch (error) {
      let errorMessage = 'Failed to generate image'
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          errorMessage = 'Image generation timed out after 2 minutes. Please try again with a simpler description.'
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else {
          errorMessage = error.message
        }
      }
      
      console.error('Image generation error:', error)
      
      showToast("Generation Failed", errorMessage, "destructive")

      return {
        success: false,
        error: errorMessage
      }
    } finally {
      console.log('🎯 [DEBUG] Setting isGenerating to false in finally block')
      setIsGenerating(false)
      globalGenerationLock = false
      globalLockTimestamp = 0
    }
  }, [isGenerating, userId, checkCanGenerate, onImageGenerated, showToast])

  const checkIfImageRequest = useCallback((message: string): { isImageRequest: boolean; extractedPrompt: string } => {
    const result = detectImageGenerationIntent(message)
    return {
      isImageRequest: result.shouldGenerate,
      extractedPrompt: result.extractedPrompt
    }
  }, [])

  const handleAutoGeneration = useCallback(async (message: string): Promise<{ handled: boolean; result?: ImageGenerationResult }> => {
    const { isImageRequest, extractedPrompt } = checkIfImageRequest(message)
    
    if (!isImageRequest) {
      return { handled: false }
    }

    const result = await generateImage(extractedPrompt)
    return { handled: true, result }
  }, [checkIfImageRequest, generateImage])

  return {
    // State
    isGenerating,
    lastGenerated,
    
    // Actions
    generateImage,
    checkCanGenerate,
    checkIfImageRequest,
    handleAutoGeneration,
    
    // Utils
    reset: () => {
      console.log('🎯 [DEBUG] Resetting image generation state')
      setLastGenerated(null)
      setIsGenerating(false)
      globalGenerationLock = false // Also reset global lock
      globalLockTimestamp = 0
    },
    // Emergency reset for stuck states
    forceReset: () => {
      console.log('🆘 [DEBUG] Force resetting image generation state and global lock')
      setLastGenerated(null)
      setIsGenerating(false)
      globalGenerationLock = false // Ensure global lock is cleared
      globalLockTimestamp = 0
    }
  }
}
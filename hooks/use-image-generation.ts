import { useState, useCallback } from "react"
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
    if (isGenerating) {
      return { success: false, error: "Image generation already in progress" }
    }

    setIsGenerating(true)

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
        })
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image'
      console.error('Image generation error:', error)
      
      showToast("Generation Failed", errorMessage, "destructive")

      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsGenerating(false)
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
      setLastGenerated(null)
      setIsGenerating(false)
    }
  }
}
import { memo, useEffect, useState } from "react"
import { GeneratedImage } from "./generated-image"
import { useImageGeneration } from "@/hooks/use-image-generation"

interface ImageGenerationHandlerProps {
  message: string
  userId?: string
  onImageGenerated?: (imageData: any) => void
}

export const ImageGenerationHandler = memo(function ImageGenerationHandler({
  message,
  userId,
  onImageGenerated
}: ImageGenerationHandlerProps) {
  const [hasAttempted, setHasAttempted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const {
    isGenerating,
    lastGenerated,
    handleAutoGeneration
  } = useImageGeneration({
    userId,
    onImageGenerated
  })

  useEffect(() => {
    // Prevent multiple attempts for the same message
    if (hasAttempted) return
    
    const processMessage = async () => {
      try {
        setError(null)
        setHasAttempted(true)
        
        const result = await handleAutoGeneration(message)
        if (result.handled) {
          if (result.result?.success) {
            console.log('✅ Image generated:', result.result.result)
          } else if (result.result?.error) {
            // Set error state to show user-friendly message
            setError(result.result.error)
            console.error('❌ Image generation failed:', result.result.error)
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate image'
        setError(errorMessage)
        console.error('❌ Image generation error:', error)
      }
    }

    processMessage()
  }, [message, handleAutoGeneration, hasAttempted])

  // Reset state when message changes (new image request)
  useEffect(() => {
    setHasAttempted(false)
    setError(null)
  }, [message])

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <span className="text-red-700 dark:text-red-300 font-medium">
            Image Generation Failed
          </span>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
            {error}
          </p>
        </div>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
        <span className="text-purple-700 dark:text-purple-300">
          Generating image...
        </span>
      </div>
    )
  }

  if (lastGenerated) {
    return (
      <GeneratedImage
        imageUrl={lastGenerated.imageUrl}
        title={lastGenerated.title}
        description={lastGenerated.description}
        style={lastGenerated.style}
        dimensions={lastGenerated.dimensions}
      />
    )
  }

  return null
})

ImageGenerationHandler.displayName = "ImageGenerationHandler"
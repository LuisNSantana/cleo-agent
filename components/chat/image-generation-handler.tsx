import { memo, useEffect, useRef, useState } from "react"
import { GeneratedImage } from "./generated-image"
import { GeneratedImageData, useImageGeneration } from "@/hooks/use-image-generation"

interface ImageGenerationHandlerProps {
  message: string
  userId?: string
  onImageGenerated?: (imageData: GeneratedImageData) => void
}

export const ImageGenerationHandler = memo(function ImageGenerationHandler({
  message,
  userId,
  onImageGenerated
}: ImageGenerationHandlerProps) {
  const [error, setError] = useState<string | null>(null)
  const processedMessageRef = useRef<string | null>(null)
  
  const {
    isGenerating,
    lastGenerated,
    handleAutoGeneration
  } = useImageGeneration({
    userId,
    onImageGenerated
  })

  useEffect(() => {
    if (!message?.trim()) {
      processedMessageRef.current = null
      if (error) setError(null)
      return
    }

    if (processedMessageRef.current === message) {
      return
    }

    processedMessageRef.current = message
    setError(null)

    let isActive = true

    const processMessage = async () => {
      try {
        const autoResult = await handleAutoGeneration(message)

        if (!isActive || !autoResult.handled) {
          return
        }

        const generation = autoResult.result
        if (!generation) {
          return
        }

        if (generation.success && generation.result) {
          console.log('✅ Image generated:', generation.result.title)
        } else if (generation.error) {
          setError(generation.error)
          console.error('❌ Image generation failed:', generation.error)
        }
      } catch (error) {
        if (!isActive) return
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate image'
        setError(errorMessage)
        console.error('❌ Image generation error:', error)
      }
    }

    processMessage()

    return () => {
      isActive = false
    }
  }, [message, handleAutoGeneration])

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
        <div className="flex flex-col text-purple-700 dark:text-purple-300 text-sm">
          <span className="font-medium">Generando imagen con FLUX Pro…</span>
          <span className="text-xs text-purple-500 dark:text-purple-300/80">
            Si falla, usaremos OpenAI gpt-image-1 automáticamente.
          </span>
        </div>
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
        model={lastGenerated.canonicalModel || lastGenerated.model}
        fallbackUsed={lastGenerated.fallbackUsed}
        usage={lastGenerated.usage ?? undefined}
        attempts={lastGenerated.attempts}
      />
    )
  }

  return null
})

ImageGenerationHandler.displayName = "ImageGenerationHandler"
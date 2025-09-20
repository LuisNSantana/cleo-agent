import { memo, useEffect } from "react"
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
  const {
    isGenerating,
    lastGenerated,
    handleAutoGeneration
  } = useImageGeneration({
    userId,
    onImageGenerated
  })

  useEffect(() => {
    const processMessage = async () => {
      const result = await handleAutoGeneration(message)
      if (result.handled && result.result?.success) {
        // Image was generated successfully
        console.log('✅ Image generated:', result.result.result)
      }
    }

    processMessage()
  }, [message, handleAutoGeneration])

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
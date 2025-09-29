import { memo, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Palette, Maximize2 } from "lucide-react"

interface GeneratedImageProps {
  imageUrl: string
  title: string
  description: string
  style?: string
  dimensions?: {
    width: number
    height: number
  }
  model?: string
  fallbackUsed?: boolean
  attempts?: Array<{
    model: string
    provider: string
    success: boolean
    ms: number
    error?: string
  }>
  usage?: {
    userId: string
    remaining: number
  }
}

export const GeneratedImage = memo(function GeneratedImage({
  imageUrl,
  title,
  description,
  style,
  dimensions,
  model,
  fallbackUsed,
  attempts,
  usage
}: GeneratedImageProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
      // Fallback: open in new tab
      window.open(imageUrl, '_blank')
    }
  }

  const handleOpenFullsize = () => {
    window.open(imageUrl, '_blank')
  }

  const formatDimensions = () => {
    if (!dimensions) return null
    return `${dimensions.width} × ${dimensions.height}`
  }

  const modelLabel = useMemo(() => {
    if (!model) return null
    const core = model.replace(/^.*?:/, '')
    if (/gpt-image-1/i.test(core)) return "gpt-image-1"
    if (/flux-pro/i.test(core)) return "FLUX Pro"
    if (/flux-1-schnell/i.test(core)) return "FLUX Schnell"
    return core
  }, [model])

  const providerLabel = useMemo(() => {
    if (!model) return null
    if (model.startsWith('openai')) return 'OpenAI'
    if (model.startsWith('deepinfra')) return 'DeepInfra'
    return 'AI'
  }, [model])

  const failedAttemptsCount = useMemo(() => {
    if (!attempts?.length) return 0
    return attempts.filter(attempt => !attempt.success).length
  }, [attempts])

  return (
    <Card className="w-full max-w-lg mx-auto bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {title}
          </CardTitle>
          {(modelLabel || fallbackUsed) && (
            <div className="flex items-center gap-2">
              {modelLabel && (
                <Badge variant="secondary" className="text-xs">
                  {modelLabel}
                </Badge>
              )}
              {fallbackUsed && (
                <Badge
                  variant="outline"
                  className="text-xs border-amber-400 text-amber-700 dark:text-amber-200 dark:border-amber-500"
                >
                  Fallback activado
                </Badge>
              )}
            </div>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative group">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-auto rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />
          
          {/* Overlay with actions on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleOpenFullsize}
              className="bg-white/90 hover:bg-white text-black"
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              View Full
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownload}
              className="bg-white/90 hover:bg-white text-black"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 pb-4">
        <div className="flex flex-col gap-2 w-full text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {style && (
                <span className="flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  {style}
                </span>
              )}
              {formatDimensions() && <span>{formatDimensions()}</span>}
            </div>
            {(modelLabel || providerLabel) && (
              <div className="text-right leading-tight">
                {modelLabel && (
                  <span className="block text-purple-700 dark:text-purple-300 font-medium">
                    {fallbackUsed ? 'Resultado:' : 'Modelo:'} {modelLabel}
                  </span>
                )}
                {providerLabel && (
                  <span className="block text-[11px] text-muted-foreground">
                    {fallbackUsed ? 'Proveedor de respaldo' : 'Proveedor'}: {providerLabel}
                  </span>
                )}
                {fallbackUsed && failedAttemptsCount > 0 && (
                  <span className="block text-[11px] text-muted-foreground mt-1">
                    {failedAttemptsCount} intento{failedAttemptsCount === 1 ? '' : 's'} fallido{failedAttemptsCount === 1 ? '' : 's'} con FLUX antes del fallback.
                  </span>
                )}
              </div>
            )}
          </div>

          {usage && (
            <div className="flex items-center justify-end text-purple-600 dark:text-purple-400">
              {usage.remaining} imágenes disponibles hoy
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
})

GeneratedImage.displayName = "GeneratedImage"
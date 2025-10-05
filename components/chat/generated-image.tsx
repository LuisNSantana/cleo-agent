import { memo, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Maximize2, Palette } from "lucide-react"

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
      // Try to download via fetch with CORS mode
      const response = await fetch(imageUrl, { mode: 'cors' })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cleo_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
      // Fallback: try direct download attribute
      try {
        const link = document.createElement('a')
        link.href = imageUrl
        link.download = `cleo_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.png`
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (e) {
        // Last resort: copy URL to clipboard
        navigator.clipboard.writeText(imageUrl).then(() => {
          alert('Image URL copied to clipboard. You can paste it in a new tab to download.')
        }).catch(() => {
          alert('Unable to download. Please right-click the image and select "Save image as..."')
        })
      }
    }
  }

  const handleOpenFullsize = () => {
    // Create a temporary window with the image
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #000;
              }
              img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="${title}" />
          </body>
        </html>
      `)
      newWindow.document.close()
    } else {
      // Fallback if popup blocked
      alert('Please allow popups to view the image in full size.')
    }
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
    <div className="mt-3 flex w-full justify-end">
      <figure className="inline-flex max-w-[240px] sm:max-w-[280px] flex-col items-end gap-2 rounded-3xl bg-gradient-to-b from-white/80 via-white/60 to-white/45 px-3 py-3 text-right shadow-[0_18px_38px_-24px_rgba(15,23,42,0.55)] ring-1 ring-white/70 backdrop-blur-md dark:from-white/16 dark:via-white/12 dark:to-white/8 dark:ring-white/12">
        <figcaption className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-100">
          <span>{title}</span>
          {description && (
            <span className="text-xs font-normal leading-snug text-muted-foreground">
              {description}
            </span>
          )}
        </figcaption>

        <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/10 dark:ring-white/12">
          <img
            src={imageUrl}
            alt={title}
            className="h-auto w-full rounded-2xl object-cover"
            loading="lazy"
          />
        </div>

        {(style || formatDimensions()) && (
          <div className="flex flex-wrap items-center justify-end gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            {style && (
              <span className="flex items-center gap-1">
                <Palette className="h-3 w-3" />
                {style}
              </span>
            )}
            {formatDimensions() && (
              <span>• {formatDimensions()}</span>
            )}
          </div>
        )}

        {(modelLabel || fallbackUsed || providerLabel) && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {modelLabel && (
              <Badge className="bg-purple-100/70 px-2 py-0 text-[10px] font-medium uppercase tracking-wide text-purple-700 shadow-sm dark:bg-purple-500/15 dark:text-purple-200">
                {modelLabel}
              </Badge>
            )}
            {fallbackUsed && (
              <Badge variant="outline" className="border-amber-400/70 bg-amber-50/70 px-2 py-0 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-300/60 dark:bg-amber-400/10 dark:text-amber-200">
                Fallback
              </Badge>
            )}
            {providerLabel && (
              <span className="text-[11px] text-muted-foreground">
                {providerLabel}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenFullsize}
            className="h-8 w-8 rounded-full bg-white/65 text-slate-700 hover:bg-white dark:bg-white/15 dark:text-slate-100"
          >
            <Maximize2 className="h-4 w-4" />
            <span className="sr-only">View full size image</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-8 w-8 rounded-full bg-white/65 text-slate-700 hover:bg-white dark:bg-white/15 dark:text-slate-100"
          >
            <Download className="h-4 w-4" />
            <span className="sr-only">Download image</span>
          </Button>
        </div>

        {fallbackUsed && failedAttemptsCount > 0 && (
          <div className="text-[10px] leading-tight text-muted-foreground">
            {failedAttemptsCount} failed attempt{failedAttemptsCount === 1 ? '' : 's'} before fallback.
          </div>
        )}

        {usage && (
          <div className="text-[10px] font-medium uppercase tracking-wide text-purple-600/80 dark:text-purple-300/80">
            {usage.remaining} images remaining today
          </div>
        )}
      </figure>
    </div>
  )
})

GeneratedImage.displayName = "GeneratedImage"
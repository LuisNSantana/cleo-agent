import { memo, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
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
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleDownload = async () => {
    try {
      // 1. Attempt standard fetch blob download (best UX)
      const response = await fetch(imageUrl, { mode: 'cors' })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cleo_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.warn('CORS download failed, trying direct link', error)
      // 2. Fallback: Open in new window (user can Right Click -> Save As)
      window.open(imageUrl, '_blank')
    }
  }

  const formatDimensions = () => {
    if (!dimensions) return null
    return `${dimensions.width} × ${dimensions.height}`
  }

  const modelLabel = useMemo(() => {
    if (!model) return null
    const core = model.replace(/^.*?:/, '')
    if (/gpt-image-1/i.test(core)) return "GPT-Image-1"
    if (/chatgpt-image-latest/i.test(core)) return "ChatGPT Latest"
    if (/dall-e-3/i.test(core)) return "DALL-E 3"
    return core
  }, [model])

  const providerLabel = useMemo(() => {
    if (!model) return null
    if (model.startsWith('openai')) return 'OpenAI'
    return 'AI'
  }, [model])

  const failedAttemptsCount = useMemo(() => {
    if (!attempts?.length) return 0
    return attempts.filter(attempt => !attempt.success).length
  }, [attempts])

  return (
    <>
      <div className="mt-3 flex w-full justify-end">
        <figure className="inline-flex max-w-[280px] sm:max-w-[320px] flex-col items-end gap-2 rounded-3xl bg-gradient-to-b from-white/90 via-white/70 to-white/50 px-3 py-3 text-right shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-white/60 backdrop-blur-xl transition-all hover:scale-[1.02] dark:from-white/10 dark:via-white/5 dark:to-transparent dark:ring-white/10">
          <figcaption className="flex flex-col gap-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">
            <span>{title}</span>
            {description && (
              <span className="text-[10px] sm:text-xs font-normal leading-snug text-muted-foreground/80">
                {description.length > 80 ? description.slice(0, 80) + '...' : description}
              </span>
            )}
          </figcaption>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <div 
              onClick={() => setIsDialogOpen(true)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10"
            >
              <img
                src={imageUrl}
                alt={title}
                className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 transition-all duration-300 group-hover:bg-black/40 group-hover:opacity-100 dark:group-hover:bg-black/50">
                <Maximize2 className="h-8 w-8 text-white drop-shadow-md" />
                <Button 
                  size="sm"
                  variant="secondary"
                  className="h-8 bg-white/90 px-3 text-xs font-medium text-slate-900 shadow-sm hover:bg-white backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload()
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </div>

            <DialogContent className="max-w-[95vw] max-h-[95vh] w-fit h-fit p-0 border-none bg-transparent shadow-none overflow-hidden flex items-center justify-center outline-none">
              <div className="relative">
                 <img
                  src={imageUrl}
                  alt={title}
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                   <Button 
                    size="sm" 
                    variant="secondary"
                    className="backdrop-blur-md bg-white/80 hover:bg-white text-black shadow-lg"
                    onClick={() => handleDownload()}
                   >
                     <Download className="mr-2 h-4 w-4" /> Download
                   </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex w-full items-center justify-between gap-2 pl-1">
             <div className="flex items-center gap-2">
                {modelLabel && (
                  <Badge variant="secondary" className="bg-purple-100/80 px-1.5 py-0 text-[10px] font-medium text-purple-700 dark:bg-purple-500/20 dark:text-purple-200">
                    {modelLabel}
                  </Badge>
                )}
             </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDialogOpen(true)}
                className="h-7 w-7 rounded-full text-slate-500 hover:bg-black/5 hover:text-black dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                title="View Fullscreen"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="h-7 w-7 rounded-full text-slate-500 hover:bg-black/5 hover:text-black dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </figure>
      </div>
    </>
  )
})

GeneratedImage.displayName = "GeneratedImage"
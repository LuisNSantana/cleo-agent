import { memo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Palette, Maximize2, ExternalLink } from "lucide-react"

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

  return (
    <Card className="w-full max-w-lg mx-auto bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {title}
          </CardTitle>
          {model && (
            <Badge variant="secondary" className="text-xs">
              {model.includes('gemini') ? 'Gemini' : model.split(':')[1]?.split('/')[1] || 'AI'}
            </Badge>
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
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {style && (
              <span className="flex items-center gap-1">
                <Palette className="h-3 w-3" />
                {style}
              </span>
            )}
            {formatDimensions() && (
              <span>{formatDimensions()}</span>
            )}
          </div>
          
          {usage && (
            <div className="flex items-center gap-1">
              <span className="text-purple-600 dark:text-purple-400">
                {usage.remaining} images remaining today
              </span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
})

GeneratedImage.displayName = "GeneratedImage"
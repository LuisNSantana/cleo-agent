"use client"

import { Button } from "@/components/ui/button"
import { getImageAnalysisPrompts } from "@/lib/image-utils"
import { Image, Sparkle } from "@phosphor-icons/react"
import { motion, AnimatePresence } from "framer-motion"

type ImageSuggestionsProps = {
  hasImages: boolean
  onSuggestion: (suggestion: string) => void
}

const TRANSITION = {
  type: "spring" as const,
  duration: 0.2,
  bounce: 0.2,
}

export function ImageSuggestions({ hasImages, onSuggestion }: ImageSuggestionsProps) {
  const suggestions = getImageAnalysisPrompts()

  return (
    <AnimatePresence initial={false}>
      {hasImages && (
        <motion.div
          key="image-suggestions"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={TRANSITION}
          className="overflow-hidden"
        >
          <div className="px-3 py-2 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Image className="size-4" alt="" />
                <span>Análisis de imagen</span>
                <Sparkle className="size-3" alt="" />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onSuggestion(suggestion)}
                  className="h-7 px-2.5 text-xs bg-background/50 hover:bg-accent border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground/70">
              💡 Cleo puede analizar imágenes con Grok-4 y Llama 4 Maverick
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

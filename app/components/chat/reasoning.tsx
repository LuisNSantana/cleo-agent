import { Markdown } from "@/components/prompt-kit/markdown"
import { cn } from "@/lib/utils"
import { CaretDownIcon } from "@phosphor-icons/react"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

type ReasoningProps = {
  reasoning: string
  isStreaming?: boolean
}

const TRANSITION = {
  type: "spring" as const,
  duration: 0.2,
  bounce: 0,
}

export function Reasoning({ reasoning, isStreaming }: ReasoningProps) {
  // Only show if there's actual reasoning content or while streaming
  const hasContent = Boolean(reasoning && reasoning.trim().length > 0)
  const [isExpanded, setIsExpanded] = useState<boolean>(Boolean(isStreaming) || hasContent)
  const prevStreaming = useRef<boolean>(Boolean(isStreaming))

  // When streaming finishes, keep expanded if there's reasoning content
  useEffect(() => {
    if (prevStreaming.current && isStreaming === false) {
      setIsExpanded(hasContent) // Keep expanded only if there's actual content
    }
    prevStreaming.current = Boolean(isStreaming)
  }, [isStreaming, hasContent])

  // Don't render if there's no content and not streaming
  if (!hasContent && !isStreaming) return null

  return (
    <div>
      <button
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span>Reasoning</span>
        {isStreaming && (
          <span className="ml-1 text-[10px] opacity-70">Thinking…</span>
        )}
        <CaretDownIcon
          className={cn(
            "size-3 transition-transform",
            isExpanded ? "rotate-180" : ""
          )}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="mt-2 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={TRANSITION}
          >
            <div className="text-muted-foreground border-muted-foreground/20 flex flex-col border-l pl-4 text-sm">
              <Markdown>{reasoning}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

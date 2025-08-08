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
  // Start expanded only while streaming to signal "thinking"; collapse by default after
  const [isExpanded, setIsExpanded] = useState<boolean>(Boolean(isStreaming))
  const prevStreaming = useRef<boolean>(Boolean(isStreaming))

  // When streaming finishes, auto-collapse to reduce visual noise
  useEffect(() => {
    if (prevStreaming.current && isStreaming === false) {
      setIsExpanded(false)
    }
    prevStreaming.current = Boolean(isStreaming)
  }, [isStreaming])

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

import { Bot } from "lucide-react"
import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
  className?: string
  message?: string
}

export function TypingIndicator({ 
  className,
  message = "Cleo está pensando..." 
}: TypingIndicatorProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-4 bg-muted/30 message-enter",
      className
    )}>
      {/* Avatar */}
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
        <Bot className="h-4 w-4 text-white" />
      </div>
      
      {/* Typing dots */}
      <div className="flex items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-muted-foreground typing-dot" />
        <div className="h-2 w-2 rounded-full bg-muted-foreground typing-dot" />
        <div className="h-2 w-2 rounded-full bg-muted-foreground typing-dot" />
      </div>
      
      {/* Optional message */}
      {message && (
        <span className="text-sm text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  )
}

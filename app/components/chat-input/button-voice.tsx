import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Waveform } from "@phosphor-icons/react"
import React from "react"
import { PopoverContentAuth } from "./popover-content-auth"

type ButtonVoiceProps = {
  onClick?: () => void
  isAuthenticated: boolean
  className?: string
}

const CONTROL_BUTTON_CLASSES =
  "h-10 w-10 sm:h-9 sm:w-9 rounded-full border border-black/5 bg-white/90 text-slate-600 shadow-[0_8px_30px_rgba(15,23,42,0.08)] transition-all duration-200 hover:border-brand-magenta hover:text-brand-magenta hover:shadow-brand-magenta/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-magenta dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:border-brand-magenta/70 dark:hover:bg-white/10"

export function ButtonVoice({
  onClick,
  isAuthenticated,
  className,
}: ButtonVoiceProps) {
  if (!isAuthenticated) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "group",
                  CONTROL_BUTTON_CLASSES,
                  "text-slate-500",
                  className
                )}
              >
                <Waveform className="size-5" weight="regular" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Voice mode (requires authentication)</TooltipContent>
        </Tooltip>
        <PopoverContentAuth />
      </Popover>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("group", CONTROL_BUTTON_CLASSES, className)}
          onClick={onClick}
          aria-label="Toggle voice mode"
        >
          <span className="relative flex items-center justify-center">
            <span className="absolute inset-0 -z-10 rounded-full bg-brand-magenta/0 transition-all duration-200 group-hover:bg-brand-magenta/10" />
            <Waveform className="size-5" weight="regular" />
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Voice mode</TooltipContent>
    </Tooltip>
  )
}

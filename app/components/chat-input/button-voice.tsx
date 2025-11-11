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
                variant="secondary"
                size="icon"
                className={cn(
                  "border-border dark:bg-secondary rounded-full border bg-transparent dark:!text-gray-900 dark:hover:!text-gray-900 h-9 w-9",
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
          variant="secondary"
          size="icon"
          className={cn(
            "border-border dark:bg-secondary rounded-full border bg-transparent transition-all duration-150 dark:!text-gray-900 dark:hover:!text-gray-900 h-9 w-9",
            className
          )}
          onClick={onClick}
        >
          <Waveform className="size-5" weight="regular" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Voice mode</TooltipContent>
    </Tooltip>
  )
}

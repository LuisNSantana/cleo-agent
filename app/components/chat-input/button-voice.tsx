import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Microphone } from "@phosphor-icons/react"
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
                className={cn(
                  "border-border dark:bg-secondary rounded-full border bg-transparent dark:!text-gray-900 dark:hover:!text-gray-900",
                  className
                )}
              >
                <Microphone className="size-5" weight="fill" />
                <span className="hidden md:inline-block">Voice</span>
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
          className={cn(
            "border-border dark:bg-secondary rounded-full border bg-transparent transition-all duration-150 dark:!text-gray-900 dark:hover:!text-gray-900",
            className
          )}
          onClick={onClick}
        >
          <Microphone className="size-5" weight="fill" />
          <span className="hidden md:inline-block">Voice</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Voice mode</TooltipContent>
    </Tooltip>
  )
}

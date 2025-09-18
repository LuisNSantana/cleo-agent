"use client"

import { useSidebar } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { PanelLeftIcon } from "lucide-react"

type HeaderSidebarTriggerProps = React.HTMLAttributes<HTMLButtonElement>

export function HeaderSidebarTrigger({
  className,
  ...props
}: HeaderSidebarTriggerProps) {
  const { toggleSidebar, open } = useSidebar()
  const { openMobile, isMobile } = useSidebar()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onPointerDown={(e) => {
            // Use pointerdown for immediate response on mobile Safari; fall back to click if needed
            // Only left-click / primary touch
            if (e.pointerType === "mouse" && e.button !== 0) return
            toggleSidebar()
          }}
          onClick={(e) => {
            // Prevent duplicate toggles when pointerdown already handled
            e.preventDefault()
          }}
          className={cn(
            "pointer-events-auto",
            "bg-background text-foreground/80 hover:text-foreground hover:bg-muted rounded-md transition-colors",
            "inline-flex size-9 items-center justify-center focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            className
          )}
          aria-expanded={isMobile ? openMobile : open}
          {...props}
        >
          <PanelLeftIcon className="size-5" />
          <span className="sr-only">Toggle sidebar</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {isMobile ? (openMobile ? "Close sidebar" : "Open sidebar") : open ? "Close sidebar" : "Open sidebar"}
      </TooltipContent>
    </Tooltip>
  )
}

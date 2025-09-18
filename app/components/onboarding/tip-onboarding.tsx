"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "cleo-onboarding-tips-dismissed"

export function TipOnboarding({ className }: { className?: string }) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      setDismissed(v === "1")
    } catch {}
  }, [])

  const onDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {}
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div
      role="region"
      aria-label="Quick tips for getting started"
      className={cn(
        "relative w-full max-w-md rounded-lg border border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 shadow-md",
        "px-4 py-3 text-sm",
        className
      )}
      style={{
        // keep off the very bottom to avoid overlapping browser UI
        paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
      }}
    >
      <button
        type="button"
        aria-label="Dismiss tips"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </button>

      <p className="mb-2 font-medium" id="tips-heading">Quick tips</p>
      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
        <li>
          Press <kbd className="rounded border px-1">/</kbd> to focus the input fast
        </li>
        <li>
          Use the clip icon to attach files (PDF, DOCX, images)
        </li>
        <li>
          Toggle web search for live results when needed
        </li>
        <li>
          Switch models from the selector above when you need tools or vision
        </li>
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={onDismiss} className="h-8 px-3">
          Got it
        </Button>
        <a
          href="/docs"
          className="text-xs text-primary hover:underline"
          aria-label="Open Cleo documentation in a new page"
        >
          Read the docs
        </a>
      </div>
    </div>
  )
}

"use client"

import { cn } from "@/lib/utils"

interface ChatBackgroundProps {
  className?: string
  overlayOpacity?: number
}

// Premium, minimal static background for mobile (no video)
// - Subtle light/dark gradient
// - Soft color tint
// - Very light texture (grid as faux grain)
// - Non-interactive, fixed behind content
export function ChatBackground({ className, overlayOpacity = 1 }: ChatBackgroundProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden",
        className
      )}
      aria-hidden
    >
      {/* Base gradient (neutral, slightly darker; Apple-like deference) */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-100 to-neutral-200 dark:from-neutral-950 dark:to-neutral-900" />

      {/* Neutral-cool tint (reduced purple, subtle blue-gray) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-slate-500/5 to-indigo-500/10 dark:from-slate-300/10 dark:via-indigo-300/8 dark:to-sky-300/10"
        style={{ opacity: overlayOpacity }}
      />

      {/* Soft vignette for depth (slightly stronger for a premium look) */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_120%,rgba(0,0,0,0.18),transparent_60%)] dark:bg-[radial-gradient(1200px_600px_at_50%_120%,rgba(0,0,0,0.45),transparent_60%)]" />

      {/* Gentle top-left highlight to avoid flatness (very subtle) */}
      <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_20%_10%,rgba(255,255,255,0.06),transparent_60%)] dark:bg-[radial-gradient(600px_300px_at_20%_10%,rgba(255,255,255,0.03),transparent_60%)]" />

      {/* Faux grain: ultra-subtle grid to avoid flatness (no motion) */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.035] bg-[linear-gradient(to_right,rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.7)_1px,transparent_1px)] bg-[size:8px_8px] mix-blend-overlay" />
    </div>
  )
}

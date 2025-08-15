// SketchCanvas implementation was deprecated and removed to avoid TSX parse errors.
// If you need the original implementation, it's preserved in the Git history.

"use client"

import React from "react"

export default function SketchCanvasDeprecated() {
  return (
    <div className="p-4 text-sm text-muted-foreground">
      SketchCanvas deprecated — replaced by the new Tldraw editor.
    </div>
  )
}

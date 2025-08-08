"use client"

import { CanvasEditorShell } from './canvas-editor-shell'
import { useCanvasEditorStore } from '@/lib/canvas-editor/store'

// Small helper component always mounted (lazy via dynamic in layout)
export function CanvasEditorEntry() {
  const open = useCanvasEditorStore(s => s.open)
  return (
    <>
      <CanvasEditorShell />
      {/* Dev trigger button (can be removed later) */}
      <div className="fixed bottom-2 right-2 z-40">
        <button
          onClick={() => open({ text: 'Escribe aquí tu documento largo...\n\n', mode: 'markdown' })}
          className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow hover:opacity-90"
        >Editor</button>
      </div>
    </>
  )
}

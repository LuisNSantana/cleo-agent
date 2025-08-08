"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { Chat } from './chat'
import { CanvasEditorShell } from '@/components/canvas-editor/canvas-editor-shell'
import { useCanvasEditorStore } from '@/lib/canvas-editor/store'
import { cn } from '@/lib/utils'

export function ChatWithEditor() {
  const isOpen = useCanvasEditorStore(s => s.isOpen)
  const close = useCanvasEditorStore(s => s.close)
  const [width, setWidth] = useState(520)
  const dragging = useRef(false)

  const startDrag = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    e.preventDefault()
  }, [])

  const onMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return
    setWidth(() => {
      const next = window.innerWidth - e.clientX
      return Math.min(Math.max(next, 340), Math.min(1000, window.innerWidth - 300))
    })
  }, [])

  const stopDrag = useCallback(() => { dragging.current = false }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', stopDrag)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', stopDrag)
    }
  }, [onMove, stopDrag])

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className={cn('flex flex-1 min-w-0 transition-all', isOpen && 'border-r')}>        
        <Chat />
      </div>
      {isOpen && (
        <>
          <div
            onMouseDown={startDrag}
            className="group w-1 cursor-col-resize bg-transparent relative select-none"
          >
            <div className="absolute inset-y-0 -left-1 w-2 opacity-0 group-hover:opacity-60 bg-primary/40 transition" />
          </div>
          <div style={{ width }} className="h-full flex flex-col bg-background shadow-inner">
            <div className="flex items-center justify-between px-2 h-7 border-b text-[11px]">
              <span className="font-medium tracking-wide">Editor</span>
              <div className="flex items-center gap-2">
                <button onClick={close} className="rounded px-2 py-0.5 border text-[10px] hover:bg-accent">Cerrar</button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <CanvasEditorShell />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

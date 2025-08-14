"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { TldrawWrapper } from "./index"

export function DrawDrawer({ open, onOpenChange, onSendToChat }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSendToChat?: (analysis: { summary: string; details?: any, image?: string }) => void
}) {
  const [busy, setBusy] = useState(false)
  const [autoAnalyze, setAutoAnalyze] = useState(true)
  const [analysis, setAnalysis] = useState<{ summary: string; details?: any } | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)

  const [lastPng, setLastPng] = useState<string | null>(null)

  // Listen for analysis results emitted by the Tldraw wrapper
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e.detail
      if (!detail) return
      // detail.result is the parsed response from the API
      setAnalysis(detail.result?.summary ? { summary: detail.result.summary, details: detail.result.details } : null)
      if (detail.payload && detail.kind === 'png') setLastPng(detail.payload)
      if (detail.result) onSendToChat?.({ summary: detail.result.summary ?? '', details: detail.result.details, image: detail.payload?.toString?.() })
      setBusy(false)
    }
    document.addEventListener('tldraw:analysis:done', handler as EventListener)
    return () => document.removeEventListener('tldraw:analysis:done', handler as EventListener)
  }, [onSendToChat])

  const triggerExportPng = useCallback(() => {
    setBusy(true)
    document.dispatchEvent(new CustomEvent('tldraw:export:png'))
  }, [])

  const triggerExportJson = useCallback(() => {
    setBusy(true)
    document.dispatchEvent(new CustomEvent('tldraw:export:json'))
  }, [])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="p-0 h-[85vh]">
        <DrawerHeader className="flex items-center justify-between pr-3">
          <DrawerTitle>✏️ Dibuja tu idea</DrawerTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Auto-IA</span>
              <Switch checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />
            </div>
            <Button size="sm" variant="outline" onClick={triggerExportJson} disabled={busy}>{busy ? "Analizando…" : "Analizar ahora"}</Button>
            <Button size="sm" variant="outline" onClick={triggerExportPng} disabled={busy}>{busy ? "Analizando…" : "Analizar (PNG)"}</Button>
            <DrawerClose asChild>
              <Button size="sm" variant="ghost">Cerrar</Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        <div className="h-[calc(85vh-56px)] grid grid-cols-1 md:grid-cols-2">
          <div className="relative border-r">
            {/* Modern editor */}
            <div className="p-3 h-full">
              <TldrawWrapper autosave={autoAnalyze} autosaveDebounce={1200} />
            </div>
          </div>
          {/* Right panel */}
          <div className={`flex flex-col ${panelOpen ? '' : 'hidden md:flex'} bg-muted/20`}>
            <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
              <div className="font-medium">Respuesta del agente</div>
              <button
                onClick={() => setPanelOpen((v) => !v)}
                className="text-xs rounded border px-2 py-1 hover:bg-accent"
              >{panelOpen ? 'Ocultar' : 'Mostrar'}</button>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {!analysis && (
                <div className="text-xs text-muted-foreground">Dibuja algo y espera la respuesta del agente aquí.</div>
              )}
              {lastPng && (
                <img src={lastPng} alt="boceto" className="max-h-40 rounded border bg-background" />
              )}
              {analysis?.summary && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{analysis.summary}</p>
                </div>
              )}
              {analysis?.details && (
                <pre className="text-[11px] bg-background border rounded p-2 overflow-auto max-h-48">{JSON.stringify(analysis.details, null, 2)}</pre>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

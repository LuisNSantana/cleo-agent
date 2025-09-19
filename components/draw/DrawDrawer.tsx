"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import TldrawWrapper from "./TldrawWrapper"

export function DrawDrawer({ open, onOpenChange, onSendToChat }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSendToChat?: (analysis: { summary: string; details?: any, image?: string }) => void
}) {
  const [busy, setBusy] = useState(false)
  const [autoAnalyze, setAutoAnalyze] = useState(true)
  const [analysis, setAnalysis] = useState<{ summary: string; details?: any } | null>(null)
  // Panel cerrado por defecto en móvil para maximizar espacio de dibujo
  const [panelOpen, setPanelOpen] = useState(false)

  const [lastPng, setLastPng] = useState<string | null>(null)

  // Detectar si es móvil para ajustar UI inicial
  useEffect(() => {
    const isMobile = window.innerWidth <= 768
    setPanelOpen(!isMobile) // Solo abierto por defecto en desktop
  }, [open])

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
      <DrawerContent className="p-0 h-[90vh] md:h-[85vh]">
        {/* Header minimalista para móvil */}
        <DrawerHeader className="flex items-center justify-between px-3 py-2 min-h-[48px] border-b bg-background/95 backdrop-blur">
          <DrawerTitle className="text-lg font-medium">✏️ Dibuja</DrawerTitle>
          <div className="flex items-center gap-2">
            {/* Toggle panel visibility - solo visible en desktop */}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setPanelOpen(!panelOpen)}
              className="hidden md:flex h-8 px-2 text-xs"
            >
              {panelOpen ? '📱' : '📋'}
            </Button>
            {/* Auto-analyze toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground hidden sm:inline">Auto</span>
              <Switch checked={autoAnalyze} onCheckedChange={setAutoAnalyze} className="scale-75" />
            </div>
            {/* Analyze button - más compacto */}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={triggerExportJson} 
              disabled={busy}
              className="h-8 px-2 text-xs"
            >
              {busy ? "⏳" : "🔍"}
            </Button>
            <DrawerClose asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">×</Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        <div className="h-[calc(90vh-48px)] md:h-[calc(85vh-48px)] flex flex-col md:grid md:grid-cols-1 lg:grid-cols-2 relative">
          {/* Canvas area - maximizada en móvil */}
          <div className="relative flex-1 md:border-r">
            <div className="absolute inset-0" data-vaul-drawer-ignore style={{ 
              touchAction: 'none', 
              WebkitUserSelect: 'none', 
              msTouchAction: 'none',
              userSelect: 'none',
              WebkitTouchCallout: 'none'
            }}>
              <TldrawWrapper autosave={autoAnalyze} autosaveDebounce={1200} />
            </div>
            
            {/* Botón flotante para mostrar panel en móvil */}
            {!panelOpen && (
              <Button
                onClick={() => setPanelOpen(true)}
                className="absolute bottom-4 right-4 md:hidden h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 p-0"
                size="sm"
              >
                📋
              </Button>
            )}
          </div>
          
          {/* Panel derecho - colapsable y optimizado */}
          <div className={`${panelOpen ? 'flex' : 'hidden'} ${panelOpen ? 'h-32 md:h-auto' : ''} flex-col bg-background/50 backdrop-blur border-t md:border-t-0`}>
            {/* Panel header - más compacto */}
            <div className="flex items-center justify-between border-b px-3 py-1.5 min-h-[36px]">
              <div className="text-sm font-medium text-foreground/90">Análisis</div>
              <button
                onClick={() => setPanelOpen(false)}
                className="md:hidden text-xs rounded p-1 hover:bg-accent transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Panel content - scrolleable */}
            <div className="flex-1 overflow-auto p-3 space-y-2 min-h-0">
              {!analysis && (
                <div className="text-xs text-muted-foreground/80">
                  🎨 Dibuja algo para ver el análisis
                </div>
              )}
              
              {lastPng && (
                <div className="relative">
                  <img 
                    src={lastPng} 
                    alt="boceto" 
                    className="max-h-24 md:max-h-32 w-full object-contain rounded border bg-background/80" 
                  />
                </div>
              )}
              
              {analysis?.summary && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{analysis.summary}</p>
                </div>
              )}
              
              {/* Details minimizados */}
              {analysis?.details && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Detalles técnicos
                  </summary>
                  <pre className="mt-2 text-[10px] bg-background/80 border rounded p-2 overflow-auto max-h-24">
                    {JSON.stringify(analysis.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

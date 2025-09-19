"use client"

import { Header } from "@/app/components/layout/header"
import { AppSidebar } from "@/app/components/layout/sidebar/app-sidebar"
import { useUser } from "@/lib/user-store/provider"
import { usePathname } from "next/navigation"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useCanvasEditorStore } from "@/lib/canvas-editor/store"
import { CanvasEditorShell } from "@/components/canvas-editor/canvas-editor-shell"
import { ChatBackground } from "@/app/components/ui/chat-background"
import { useState, useEffect, useCallback } from "react"
import { PencilSimple } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

// Dynamic import to prevent SSR issues with canvas
const InteractiveCanvasEntry = dynamic(
  () => import("@/components/interactive-canvas-entry").then(m => ({ default: m.InteractiveCanvasEntry })),
  { ssr: false }
)

export function LayoutApp({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const pathname = usePathname()
  const { preferences } = useUserPreferences()
  const hasSidebar = preferences.layout === "sidebar"
  const { isOpen, open } = useCanvasEditorStore()
  const [isMobile, setIsMobile] = useState(false)
  const [editorWidth, setEditorWidth] = useState(400)
  const [editorCollapsed, setEditorCollapsed] = useState(false)

  // Resize state for the divider between chat and editor
  const [isResizing, setIsResizing] = useState(false)
  const [chatWidth, setChatWidth] = useState(70) // Percentage of available space

  // Load saved divider position
  useEffect(() => {
    const saved = localStorage.getItem('cleo-layout-chat-width')
    if (saved) {
      setChatWidth(Number(saved))
    }
  }, [])

  // Save divider position when it changes
  useEffect(() => {
    localStorage.setItem('cleo-layout-chat-width', chatWidth.toString())
  }, [chatWidth])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Calculate responsive widths: 70% for editor, 30% for chat when open
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  
  useEffect(() => {
    const updateScreenWidth = () => setScreenWidth(window.innerWidth)
    window.addEventListener('resize', updateScreenWidth)
    return () => window.removeEventListener('resize', updateScreenWidth)
  }, [])

  const calculatedEditorWidth = Math.floor(screenWidth * 0.7) // 70% of screen
  const actualEditorWidth = editorCollapsed ? 60 : (editorWidth || calculatedEditorWidth)

  // LOG: LayoutApp render and children
  if (typeof window !== 'undefined') {
    console.log('[LayoutApp] Rendered. Path:', window.location.pathname);
    console.log('[LayoutApp] Children:', children);
  }

  // Mouse event handlers for the middle divider
  const startDividerResize = useCallback((e: React.MouseEvent) => {
    if (isMobile || !isOpen) return
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }, [isMobile, isOpen])

  const handleDividerMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !isOpen) return
    
    const containerWidth = window.innerWidth - (hasSidebar ? 240 : 0) // Subtract sidebar width if present
    const mouseX = e.clientX - (hasSidebar ? 240 : 0) // Adjust for sidebar
    const newChatWidthPercent = (mouseX / containerWidth) * 100
    
    // Improved constraints: minimum 30% for chat, maximum 75% for chat
    const minChatWidth = 30
    const maxChatWidth = 75
    const constrainedPercent = Math.min(Math.max(newChatWidthPercent, minChatWidth), maxChatWidth)
    setChatWidth(constrainedPercent)
  }, [isResizing, isOpen, hasSidebar])

  const stopDividerResize = useCallback(() => {
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleDividerMove)
      document.addEventListener('mouseup', stopDividerResize)
      return () => {
        document.removeEventListener('mousemove', handleDividerMove)
        document.removeEventListener('mouseup', stopDividerResize)
      }
    }
  }, [isResizing, handleDividerMove, stopDividerResize])

  // Wrapper key basado en pathname para forzar remount de contenido interno
  return (
    <div className="bg-background flex h-dvh w-full overflow-hidden relative">
      {/* Mobile-only static premium background (no video) */}
      <div className="block md:hidden">
        <ChatBackground overlayOpacity={0.9} />
      </div>
      {/* Foreground app chrome */}
      {user?.id && (hasSidebar || isMobile) && (
        <div className="relative z-10">
          <AppSidebar />
        </div>
      )}
      <div className="flex flex-1 h-dvh relative z-10">
        <main 
          className="@container relative h-dvh overflow-y-auto transition-all duration-300 ease-in-out"
          style={{ 
            paddingTop: '56px',
            width: isOpen && !isMobile ? `${chatWidth}%` : '100%'
          }}
        >
          <Header hasSidebar={hasSidebar} />
          <div className="h-full" key={pathname}>
            {children}
          </div>
        </main>
        
        {/* Resize divider between chat and editor */}
        {isOpen && !isMobile && (
          <div
            onMouseDown={startDividerResize}
            className={cn(
              "relative w-1 bg-border cursor-col-resize group hover:bg-primary/60 transition-all z-10 flex items-center justify-center",
              isResizing && "bg-primary w-2"
            )}
            style={{ paddingTop: '56px' }}
            title="Arrastra para ajustar el tamaño del chat y editor"
          >
            <div className="absolute inset-y-0 -left-2 -right-2 group-hover:bg-primary/10 transition-colors" />
            {/* Visual indicator */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-muted-foreground/40 group-hover:bg-primary/80 transition-colors rounded-full" />
            {/* Three dots indicator */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-0.5 h-0.5 bg-primary rounded-full" />
              <div className="w-0.5 h-0.5 bg-primary rounded-full" />
              <div className="w-0.5 h-0.5 bg-primary rounded-full" />
            </div>
          </div>
        )}
        
        {isOpen && (
          <div 
            className="flex-shrink-0 transition-all duration-300 ease-in-out"
            style={{ 
              width: isMobile ? '100%' : `${100 - chatWidth}%`,
              paddingTop: '56px'
            }}
          >
            <CanvasEditorShell 
              onWidthChange={setEditorWidth} 
              onCollapseChange={setEditorCollapsed}
              initialWidth={calculatedEditorWidth}
            />
          </div>
        )}
      </div>
      
      {/* Floating action button for editor (hidden to avoid confusion with Cleo draw) */}
      {/*
      {!isOpen && (
        <button
          onClick={() => open({ text: 'Escribe aquí tu documento largo...\n\n', mode: 'markdown' })}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-primary p-3 text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105"
          title="Abrir Canvas Editor"
        >
          <PencilSimple className="h-5 w-5" />
        </button>
      )}
      */}
      
      {/* Interactive Drawing Canvas */}
      <InteractiveCanvasEntry />
      
      {/* Footer for Google verification compliance */}
      <footer className="fixed bottom-2 left-2 z-40 text-xs text-muted-foreground space-x-3">
        <a 
          href="/privacy" 
          className="hover:text-foreground transition-colors underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
        <a 
          href="/terms" 
          className="hover:text-foreground transition-colors underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms of Service
        </a>
      </footer>
    </div>
  )
}

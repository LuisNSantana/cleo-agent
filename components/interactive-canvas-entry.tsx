"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import { useInteractiveCanvasStore } from '@/lib/interactive-canvas/store'
import { allTools } from '@/lib/interactive-canvas/tools'
import { useChats } from '@/lib/chat-store/chats/provider'
import { useChatSession } from '@/lib/chat-store/session/provider'
import { useUser } from '@/lib/user-store/provider'
import { useUserPreferences } from '@/lib/user-preference-store/provider'
import { ContextAwarePromptGenerator, type DrawingContextType } from '@/lib/canvas/context-aware-prompts'
import { useUserDrawingContext, generateRAGContextHints, DrawingInteractionHistory } from '@/lib/canvas/user-context-integration'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { PencilSimple } from '@phosphor-icons/react'
import dynamic from 'next/dynamic'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

// Dynamic import to prevent SSR issues with Konva
const InteractiveCanvas = dynamic(
  () => import('./interactive-canvas/interactive-canvas').then(m => ({ default: m.InteractiveCanvas })),
  { ssr: false }
)

export function InteractiveCanvasEntry() {
  const [mounted, setMounted] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)

  // Only access the store after mounting
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="fixed bottom-2 right-16 z-40">
        <button
          className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow hover:bg-slate-800 transition-colors"
          title="Open interactive drawing canvas"
        >
          🎨 Draw
        </button>
      </div>
    )
  }

  return <InteractiveCanvasModal mounted={mounted} />
}

function InteractiveCanvasModal({ mounted }: { mounted: boolean }) {
  const canvasRef = React.useRef<any>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { createNewChat } = useChats()
  const { chatId } = useChatSession()
  const { user } = useUser()
  const { preferences } = useUserPreferences()
  const { contextProfile } = useUserDrawingContext()
  const [isLoadingToChat, setIsLoadingToChat] = React.useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const [isSmallScreen, setIsSmallScreen] = React.useState(false)
  const [toolbarCollapsed, setToolbarCollapsed] = React.useState(false)
  const { 
    isOpen, 
    openCanvas, 
    closeCanvas, 
    selectedTool, 
    setSelectedTool, 
    selectedColor, 
    setColor, 
    strokeWidth, 
    setStrokeWidth,
    clearCanvas,
    canvasState,
    setBackgroundColor,
    setBackgroundTemplate
  } = useInteractiveCanvasStore()

  if (!mounted) return null

  const tools = allTools.filter(tool => tool.id !== 'pen')  // Filter out pen tool

  const colors = [
    '#000000', '#FF0000', '#0000FF', '#00AA00',
    '#FFAA00', '#800080', '#808080', '#FFFFFF'
  ]

  const templates = [
    { id: 'none', name: 'Limpio', icon: '📄', pattern: 'none', description: 'Fondo limpio sin líneas' },
    { id: 'lines', name: 'Líneas', icon: '📝', pattern: 'lines', description: 'Líneas horizontales como cuaderno' },
    { id: 'grid', name: 'Cuadros', icon: '📐', pattern: 'grid', description: 'Cuadrícula para matemáticas' }
  ]

  // Función para capturar el canvas como imagen
  const captureCanvas = () => {
    if (!canvasRef.current) return null
    
    try {
      const stage = canvasRef.current.getStage()
      const dataURL = stage.toDataURL({
        pixelRatio: 2, // Para mejor calidad
        mimeType: 'image/png'
      })
      return dataURL
    } catch (error) {
      console.error('Error capturing canvas:', error)
      return null
    }
  }

  // Enhanced function to send drawing to Cleo with intelligent context
  const sendToChat = async (context: string, prompt?: string) => {
    const imageData = captureCanvas()
    if (!imageData) {
      alert('Could not capture the drawing')
      return
    }

    setIsLoadingToChat(true)
    
    try {
      // Analyze drawing context for better prompting
      const drawingContext = ContextAwarePromptGenerator.analyzeDrawingContext(canvasState)
      
      // Generate RAG context hints for better retrieval
      const ragHints = generateRAGContextHints(context, drawingContext)
      
      // Generate intelligent, context-aware message
      const contextualOptions = {
        user,
        preferences,
        userLanguage: contextProfile?.language || 'en',
        drawingContext
      }
      
      let message: string
      if (context === 'custom' && prompt) {
        message = ContextAwarePromptGenerator.generatePrompt('custom', contextualOptions, prompt)
      } else {
        message = ContextAwarePromptGenerator.generateEngagementPrompt(
          context as DrawingContextType, 
          contextualOptions
        )
      }
      
      // Add interaction to history for pattern recognition
      DrawingInteractionHistory.addInteraction(context)

      // Verificar si estamos en un chat existente
      const isInExistingChat = chatId && pathname.includes('/c/')
      
    if (isInExistingChat) {
        // Estamos en un chat existente - enviar la imagen a esta conversación
        console.log('Sending to existing chat:', chatId)
        
        // Guardar mensaje e imagen para envío automático
        localStorage.setItem('pendingCanvasMessage', JSON.stringify({
          message,
          imageFile: imageData,
          backgroundColor: canvasState.backgroundColor,
          backgroundTemplate: canvasState.backgroundTemplate,
          timestamp: Date.now(),
          isForExistingChat: true,
          chatId
        }))
        
        // Mostrar feedback de éxito antes de cerrar
        setShowSuccessMessage(true)
        setTimeout(() => {
          setShowSuccessMessage(false)
          // Cerrar el canvas para que el usuario vea el chat
          closeCanvas()
        }, 1200)
        
        // Solo trigger custom event para notificar que el mensaje está listo
        window.dispatchEvent(new CustomEvent('canvas-message-ready', {
          detail: { chatId }
        }))
        
      } else {
        // No estamos en un chat - crear uno nuevo
        console.log('Creando nuevo chat')
        
        // Verificar que tenemos la función createNewChat
        if (!createNewChat) {
          throw new Error('La función createNewChat no está disponible')
        }

        // Verificar que tenemos un usuario válido
        const effectiveUserId = user?.id
        if (!effectiveUserId) {
          throw new Error('Usuario no autenticado. Por favor inicia sesión.')
        }

        console.log('Creating chat with:', {
          userId: effectiveUserId,
          title: `🎨 Canvas: ${context}`,
          isAuthenticated: !!user
        })

        const newChat = await createNewChat(
          effectiveUserId,
          `🎨 Canvas: ${context === 'custom' ? 'Custom query' : context.charAt(0).toUpperCase() + context.slice(1)}`,
          undefined, // model (default)
          !!user, // isAuthenticated
          `You are Cleo, a creative and fun AI assistant. The user is sharing a drawing they made on an interactive canvas. Analyze the image carefully and respond in a helpful, creative and engaging way. Always maintain a friendly and enthusiastic tone.`
        )

        if (newChat) {
          // Guardar mensaje e imagen para envío automático
          localStorage.setItem('pendingCanvasMessage', JSON.stringify({
            message,
            imageFile: imageData,
            backgroundColor: canvasState.backgroundColor,
            backgroundTemplate: canvasState.backgroundTemplate,
            timestamp: Date.now(),
            isForExistingChat: false,
            chatId: newChat.id
          }))
          
          // Mostrar feedback de éxito antes de navegar
          setShowSuccessMessage(true)
          setTimeout(() => {
            setShowSuccessMessage(false)
            // Navegar al nuevo chat
            router.push(`/c/${newChat.id}`)
            // Cerrar el canvas
            closeCanvas()
          }, 1200)
        } else {
          throw new Error('No se pudo crear el chat')
        }
      }
      
    } catch (error) {
      console.error('Error sending to chat:', error)
      alert('Error al enviar a Cleo. Por favor intenta de nuevo.')
    } finally {
      setIsLoadingToChat(false)
    }
  }

  // Responsive: detect mobile and collapse toolbar by default on phones
  React.useEffect(() => {
    const check = () => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 0
      const height = typeof window !== 'undefined' ? window.innerHeight : 0
      setIsMobile(width < 640)
      setIsSmallScreen(height < 700)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  React.useEffect(() => {
    setToolbarCollapsed(isMobile)
  }, [isMobile])

  return (
    <>
      {/* Floating drawing button - Hidden on mobile to use chat input version */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              animate={showSuccessMessage ? {
                scale: [1, 1.05, 1]
              } : {}}
              transition={{ duration: 0.3, repeat: showSuccessMessage ? 1 : 0 }}
              className={isMobile ? 'hidden' : 'block'}
            >
        <Button
                onClick={openCanvas}
                size="icon"
                className={`
                  fixed right-4 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl shadow-lg border-0 z-[60] flex items-center justify-center p-2 transition-all duration-300
                  ${isSmallScreen ? 'bottom-16' : 'bottom-20'} sm:bottom-20
                  ${showSuccessMessage
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
                    : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/25 ring-1 ring-slate-800/80 dark:ring-slate-700/80'
                  } animate-[pulse_2.4s_ease-in-out_infinite]
                `}
                aria-label="Open Drawing Canvas"
              >
                {showSuccessMessage ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-white text-lg font-bold"
                  >
                    ✓
                  </motion.div>
                ) : (
          <PencilSimple className="h-6 w-6 sm:h-7 sm:w-7 text-white" weight="bold" />
                )}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Open Drawing Canvas</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Side panel canvas */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] md:w-[480px] bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="relative w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center ring-1 ring-slate-800/70">
                  <PencilSimple className="h-4 w-4 text-white" weight="bold" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Drawing Canvas</h3>
                  <p className="text-sm text-muted-foreground">Sketch. Tap the share button to send to chat.</p>
                </div>
              </div>
              <Button
                onClick={closeCanvas}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                ✕
              </Button>
            </div>
            {/* Mobile toolbar toggle */}
            <div className="sm:hidden p-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setToolbarCollapsed((v) => !v)}
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-2 font-medium"
              >
                <span className="text-sm">
                  {toolbarCollapsed ? '🧰' : '🔽'}
                </span>
                <span>
                  {toolbarCollapsed ? 'Tools' : 'Hide Tools'}
                </span>
              </button>
            </div>
            {/* Toolbar */}
            {(!isMobile || !toolbarCollapsed) && (
            <div className="p-2 sm:p-3 border-b border-neutral-200 dark:border-neutral-700 space-y-2 sm:space-y-3 max-h-[40vh] sm:max-h-none overflow-y-auto">
              {/* Tools grid */}
              <div>
                <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Tools</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-2">
                  {tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedTool(tool as any)}
                      className={`
                        p-1 sm:p-2 rounded-md border transition-all text-center text-xs
                        ${selectedTool?.id === tool.id 
                          ? 'border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100' 
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                        }
                      `}
                      title={`${tool.name}${tool.description ? ': ' + tool.description : ''}`}
                    >
                      <div className="text-sm sm:text-lg">{tool.icon}</div>
                      <div className="text-[10px] sm:text-xs leading-tight">{tool.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div>
                <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Colors</div>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setColor(color)}
                      className={`
                        w-5 h-5 sm:w-6 sm:h-6 rounded-md border transition-all
                        ${selectedColor === color 
                          ? 'border-neutral-800 dark:border-neutral-200 ring-1 sm:ring-2 ring-neutral-300 dark:ring-neutral-600' 
                          : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
                        }
                      `}
                      style={{ backgroundColor: color }}
                      title={`Color: ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Background */}
              <div>
                <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Background</div>
                <div className="flex gap-1 sm:gap-2">
                  <button
                    onClick={() => setBackgroundColor('#ffffff')}
                    className={`
                      flex-1 px-2 py-1 rounded-md border transition-all text-xs text-center text-neutral-800 dark:text-neutral-800 font-medium
                      ${canvasState?.backgroundColor === '#ffffff'
                        ? 'border-neutral-800 dark:border-neutral-200 ring-2 ring-blue-500'
                        : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
                      }
                    `}
                    style={{ backgroundColor: '#ffffff' }}
                    title="Light mode"
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setBackgroundColor('#0f172a')}
                    className={`
                      flex-1 px-2 py-1 rounded-md border transition-all text-xs text-center text-white font-medium
                      ${canvasState?.backgroundColor === '#0f172a'
                        ? 'border-white ring-2 ring-blue-500'
                        : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
                      }
                    `}
                    style={{ backgroundColor: '#0f172a' }}
                    title="Dark mode"
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setBackgroundColor('#fdf5e6')}
                    className={`
                      flex-1 px-2 py-1 rounded-md border transition-all text-xs text-center text-neutral-700 dark:text-neutral-700 font-medium
                      ${canvasState?.backgroundColor === '#fdf5e6'
                        ? 'border-neutral-600 dark:border-neutral-600 ring-2 ring-blue-500'
                        : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
                      }
                    `}
                    style={{ backgroundColor: '#fdf5e6' }}
                    title="Note mode"
                  >
                    Nota
                  </button>
                </div>
              </div>

              {/* Templates */}
              <div>
                <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Template</div>
                <div className="flex gap-1 sm:gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setBackgroundTemplate(template.id as 'none' | 'lines' | 'grid')}
                      className={`
                        flex-1 px-2 py-1 rounded-md border transition-all text-xs text-center font-medium
                        ${canvasState?.backgroundTemplate === template.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500'
                          : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-700 dark:text-neutral-300'
                        }
                      `}
                      title={template.description}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stroke & Actions */}
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex-1">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Width: {strokeWidth}px
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <Button
                  onClick={clearCanvas}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950 text-xs px-2"
                >
                  🗑️ <span className="hidden sm:inline">Clear</span>
                </Button>
              </div>

              {/* Share with Cleo (desktop) */}
              <div className="hidden sm:block border-t border-neutral-200 dark:border-neutral-700 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-900 ring-1 ring-slate-800/70">
                    <Image src="/logocleo.png" alt="Cleo" width={14} height={14} className="object-contain brightness-0 invert" />
                  </span>
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Share with Cleo</span>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1 sm:gap-2">
                    <Button
                      onClick={() => sendToChat('analyze')}
                      variant="outline"
                      size="sm"
                      className="text-[10px] sm:text-xs h-8 sm:h-auto px-1 sm:px-2"
                      disabled={isLoadingToChat}
                    >
                      {isLoadingToChat ? '⏳' : '🔍'} <span className="hidden sm:inline">Analyze</span>
                    </Button>
                    <Button
                      onClick={() => sendToChat('play')}
                      variant="outline"
                      size="sm"
                      className="text-[10px] sm:text-xs h-8 sm:h-auto px-1 sm:px-2"
                      disabled={isLoadingToChat}
                    >
                      {isLoadingToChat ? '⏳' : '🎮'} <span className="hidden sm:inline">Play</span>
                    </Button>
                  </div>
                  <Button
                    onClick={() => sendToChat('quick')}
                    variant="default"
                    size="sm"
                    className="w-full text-[10px] sm:text-xs bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 h-8 sm:h-auto"
                    disabled={isLoadingToChat}
                  >
                    {isLoadingToChat ? '⏳ Sending...' : '🎨 Send to Cleo'}
                  </Button>
                  <Button
                    onClick={() => {
                      const customPrompt = prompt('What would you like Cleo to do with your drawing?')
                      if (customPrompt) sendToChat('custom', customPrompt)
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] sm:text-xs h-8 sm:h-auto"
                    disabled={isLoadingToChat}
                  >
                    ✨ Custom
                  </Button>
                </div>
              </div>
            </div>
            )}
            
            {/* Canvas area */}
            <div className="flex-1 relative overflow-hidden bg-white dark:bg-neutral-900">
              {/* Canvas info overlay */}
              {selectedTool && (
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 bg-white/95 dark:bg-neutral-800/95 backdrop-blur px-2 py-1 sm:px-3 sm:py-2 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 text-[10px] sm:text-xs">
                  <div className="font-medium text-neutral-700 dark:text-neutral-300">
                    {selectedTool.icon} {selectedTool.name}
                  </div>
                  {selectedTool.description && (
                    <div className="text-neutral-500 dark:text-neutral-400 mt-1 hidden sm:block">
                      {selectedTool.description}
                    </div>
                  )}
                </div>
              )}
              
              <InteractiveCanvas 
                ref={canvasRef}
                width={typeof window !== 'undefined' ? window.innerWidth < 640 ? Math.min(window.innerWidth - 20, 400) : 500 : 500} 
                height={typeof window !== 'undefined' ? window.innerHeight < 800 ? Math.min(window.innerHeight - 200, 500) : 600 : 600} 
                className="w-full h-full"
              />

              {/* Mobile action bar */}
              <div className="sm:hidden absolute bottom-2 left-2 right-2 z-20">
                <div className="flex gap-2">
                  <Button
                    onClick={() => sendToChat('quick')}
                    variant="default"
                    size="sm"
                    className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                    disabled={isLoadingToChat}
                  >
                    {isLoadingToChat ? '⏳' : '🎨'} Send
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 px-3">More</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => sendToChat('analyze')}>🔍 Analyze</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => sendToChat('play')}>🎮 Play</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const p = prompt('Custom instruction for Cleo'); if (p) sendToChat('custom', p) }}>✨ Custom</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Status bar */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="text-xs text-muted-foreground text-center">
                Strokes: {canvasState.paths.length} | Shapes: {canvasState.shapes.length} | Games: {canvasState.games.length}
              </div>
            </div>

            {/* Success overlay */}
            <AnimatePresence>
              {showSuccessMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                >
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="bg-white dark:bg-neutral-900 rounded-2xl p-6 mx-4 max-w-sm w-full border border-neutral-200 dark:border-neutral-700 shadow-2xl"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5, type: "spring", bounce: 0.5 }}
                        className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center"
                      >
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4, duration: 0.3 }}
                          className="text-white text-2xl"
                        >
                          ✓
                        </motion.span>
                      </motion.div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                        Sent to Cleo! 🎨
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                        Your drawing is being prepared for Cleo. We'll take you to the chat in a moment.
                      </p>
                      <div className="flex justify-center">
                        <div className="flex space-x-2">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                            className="w-2 h-2 bg-neutral-600 dark:bg-neutral-400 rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                            className="w-2 h-2 bg-neutral-700 dark:bg-neutral-300 rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                            className="w-2 h-2 bg-neutral-600 dark:bg-neutral-400 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

"use client"

import { ModelSelector } from "@/components/common/model-selector/base"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { Button } from "@/components/ui/button"
import { getModelInfo } from "@/lib/models"
import { ArrowUpIcon, CircleNotch, ImageSquare, Sparkle, Stop } from "@phosphor-icons/react"
import { useCallback, useMemo, useEffect, useRef, useState, useDeferredValue } from "react"
import { PromptSystem } from "../suggestions/prompt-system"
import { ButtonFileUpload } from "./button-file-upload"
import { ButtonSearch } from "./button-search"
import { FileList } from "./file-list"
import { ImageSuggestions } from "./image-suggestions"
import { isImageFile } from "@/lib/image-utils"
import { usePendingCanvasMessage } from "@/hooks/use-pending-canvas-message"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ChatInputProps = {
  value: string
  onValueChangeAction: (value: string) => void
  onSendAction: () => void
  isSubmitting?: boolean
  hasMessages?: boolean
  files: File[]
  onFileUploadAction: (files: File[]) => void
  onFileRemoveAction: (file: File) => void
  onSuggestionAction: (suggestion: string) => void
  hasSuggestions?: boolean
  onSelectModelAction: (model: string) => void
  selectedModel: string
  isUserAuthenticated: boolean
  stopAction: () => void
  status?: "submitted" | "streaming" | "ready" | "error"
  setEnableSearchAction: (enabled: boolean) => void
  enableSearch: boolean
  placeholder?: string
  onClearPlaceholderAction?: () => void
  onShowPlaceholderAction?: (placeholder: string) => void
  hideModelSelector?: boolean
  onGenerateImageAction?: (prompt: string) => void
}

export function ChatInput({
  value,
  onValueChangeAction,
  onSendAction,
  isSubmitting,
  files,
  onFileUploadAction,
  onFileRemoveAction,
  onSuggestionAction,
  hasSuggestions,
  onSelectModelAction,
  selectedModel,
  isUserAuthenticated,
  stopAction,
  status,
  setEnableSearchAction,
  enableSearch,
  placeholder,
  onClearPlaceholderAction,
  onShowPlaceholderAction,
  hideModelSelector = false,
  onGenerateImageAction,
}: ChatInputProps) {
  const handleValueChange = useCallback((newValue: string) => {
    onValueChangeAction(newValue)
    
    // Clear placeholder when user starts typing
    if (placeholder && newValue && onClearPlaceholderAction) {
      onClearPlaceholderAction()
    }
  }, [onValueChangeAction, placeholder, onClearPlaceholderAction])

  const selectModelConfig = getModelInfo(selectedModel)
  const hasSearchSupport = Boolean(selectModelConfig?.webSearch)
  const isOnlyWhitespace = (text: string) => !/[^\s]/.test(text)
  const [imageMode, setImageMode] = useState(false)

  // Canvas message handling
  const { pendingMessage, consumePendingMessage, hasPendingMessage } = usePendingCanvasMessage()
  const processedMessageRef = useRef<string | null>(null)
  const [isProcessingCanvas, setIsProcessingCanvas] = useState(false)

  // Procesar automáticamente mensajes pendientes del canvas (for instant send)
  useEffect(() => {
    if (hasPendingMessage && pendingMessage && pendingMessage.timestamp) {
      const messageId = `${pendingMessage.timestamp}-${pendingMessage.chatId}`
      
      // Evitar procesar el mismo mensaje dos veces
      if (processedMessageRef.current === messageId) {
        return
      }

      const processCanvasMessage = async () => {
  // ...existing code...
        
        try {
          // Marcar como procesado inmediatamente y mostrar indicador
          processedMessageRef.current = messageId
          setIsProcessingCanvas(true)
          
          // Convertir el data URL a un archivo blob
          const dataURL = pendingMessage.imageFile
          
          // Convertir data URL a blob
          const arr = dataURL.split(',')
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
          const bstr = atob(arr[1])
          let n = bstr.length
          const u8arr = new Uint8Array(n)
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
          }
          const blob = new Blob([u8arr], { type: mime })
          const file = new File([blob], 'canvas-drawing.png', { type: 'image/png' })
          
          // Guardar mensaje antes de consumir
          const messageText = pendingMessage.message
          
          // Consumir el mensaje pendiente primero
          consumePendingMessage()
          
          // Establecer el mensaje primero
          onValueChangeAction(messageText)
          
          // Esperar un tick para que el estado se actualice
          await new Promise(resolve => setTimeout(resolve, 50))
          
          // Agregar el archivo a la lista de archivos
          onFileUploadAction([file])
          
          // Esperar a que React procese completamente los estados
          await new Promise(resolve => setTimeout(resolve, 250))
          
          // Verificar que los archivos se agregaron correctamente antes de enviar
          // ...existing code...
          setIsProcessingCanvas(false)
          onSendAction()
          
        } catch (error) {
          console.error('Error procesando mensaje del canvas:', error)
          setIsProcessingCanvas(false)
          consumePendingMessage() // Limpiar el mensaje incluso si hay error
        }
      }
      
      processCanvasMessage()
    }
  }, [hasPendingMessage, pendingMessage?.timestamp, onValueChangeAction, onFileUploadAction, onSendAction, consumePendingMessage]) // Agregar dependencias necesarias

  const handleSend = useCallback(() => {
    if (imageMode && onGenerateImageAction) {
      if (!isSubmitting && !isOnlyWhitespace(value)) {
        onGenerateImageAction(value)
        setImageMode(false)
      }
      return
    }
    if (isSubmitting) return
    if (status === 'streaming') { stopAction(); return }
    onSendAction()
  }, [imageMode, onGenerateImageAction, isSubmitting, value, status, stopAction, onSendAction])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSubmitting || status === "streaming") {
        e.preventDefault()
        return
      }

      if (e.key === "Enter" && !e.shiftKey) {
        if (isOnlyWhitespace(value)) {
          return
        }

    e.preventDefault()
    if (imageMode && onGenerateImageAction) {
      onGenerateImageAction(value)
      setImageMode(false)
    } else {
      onSendAction()
    }
      }
    },
  [isSubmitting, onSendAction, status, value, imageMode, onGenerateImageAction]
  )

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const hasImageContent = Array.from(items).some((item) =>
        item.type.startsWith("image/")
      )

      if (!isUserAuthenticated && hasImageContent) {
        e.preventDefault()
        return
      }

      if (isUserAuthenticated && hasImageContent) {
        const imageFiles: File[] = []

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (file) {
              const newFile = new File(
                [file],
                `pasted-image-${Date.now()}.${file.type.split("/")[1]}`,
                { type: file.type }
              )
              imageFiles.push(newFile)
            }
          }
        }

        if (imageFiles.length > 0) {
      onFileUploadAction(imageFiles)
        }
      }
      // Text pasting will work by default for everyone
    },
    [isUserAuthenticated, onFileUploadAction]
  )

  // (Removed auto-upgrade multimodal logic to revert to stable behavior)

  useMemo(() => {
    if (!hasSearchSupport && enableSearch) {
      setEnableSearchAction?.(false)
    }
  }, [hasSearchSupport, enableSearch, setEnableSearchAction])

  const deferredValue = useDeferredValue(value)
  const showPromptSystem = hasSuggestions && (!value || value.trim().length === 0)

  return (
    <div className="relative flex w-full flex-col gap-4">
      {showPromptSystem && (
        <PromptSystem
          onValueChangeAction={onValueChangeAction}
          onSuggestionAction={onSuggestionAction}
          onShowPlaceholder={onShowPlaceholderAction}
          value={deferredValue}
        />
      )}
    {/* Transparent container on mobile to avoid tinted background around the input */}
    <div className="order-2 md:order-1 sticky bottom-0 z-40 border-t border-transparent bg-transparent px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+12px)] supports-[backdrop-filter]:bg-transparent">
        <PromptInput
      /* Frosted-glass input: lighter and blurrier on mobile; keep original on md+ */
      className="relative z-10 p-0 pt-1 shadow-lg backdrop-blur-lg bg-white/70 dark:bg-zinc-900/50 ring-1 ring-white/30 dark:ring-white/10 md:bg-popover md:backdrop-blur-xl md:ring-0 md:shadow-xs"
          maxHeight={200}
          value={value}
          onValueChange={handleValueChange}
        >
          <FileList files={files} onFileRemoveAction={onFileRemoveAction} />
          
          {/* Canvas processing indicator */}
          {isProcessingCanvas && (
            <div className="mx-3 my-2 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Preparing your drawing...
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Converting sketch for Cleo
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <ImageSuggestions 
            hasImages={files.some(isImageFile)} 
            onSuggestionAction={onSuggestionAction} 
          />

          {imageMode && (
            <div className="mx-3 mb-2 flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50/80 px-3 py-2 text-xs text-purple-700 shadow-sm dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
              <Sparkle className="mt-0.5 size-4 flex-shrink-0" weight="fill" />
              <div className="flex-1 leading-snug">
                <span className="block text-sm font-semibold">Modo imagen activado</span>
                Describe la escena, estilo o iluminación y Cleo la generará con FLUX Pro. Si falla, se intentará automáticamente con OpenAI gpt-image-1.
              </div>
            </div>
          )}
          
          <PromptInputTextarea
            placeholder={imageMode ? "Describe la imagen que quieres generar (estilo, iluminación, composición)..." : (placeholder || "Ask Cleo...")}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={status === "streaming"}
            className="min-h-[44px] pt-3 pl-4 pr-4 text-[15px] leading-[1.4] placeholder:text-muted-foreground/60"
          />
          <PromptInputActions className="mt-5 w-full justify-between px-3 pb-3">
            <div className="flex gap-2 items-center">
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={imageMode ? 'secondary' : 'ghost'}
                      className="size-9 p-0 rounded-full hover:bg-muted/80 transition-all duration-200"
                      type="button"
                      aria-label="Toggle image generation mode"
                      aria-pressed={imageMode}
                      onClick={() => setImageMode((mode) => !mode)}
                    >
                      <ImageSquare className="size-[18px]" weight={imageMode ? "fill" : "duotone"} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {imageMode
                      ? "Modo imagen activo"
                      : "Generar imagen con IA"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {imageMode && (
                <div className="hidden md:flex items-center gap-1.5 rounded-full border border-purple-200/60 bg-purple-50/60 dark:bg-purple-900/20 px-2.5 py-1 text-[11px] font-medium text-purple-700 dark:text-purple-300 backdrop-blur-sm">
                  <Sparkle className="size-3.5" weight="fill" />
                  <span>Imagen</span>
                </div>
              )}
              <ButtonFileUpload
                onFileUploadAction={onFileUploadAction}
                isUserAuthenticated={isUserAuthenticated}
                model={selectedModel}
              />
              {!hideModelSelector && (
                <ModelSelector
                  selectedModelId={selectedModel}
                  setSelectedModelIdAction={onSelectModelAction}
                  isUserAuthenticated={isUserAuthenticated}
                />
              )}
              {hasSearchSupport ? (
                <ButtonSearch
                  isSelected={enableSearch}
                  onToggle={setEnableSearchAction}
                  isAuthenticated={isUserAuthenticated}
                />
              ) : null}
            </div>
            <PromptInputAction
              tooltip={status === "streaming" ? "Detener" : imageMode ? "Generar imagen" : "Enviar"}
            >
              <Button
                size="sm"
                className="size-9 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                disabled={(!value || isOnlyWhitespace(value)) && status !== "streaming"}
                type="button"
                onClick={handleSend}
                aria-label={status === "streaming" ? "Stop" : imageMode ? "Generate image" : "Send message"}
              >
                {status === 'streaming' ? (
                  <Stop className="size-[18px]" weight="fill" />
                ) : imageMode ? (
                  <Sparkle className="size-[18px]" weight="fill" />
                ) : (
                  <ArrowUpIcon className="size-[18px]" weight="bold" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
}

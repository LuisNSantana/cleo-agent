"use client"

import { ModelSelector } from "@/components/common/model-selector/base"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { getModelInfo } from "@/lib/models"
import { ArrowUpIcon, CircleNotch, CirclesFour } from "@phosphor-icons/react"
import { useCallback, useMemo, useEffect, useRef, useState, useDeferredValue } from "react"
import { PromptSystem } from "../suggestions/prompt-system"
import { ButtonFileUpload } from "./button-file-upload"
import { ButtonSearch } from "./button-search"
import { ConnectionStatus } from "./connection-status"
import { FileList } from "./file-list"
import { ImageSuggestions } from "./image-suggestions"
import { isImageFile } from "@/lib/image-utils"
import { usePendingCanvasMessage } from "@/hooks/use-pending-canvas-message"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useInteractiveCanvasStore } from "@/lib/interactive-canvas/store"
import { PencilSimple } from "@phosphor-icons/react"

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
}: ChatInputProps) {
  const selectModelConfig = getModelInfo(selectedModel)
  const hasSearchSupport = Boolean(selectModelConfig?.webSearch)
  const isOnlyWhitespace = (text: string) => !/[^\s]/.test(text)
  const isMobile = useBreakpoint(768)
  const { openCanvas } = useInteractiveCanvasStore()

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
        console.log('Procesando mensaje del canvas en chat-input:', pendingMessage)
        
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
          console.log('Auto-sending canvas message:', messageText, 'Files ready for send')
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
    if (isSubmitting) {
      return
    }

    if (status === "streaming") {
      stopAction()
      return
    }

    onSendAction()
  }, [isSubmitting, onSendAction, status, stopAction])

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
    onSendAction()
      }
    },
  [isSubmitting, onSendAction, status, value]
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

  useMemo(() => {
    if (!hasSearchSupport && enableSearch) {
      setEnableSearchAction?.(false)
    }
  }, [hasSearchSupport, enableSearch, setEnableSearchAction])

  const deferredValue = useDeferredValue(value)
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false)
  const showPromptSystem = hasSuggestions && (!value || value.trim().length === 0)

  return (
    <div className="relative flex w-full flex-col gap-4">
      {showPromptSystem && (
        <PromptSystem
          onValueChangeAction={onValueChangeAction}
          onSuggestionAction={onSuggestionAction}
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
          onValueChange={onValueChangeAction}
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
          <PromptInputTextarea
            placeholder="Ask Cleo"
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={status === "streaming"}
            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
          />
          <PromptInputActions className="mt-5 w-full justify-between px-3 pb-3">
            <div className="flex gap-2">
              <ButtonFileUpload
                onFileUploadAction={onFileUploadAction}
                isUserAuthenticated={isUserAuthenticated}
                model={selectedModel}
              />
              {isUserAuthenticated && <div className="hidden sm:block"><ConnectionStatus /></div>}
              <ModelSelector
                selectedModelId={selectedModel}
                setSelectedModelIdAction={onSelectModelAction}
                isUserAuthenticated={isUserAuthenticated}
              />
              {/* Mobile Draw Button - DISABLED TEMPORARILY */}
              {/* {isMobile && (
                <Button
                  onClick={openCanvas}
                  size="sm"
                  variant="outline"
                  className="size-9 p-0 rounded-full"
                  aria-label="Open Drawing Canvas"
                >
                  <PencilSimple className="size-4" />
                </Button>
              )} */}
              {/* Mobile Integrations Drawer Trigger */}
              {isMobile && isUserAuthenticated && (
                <Drawer open={isIntegrationsOpen} onOpenChange={setIsIntegrationsOpen} direction="bottom">
                  <DrawerTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-9 p-0 rounded-full"
                      aria-label="Service integrations"
                    >
                      <CirclesFour className="size-4" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Integrations</DrawerTitle>
                    </DrawerHeader>
                    <div className="max-h-[70vh] overflow-y-auto">
                      <ConnectionStatus asPanel />
                    </div>
                  </DrawerContent>
                </Drawer>
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
              tooltip={status === "streaming" ? "Stop" : "Send"}
            >
              <Button
                size="sm"
                className="size-9 rounded-full transition-all duration-300 ease-out"
                disabled={(!value || isOnlyWhitespace(value)) && status !== "streaming"}
                type="button"
                onClick={handleSend}
                aria-label={status === "streaming" ? "Stop" : "Send message"}
              >
                {status === "streaming" ? (
                  <CircleNotch className="size-4 animate-spin" />
                ) : (
                  <ArrowUpIcon className="size-4" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
}

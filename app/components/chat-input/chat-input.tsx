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
import { ArrowUpIcon, Stop } from "@phosphor-icons/react"
import { useCallback, useMemo, useEffect, useRef, useState, useDeferredValue } from "react"
import { PromptSystem } from "../suggestions/prompt-system"
import { ButtonFileUpload } from "./button-file-upload"
import { ButtonSearch } from "./button-search"
import { FileList } from "./file-list"
import { ImageSuggestions } from "./image-suggestions"
import { isImageFile } from "@/lib/image-utils"
import { usePendingCanvasMessage } from "@/hooks/use-pending-canvas-message"

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

  // Canvas message handling
  const { pendingMessage, consumePendingMessage, hasPendingMessage } = usePendingCanvasMessage()
  const processedMessageRef = useRef<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
    // Stop streaming - check this FIRST before other conditions
    if (status === 'streaming') {
      stopAction()
      return
    }
    
    // Don't send if already submitting
    if (isSubmitting) {
      return
    }
    
    // Send the message
    onSendAction()
  }, [status, stopAction, isSubmitting, value, onSendAction])

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
      <div
        className="relative order-2 px-2 pb-3 sm:pb-4 md:order-1"
        onClick={() => textareaRef.current?.focus()}
      >
        <PromptInput
          className="bg-popover relative z-10 p-0 pt-1 shadow-xs backdrop-blur-xl"
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
          
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={placeholder || "Ask Cleo..."}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={status === "streaming"}
            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
          />
          <PromptInputActions className="mt-3 w-full justify-between p-2">
            <div className="flex gap-2 items-center">
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
              tooltip={status === "streaming" ? "Stop" : "Send"}
            >
              <Button
                size="sm"
                variant={status === 'streaming' ? 'destructive' : 'default'}
                className="min-w-[44px] min-h-[44px] w-11 h-11 md:size-9 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation glow-primary-hover scale-on-active"
                disabled={(!value || isOnlyWhitespace(value)) && status !== "streaming"}
                type="button"
                onClick={handleSend}
                aria-label={status === "streaming" ? "Stop" : "Send message"}
              >
                {status === 'streaming' ? (
                  <Stop className="size-[18px]" weight="fill" />
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

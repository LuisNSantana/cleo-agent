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
import { ArrowUpIcon, StopIcon, CircleNotch } from "@phosphor-icons/react"
import { useCallback, useMemo, useEffect, useRef, useState } from "react"
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
import Image from "next/image"

type ChatInputProps = {
  value: string
  onValueChange: (value: string) => void
  onSend: () => void
  isSubmitting?: boolean
  hasMessages?: boolean
  files: File[]
  onFileUpload: (files: File[]) => void
  onFileRemove: (file: File) => void
  onSuggestion: (suggestion: string) => void
  hasSuggestions?: boolean
  onSelectModel: (model: string) => void
  selectedModel: string
  isUserAuthenticated: boolean
  stop: () => void
  status?: "submitted" | "streaming" | "ready" | "error"
  setEnableSearch: (enabled: boolean) => void
  enableSearch: boolean
}

export function ChatInput({
  value,
  onValueChange,
  onSend,
  isSubmitting,
  files,
  onFileUpload,
  onFileRemove,
  onSuggestion,
  hasSuggestions,
  onSelectModel,
  selectedModel,
  isUserAuthenticated,
  stop,
  status,
  setEnableSearch,
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
          onValueChange(messageText)
          
          // Esperar un tick para que el estado se actualice
          await new Promise(resolve => setTimeout(resolve, 50))
          
          // Agregar el archivo a la lista de archivos
          onFileUpload([file])
          
          // Esperar a que React procese completamente los estados
          await new Promise(resolve => setTimeout(resolve, 250))
          
          // Verificar que los archivos se agregaron correctamente antes de enviar
          console.log('Auto-sending canvas message:', messageText, 'Files ready for send')
          setIsProcessingCanvas(false)
          onSend()
          
        } catch (error) {
          console.error('Error procesando mensaje del canvas:', error)
          setIsProcessingCanvas(false)
          consumePendingMessage() // Limpiar el mensaje incluso si hay error
        }
      }
      
      processCanvasMessage()
    }
  }, [hasPendingMessage, pendingMessage?.timestamp, onValueChange, onFileUpload, onSend, consumePendingMessage]) // Agregar dependencias necesarias

  const handleSend = useCallback(() => {
    if (isSubmitting) {
      return
    }

    if (status === "streaming") {
      stop()
      return
    }

    onSend()
  }, [isSubmitting, onSend, status, stop])

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
        onSend()
      }
    },
    [isSubmitting, onSend, status, value]
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
          onFileUpload(imageFiles)
        }
      }
      // Text pasting will work by default for everyone
    },
    [isUserAuthenticated, onFileUpload]
  )

  useMemo(() => {
    if (!hasSearchSupport && enableSearch) {
      setEnableSearch?.(false)
    }
  }, [hasSearchSupport, enableSearch, setEnableSearch])

  return (
    <div className="relative flex w-full flex-col gap-4">
      {hasSuggestions && (
        <PromptSystem
          onValueChange={onValueChange}
          onSuggestion={onSuggestion}
          value={value}
        />
      )}
      <div className="relative order-2 px-2 pb-3 sm:pb-4 md:order-1">
        <PromptInput
          className="bg-popover relative z-10 p-0 pt-1 shadow-xs backdrop-blur-xl"
          maxHeight={200}
          value={value}
          onValueChange={onValueChange}
        >
          <FileList files={files} onFileRemove={onFileRemove} />
          
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
            onSuggestion={onSuggestion} 
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
                onFileUpload={onFileUpload}
                isUserAuthenticated={isUserAuthenticated}
                model={selectedModel}
              />
              {isUserAuthenticated && <ConnectionStatus />}
              <ModelSelector
                selectedModelId={selectedModel}
                setSelectedModelId={onSelectModel}
                isUserAuthenticated={isUserAuthenticated}
                className="rounded-full"
              />
              {/* Mobile Draw Button */}
              {isMobile && (
                <Button
                  onClick={openCanvas}
                  size="sm"
                  variant="outline"
                  className="size-9 p-0 rounded-full"
                  aria-label="Open Drawing Canvas"
                >
                  <Image
                    src="/logocleo.png"
                    alt="Draw"
                    width={16}
                    height={16}
                    className="object-contain brightness-0 dark:invert"
                  />
                </Button>
              )}
              {hasSearchSupport ? (
                <ButtonSearch
                  isSelected={enableSearch}
                  onToggle={setEnableSearch}
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

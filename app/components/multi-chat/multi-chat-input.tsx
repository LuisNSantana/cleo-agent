"use client"

import { MultiModelSelector } from "@/components/common/multi-model-selector/base"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { Button } from "@/components/ui/button"
import { ArrowUp, Stop } from "@phosphor-icons/react"
import React, { useCallback } from "react"

type MultiChatInputProps = {
  value: string
  onValueChangeAction: (value: string) => void
  onSendAction: () => void
  isSubmitting?: boolean
  files: File[]
  onFileUploadAction: (files: File[]) => void
  onFileRemoveAction: (file: File) => void
  selectedModelIds: string[]
  onSelectedModelIdsChangeAction: (modelIds: string[]) => void
  isUserAuthenticated: boolean
  stopAction: () => void
  status?: "submitted" | "streaming" | "ready" | "error"
  anyLoading?: boolean
}

export function MultiChatInput({
  value,
  onValueChangeAction,
  onSendAction,
  isSubmitting,
  selectedModelIds,
  onSelectedModelIdsChangeAction,
  stopAction,
  status,
  anyLoading,
}: MultiChatInputProps) {
  const isOnlyWhitespace = (text: string) => !/[^\s]/.test(text)

  const handleSend = useCallback(() => {
    if (isSubmitting || anyLoading) {
      return
    }

    if (status === "streaming") {
      stopAction()
      return
    }

    onSendAction()
  }, [isSubmitting, anyLoading, onSendAction, status, stopAction])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSubmitting || anyLoading) {
        e.preventDefault()
        return
      }

      if (e.key === "Enter" && status === "streaming") {
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
    [isSubmitting, anyLoading, onSendAction, status, value]
  )

  return (
    <div className="relative flex w-full flex-col gap-4">
      <div className="relative order-2 px-2 pb-3 sm:pb-4 md:order-1">
        <PromptInput
          className="bg-popover relative z-10 p-0 pt-1 shadow-xs backdrop-blur-xl"
          maxHeight={200}
          value={value}
          onValueChange={onValueChangeAction}
        >
          <PromptInputTextarea
            placeholder="Ask all selected models..."
            onKeyDown={handleKeyDown}
            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
          />
          <PromptInputActions className="mt-5 w-full justify-between px-3 pb-3">
            <div className="flex gap-2">
              <MultiModelSelector
                selectedModelIds={selectedModelIds}
                setSelectedModelIdsAction={onSelectedModelIdsChangeAction}
              />
            </div>
            <PromptInputAction
              tooltip={status === "streaming" ? "Stop" : "Send"}
            >
              <Button
                size="sm"
                className="size-9 rounded-full transition-all duration-300 ease-out"
                disabled={
                  !value ||
                  isSubmitting ||
                  anyLoading ||
                  isOnlyWhitespace(value) ||
                  selectedModelIds.length === 0
                }
                type="button"
                onClick={handleSend}
                aria-label={status === "streaming" ? "Stop" : "Send message"}
              >
                {status === "streaming" || anyLoading ? (
                  <Stop className="size-4" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
}

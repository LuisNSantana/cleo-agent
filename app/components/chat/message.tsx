"use client"

import type { UIMessage as MessageType } from "ai"
import type { Attachment } from "@/lib/file-handling"
import React, { useCallback } from "react"
import { MessageAssistant } from "./message-assistant"
import { MessageUser } from "./message-user"

type MessageProps = {
  variant: MessageType["role"]
  children: string
  id: string
  attachments?: Attachment[]
  isLast?: boolean
  onDeleteAction: (id: string) => void
  onEditAction: (id: string, newText: string) => void
  onReloadAction: () => void
  hasScrollAnchor?: boolean
  parts?: MessageType["parts"]
  status?: "streaming" | "ready" | "submitted" | "error"
  className?: string
  userMessage?: string // Para detección de archivos
}

export function Message({
  variant,
  children,
  id,
  attachments,
  isLast,
  onDeleteAction,
  onEditAction,
  onReloadAction,
  hasScrollAnchor,
  parts,
  status,
  className,
}: MessageProps) {
  // Remove copied state from here - let each component handle it locally
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(children)
  }, [children])

  if (variant === "user") {
    return (
      <MessageUser
  copied={false} // Always false, let MessageUser handle its own state
  copyToClipboardAction={copyToClipboard}
  onReloadAction={onReloadAction}
  onEditAction={onEditAction}
  onDeleteAction={onDeleteAction}
        id={id}
        hasScrollAnchor={hasScrollAnchor}
        attachments={attachments}
        className={className}
      >
        {children}
      </MessageUser>
    )
  }

  if (variant === "assistant") {
    return (
      <MessageAssistant
  copied={false} // Always false, let MessageAssistant handle its own state
  copyToClipboardAction={copyToClipboard}
  onReloadAction={onReloadAction}
        isLast={isLast}
        hasScrollAnchor={hasScrollAnchor}
        parts={parts}
        status={status}
        className={className}
      >
        {children}
      </MessageAssistant>
    )
  }

  return null
}

"use client"

import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTrigger,
} from "@/components/motion-primitives/morphing-dialog"
import {
  MessageAction,
  MessageActions,
  Message as MessageContainer,
  MessageContent,
} from "@/components/prompt-kit/message"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { Check, Copy, Trash, File, FileText, FilePdf } from "@phosphor-icons/react"
import Image from "next/image"
import { useRef, useState } from "react"
import { AttachmentPreview } from "@/components/chat/attachment-preview"
import { useAttachmentProcessing } from "@/hooks/use-attachment-processing"



type Attachment = {
  name: string
  contentType: string
  url: string
}

export type MessageUserProps = {
  hasScrollAnchor?: boolean
  attachments?: Attachment[]
  children: string | Array<{ type: string; text?: string; mediaType?: string; url?: string }>
  copied: boolean
  copyToClipboardAction: () => void
  onEditAction: (id: string, newText: string) => void
  onReloadAction: () => void
  onDeleteAction: (id: string) => void
  id: string
  className?: string
}

export function MessageUser({
  hasScrollAnchor,
  attachments,
  children,
  copied,
  copyToClipboardAction,
  onEditAction,
  onReloadAction,
  onDeleteAction,
  id,
  className,
}: MessageUserProps) {
  const [isEditing, setIsEditing] = useState(false)
  const processedAttachments = useAttachmentProcessing(attachments)

  // Extract text content from multimodal or string content
  const getTextContent = (content: typeof children): string => {
    if (typeof content === 'string') {
      return content
    }
    // For multimodal content, extract text parts and preserve original text
    const textParts = content
      .filter(part => part.type === 'text')
      .map(part => part.text || '')
    
    // Return the first text part only (the original user input)
    const result = textParts[0] || ''
    return result
  }

  // Extract image parts from multimodal content
  const getImageParts = (content: typeof children) => {
    if (typeof content === 'string') {
      return []
    }
    return content.filter(part => part.type === 'file' && part.mediaType?.startsWith('image/'))
  }

  const textContent = getTextContent(children)
  const imageParts = getImageParts(children)
  const [editInput, setEditInput] = useState(textContent)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditInput(textContent)
  }

  const handleSave = () => {
    if (onEditAction) {
      onEditAction(id, editInput)
    }
    onReloadAction()
    setIsEditing(false)
  }

  const handleDelete = () => {
  onDeleteAction(id)
  }

  return (
    <MessageContainer
      className={cn(
        "group flex w-full max-w-3xl flex-col items-end gap-0.5 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor",
        className
      )}
    >
      {processedAttachments?.map((attachment, index) => {
        const processedAttachment = processedAttachments[index]
        
        return (
          <div
            className="flex flex-row gap-2"
            key={`${attachment.name}-${index}`}
          >
            {attachment.contentType?.startsWith("image") ? (
              <MorphingDialog
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 18,
                  mass: 0.3,
                }}
              >
                <MorphingDialogTrigger className="z-10">
                  <Image
                    className="mb-1 w-40 rounded-md"
                    key={attachment.name}
                    src={attachment.url}
                    alt={attachment.name || "Attachment"}
                    width={160}
                    height={120}
                  />
                </MorphingDialogTrigger>
                <MorphingDialogContainer>
                  <MorphingDialogContent className="relative rounded-lg">
                    <MorphingDialogImage
                      src={attachment.url}
                      alt={attachment.name || ""}
                      className="max-h-[90vh] max-w-[90vw] object-contain"
                    />
                  </MorphingDialogContent>
                  <MorphingDialogClose className="text-primary" />
                </MorphingDialogContainer>
              </MorphingDialog>
            ) : (
              // Use the new AttachmentPreview component for documents
              <AttachmentPreview
                attachment={attachment}
                processedContent={processedAttachment?.processedContent}
              />
            )}
          </div>
        )
      })}
      {isEditing ? (
        <div
          className="bg-accent relative flex min-w-[180px] flex-col gap-2 rounded-3xl px-5 py-2.5"
          style={{
            width: contentRef.current?.offsetWidth,
          }}
        >
          <textarea
            className="w-full resize-none bg-transparent outline-none"
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSave()
              }
              if (e.key === "Escape") {
                handleEditCancel()
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Render images from multimodal content */}
          {imageParts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {imageParts.map((imagePart, index) => (
                <MorphingDialog
                  key={index}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 18,
                    mass: 0.3,
                  }}
                >
                  <MorphingDialogTrigger className="z-10">
                    <Image
                      className="mb-1 w-40 rounded-md"
                      src={imagePart.url || ''}
                      alt={`Image ${index + 1}`}
                      width={160}
                      height={120}
                    />
                  </MorphingDialogTrigger>
                  <MorphingDialogContainer>
                    <MorphingDialogContent className="relative rounded-lg">
                      <MorphingDialogImage
                        src={imagePart.url || ''}
                        alt={`Image ${index + 1}`}
                        className="max-h-[90vh] max-w-[90vw] object-contain"
                      />
                    </MorphingDialogContent>
                    <MorphingDialogClose className="text-primary" />
                  </MorphingDialogContainer>
                </MorphingDialog>
              ))}
            </div>
          )}
          
          {/* Render text content */}
          <MessageContent
            className="relative max-w-[72%] rounded-3xl px-4 py-2 text-stone-900 dark:text-stone-100 shadow-[0_4px_14px_-10px_rgba(0,0,0,0.28)] ring-0 backdrop-blur-0 border bg-gradient-to-b from-amber-50/95 to-stone-50/95 dark:bg-gradient-to-b dark:from-stone-800/70 dark:to-stone-700/60 border-amber-100/70 dark:border-stone-600/60"
            markdown={false}
            ref={contentRef}
          >
            {textContent}
          </MessageContent>
        </>
      )}
      <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-0 group-hover:opacity-100">
        <MessageAction tooltip={copied ? "Copied!" : "Copy text"} side="bottom">
          <button
            className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Copy text"
            onClick={copyToClipboardAction}
            type="button"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </MessageAction>
        {/* @todo: add when ready */}
        {/* <MessageAction
          tooltip={isEditing ? "Save" : "Edit"}
          side="bottom"
          delayDuration={0}
        >
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Edit"
            onClick={() => setIsEditing(!isEditing)}
            type="button"
          >
            <PencilSimple className="size-4" />
          </button>
        </MessageAction> */}
        <MessageAction tooltip="Delete" side="bottom">
          <button
            className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Delete"
            onClick={handleDelete}
            type="button"
          >
            <Trash className="size-4" />
          </button>
        </MessageAction>
      </MessageActions>
    </MessageContainer>
  )
}

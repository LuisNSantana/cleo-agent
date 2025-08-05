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
  copyToClipboard: () => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  onDelete: (id: string) => void
  id: string
  className?: string
}

export function MessageUser({
  hasScrollAnchor,
  attachments,
  children,
  copied,
  copyToClipboard,
  onEdit,
  onReload,
  onDelete,
  id,
  className,
}: MessageUserProps) {
  const [isEditing, setIsEditing] = useState(false)

  // Extract text content from multimodal or string content
  const getTextContent = (content: typeof children): string => {
    if (typeof content === 'string') {
      return content
    }
    // For multimodal content, extract text parts
    return content
      .filter(part => part.type === 'text')
      .map(part => part.text || '')
      .join(' ')
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
    if (onEdit) {
      onEdit(id, editInput)
    }
    onReload()
    setIsEditing(false)
  }

  const handleDelete = () => {
    onDelete(id)
  }

  return (
    <MessageContainer
      className={cn(
        "group flex w-full max-w-3xl flex-col items-end gap-0.5 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor",
        className
      )}
    >
      {attachments?.map((attachment: Attachment, index: number) => (
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
            // Display document with appropriate icon and name
            <div className="mb-3 flex h-16 w-40 items-center gap-2 rounded-md border p-2 text-xs">
              <div className="flex-shrink-0">
                {attachment.contentType?.includes('pdf') ? (
                  <FilePdf className="size-6 text-red-500" />
                ) : attachment.contentType?.startsWith('text') ? (
                  <FileText className="size-6 text-blue-500" />
                ) : (
                  <File className="size-6 text-gray-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{attachment.name}</div>
                <div className="text-muted-foreground text-xs">
                  {attachment.contentType?.split('/')[1]?.toUpperCase() || 'FILE'}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
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
        <div className="flex flex-col gap-2">
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
            className="bg-accent relative max-w-[70%] rounded-3xl px-5 py-2.5"
            markdown={true}
            ref={contentRef}
            components={{
              code: ({ children }) => <>{children}</>,
              pre: ({ children }) => <>{children}</>,
              h1: ({ children }) => <p>{children}</p>,
              h2: ({ children }) => <p>{children}</p>,
              h3: ({ children }) => <p>{children}</p>,
              h4: ({ children }) => <p>{children}</p>,
              h5: ({ children }) => <p>{children}</p>,
              h6: ({ children }) => <p>{children}</p>,
              p: ({ children }) => <p>{children}</p>,
              li: ({ children }) => <p>- {children}</p>,
              ul: ({ children }) => <>{children}</>,
              ol: ({ children }) => <>{children}</>,
            }}
          >
            {textContent}
          </MessageContent>
        </div>
      )}
      <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-0 group-hover:opacity-100">
        <MessageAction tooltip={copied ? "Copied!" : "Copy text"} side="bottom">
          <button
            className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Copy text"
            onClick={copyToClipboard}
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

import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from "@/components/prompt-kit/file-upload"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getModelInfo } from "@/lib/models"
import { isSupabaseEnabled } from "@/lib/supabase/config"
import { cn } from "@/lib/utils"
import { FileArrowUp, Paperclip } from "@phosphor-icons/react"
import React from "react"
import { toast } from "@/components/ui/toast"
import { MAX_ATTACHMENTS_PER_MESSAGE } from "@/lib/config"
import { PopoverContentAuth } from "./popover-content-auth"

type ButtonFileUploadProps = {
  onFileUploadAction: (files: File[]) => void
  isUserAuthenticated: boolean
  model: string
}

export function ButtonFileUpload({
  onFileUploadAction,
  isUserAuthenticated,
  model,
}: ButtonFileUploadProps) {
  if (!isSupabaseEnabled) {
    return null
  }

  const isFileUploadAvailable = getModelInfo(model)?.vision

  if (!isFileUploadAvailable) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className="border-border dark:bg-secondary size-9 rounded-full border bg-transparent opacity-50"
            type="button"
            aria-label="Add files (disabled: no vision support)"
            disabled
          >
            <Paperclip className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          This model does not support file uploads
        </TooltipContent>
      </Tooltip>
    )
  }

  if (!isUserAuthenticated) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="border-border dark:bg-secondary size-9 rounded-full border bg-transparent"
                type="button"
                aria-label="Add files"
              >
                <Paperclip className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Add files</TooltipContent>
        </Tooltip>
        <PopoverContentAuth />
      </Popover>
    )
  }

  const handleFilesAdded = (files: File[]) => {
    if (!Array.isArray(files) || files.length === 0) return
    if (files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      toast({
        title: `Máximo ${MAX_ATTACHMENTS_PER_MESSAGE} archivos por mensaje`,
        description: `Se adjuntarán solo los primeros ${MAX_ATTACHMENTS_PER_MESSAGE}.`,
        status: "info",
      })
    }
    onFileUploadAction(files.slice(0, MAX_ATTACHMENTS_PER_MESSAGE))
  }

  return (
    <FileUpload
  onFilesAdded={handleFilesAdded}
      multiple
      disabled={!isUserAuthenticated}
      accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/rtf,text/plain,text/markdown,application/json,text/csv,image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/heic,image/heif"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <FileUploadTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className={cn(
                "border-border dark:bg-secondary size-9 rounded-full border bg-transparent",
                !isUserAuthenticated && "opacity-50"
              )}
              type="button"
              disabled={!isUserAuthenticated}
              aria-label="Add files"
            >
              <Paperclip className="size-4" />
            </Button>
          </FileUploadTrigger>
        </TooltipTrigger>
        <TooltipContent>Add files</TooltipContent>
      </Tooltip>
      <FileUploadContent>
        <div className="border-input bg-background flex flex-col items-center rounded-lg border border-dashed p-8">
          <FileArrowUp className="text-muted-foreground size-8" />
          <span className="mt-4 mb-1 text-lg font-medium">Drop files here</span>
          <span className="text-muted-foreground text-sm">
            Drop any files here to add it to the conversation
          </span>
        </div>
      </FileUploadContent>
    </FileUpload>
  )
}

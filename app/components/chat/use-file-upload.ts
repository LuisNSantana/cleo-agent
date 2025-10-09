import { toast } from "@/components/ui/toast"
import {
  Attachment,
  checkFileUploadLimit,
  processFiles,
} from "@/lib/file-handling"
import { useCallback, useState } from "react"
import { MAX_ATTACHMENTS_PER_MESSAGE } from "@/lib/config"

export const useFileUpload = () => {
  const [files, setFiles] = useState<File[]>([])

  const handleFileUploads = async (
    uid: string,
    chatId: string
  ): Promise<Attachment[] | null> => {
    if (files.length === 0) return []

    try {
      await checkFileUploadLimit(uid)
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      if (error.code === "DAILY_FILE_LIMIT_REACHED") {
        toast({ title: error.message || "Daily file limit reached", status: "error" })
        return null
      }
    }

    try {
      const processed = await processFiles(files, chatId, uid)
      setFiles([])
      return processed
    } catch {
      toast({ title: "Failed to process files", status: "error" })
      return null
    }
  }

  const createOptimisticAttachments = (files: File[]) => {
    return files.map((file) => ({
      name: file.name,
      contentType: file.type,
      url: URL.createObjectURL(file), // Create URL for all file types
    }))
  }

  const cleanupOptimisticAttachments = (attachments?: Array<{ url?: string }>) => {
    if (!attachments) return
    attachments.forEach((attachment) => {
      if (attachment.url?.startsWith("blob:")) {
        URL.revokeObjectURL(attachment.url)
      }
    })
  }

  const handleFileUpload = useCallback((newFiles: File[]) => {
    setFiles((prev) => {
      const combined = [...prev, ...newFiles]
      if (combined.length > MAX_ATTACHMENTS_PER_MESSAGE) {
        toast({
          title: `Máximo ${MAX_ATTACHMENTS_PER_MESSAGE} archivos por mensaje`,
          description: `Se conservarán los primeros ${MAX_ATTACHMENTS_PER_MESSAGE}.`,
          status: "info",
        })
      }
      return combined.slice(0, MAX_ATTACHMENTS_PER_MESSAGE)
    })
  }, [])

  const handleFileRemove = useCallback((file: File) => {
    setFiles((prev) => prev.filter((f) => f !== file))
  }, [])

  return {
    files,
    setFiles,
    handleFileUploads,
    createOptimisticAttachments,
    cleanupOptimisticAttachments,
    handleFileUpload,
    handleFileRemove,
  }
}

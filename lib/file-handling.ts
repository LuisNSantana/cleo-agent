import { toast } from "@/components/ui/toast"
import { SupabaseClient } from "@supabase/supabase-js"
import * as fileType from "file-type"
import { DAILY_FILE_UPLOAD_LIMIT } from "./config"
import { createClient } from "./supabase/client"
import { isSupabaseEnabled } from "./supabase/config"

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

const ALLOWED_FILE_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  // Documents
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  // Microsoft Office
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  // Rich Text
  "application/rtf", // .rtf
  "text/rtf", // .rtf alternative
  // Generic binary (for files with unknown MIME types)
  "application/octet-stream",
]

export type Attachment = {
  name: string
  contentType: string
  url: string
}

export async function validateFile(
  file: File
): Promise<{ isValid: boolean; error?: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    }
  }

  // First check the file's reported MIME type (for text files)
  if (ALLOWED_FILE_TYPES.includes(file.type)) {
    return { isValid: true }
  }

  // For files without clear MIME types, check by extension
  const fileName = file.name.toLowerCase()
  const textFileExtensions = [".txt", ".md", ".csv", ".json", ".rtf"]
  const documentExtensions = [
    ".doc",
    ".docx",
    ".pdf",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
  ]
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".heic",
    ".heif",
  ]
  const hasTextExtension = textFileExtensions.some((ext) =>
    fileName.endsWith(ext)
  )
  const hasDocumentExtension = documentExtensions.some((ext) =>
    fileName.endsWith(ext)
  )
  const hasImageExtension = imageExtensions.some((ext) =>
    fileName.endsWith(ext)
  )

  if (hasTextExtension) {
    // Validate it's actually text by checking if it's readable as text
    try {
      const buffer = await file.arrayBuffer()
      const text = new TextDecoder("utf-8").decode(buffer.slice(0, 1000))
      // If we can decode it as text and it doesn't contain null bytes, it's likely text
      if (text && !text.includes("\0")) {
        return { isValid: true }
      }
    } catch {
      // If text decoding fails, fall through to binary validation
    }
  }

  // Allow common document formats by extension
  if (hasDocumentExtension) {
    return { isValid: true }
  }

  // Allow common image formats by extension
  if (hasImageExtension) {
    return { isValid: true }
  }

  // For binary files, use file-type detection
  const buffer = await file.arrayBuffer()
  const type = await fileType.fileTypeFromBuffer(
    Buffer.from(buffer.slice(0, 4100))
  )

  if (!type || !ALLOWED_FILE_TYPES.includes(type.mime)) {
    return {
      isValid: false,
      error: `File type not supported. Supported types: images (jpg, png, gif, webp, svg, heic, heif), documents (pdf, doc, docx, txt, md, rtf, csv, json), spreadsheets (xls, xlsx), presentations (ppt, pptx)`,
    }
  }

  return { isValid: true }
}

export async function uploadFile(
  supabase: SupabaseClient,
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop()
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `uploads/${fileName}`

  const { error } = await supabase.storage
    .from("chat-attachments")
    .upload(filePath, file)

  if (error) {
    throw new Error(`Error uploading file: ${error.message}`)
  }

  // Always try to return a signed URL so private buckets work out of the box.
  const { data: signedData, error: signedError } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrl(filePath, 60 * 60 * 24 * 30) // 30 días

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("chat-attachments").getPublicUrl(filePath)

  return publicUrl
}

// Normalize MIME type based on file extension
function normalizeMimeType(file: File): string {
  const fileName = file.name.toLowerCase()

  // If the file already has a proper MIME type, use it
  if (file.type && file.type !== "application/octet-stream") {
    return file.type
  }

  // Map extensions to proper MIME types
  const extensionToMime: Record<string, string> = {
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".json": "application/json",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".rtf": "application/rtf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  }

  for (const [ext, mime] of Object.entries(extensionToMime)) {
    if (fileName.endsWith(ext)) {
      return mime
    }
  }

  // Fallback to original type
  return file.type || "application/octet-stream"
}

export function createAttachment(file: File, url: string): Attachment {
  return {
    name: file.name,
    contentType: normalizeMimeType(file),
    url,
  }
}

export async function processFiles(
  files: File[],
  chatId: string,
  userId: string
): Promise<Attachment[]> {
  const supabase = isSupabaseEnabled ? createClient() : null
  const attachments: Attachment[] = []

  for (const file of files) {
    const validation = await validateFile(file)
    if (!validation.isValid) {
      console.warn(`File ${file.name} validation failed:`, validation.error)
      toast({
        title: "File validation failed",
        description: validation.error,
        status: "error",
      })
      continue
    }

    try {
      let url: string

      if (supabase) {
        // Use Supabase storage when available
        url = await uploadFile(supabase, file)

        const { error } = await supabase.from("chat_attachments").insert({
          chat_id: chatId,
          user_id: userId,
          file_url: url,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        })

        if (error) {
          throw new Error(`Database insertion failed: ${error.message}`)
        }
      } else {
        // For local processing without Supabase, create data URL for document analysis
        url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        console.log(
          `[FILE-HANDLING] Created data URL for ${file.name} (${file.type}) - ${(file.size / 1024).toFixed(1)}KB`
        )
      }

      attachments.push(createAttachment(file, url))
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
    }
  }

  return attachments
}

export class FileUploadLimitError extends Error {
  code: string
  constructor(message: string) {
    super(message)
    this.code = "DAILY_FILE_LIMIT_REACHED"
  }
}

export async function checkFileUploadLimit(userId: string) {
  if (!isSupabaseEnabled) return 0

  const supabase = createClient()

  if (!supabase) {
    toast({
      title: "File upload is not supported in this deployment",
      status: "info",
    })
    return 0
  }

  const now = new Date()
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )

  const { count, error } = await supabase
    .from("chat_attachments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfToday.toISOString())

  if (error) throw new Error(error.message)
  if (count && count >= DAILY_FILE_UPLOAD_LIMIT) {
    throw new FileUploadLimitError("Daily file upload limit reached.")
  }

  return count
}

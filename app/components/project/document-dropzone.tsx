"use client"

import { Upload, X } from "lucide-react"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/toast"

interface DocumentDropzoneProps {
  onUpload: (files: File[]) => Promise<void>
  isUploading: boolean
  className?: string
}

export function DocumentDropzone({ onUpload, isUploading, className }: DocumentDropzoneProps) {
  const [files, setFiles] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
    multiple: true
  })

  const removeFile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (files.length === 0) return
    
    try {
      await onUpload(files)
      setFiles([]) // Clear files after successful upload
    } catch (error) {
      // Error handling is usually done in the parent or onUpload function
      console.error("Upload failed", error)
    }
  }

  return (
    <div className={cn("grid gap-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:bg-muted/50 cursor-pointer",
          isDragActive && "border-primary bg-primary/5",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        
        {isDragActive ? (
          <p className="text-sm font-medium">Drop files here...</p>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium">Drag & drop files here</p>
            <p className="text-xs text-muted-foreground">
              or click to browse
            </p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate max-w-[180px] font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  onClick={(e) => removeFile(e, i)}
                  className="text-muted-foreground hover:text-foreground"
                  disabled={isUploading}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}

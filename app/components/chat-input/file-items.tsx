"use client"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { X } from "@phosphor-icons/react"
import Image from "next/image"
import { useState, useMemo, useEffect } from "react"

type FileItemProps = {
  file: File
  onRemove: (file: File) => void
}

export function FileItem({ file, onRemove }: FileItemProps) {
  const [isRemoving, setIsRemoving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Detectar si es un dibujo del canvas
  const isCanvasDrawing = file.name === 'canvas-drawing.png'

  // PERFORMANCE FIX: Cache the object URL to prevent re-creation on every render
  // This fixes the slow typing issue when images are attached
  const imageUrl = useMemo(() => {
    if (file.type.includes("image")) {
      return URL.createObjectURL(file)
    }
    return null
  }, [file])

  // Cleanup object URL when component unmounts or file changes to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  const handleRemove = () => {
    setIsRemoving(true)
    onRemove(file)
  }


  return (
    <div className="relative mr-2 mb-0 flex items-center">
      <HoverCard
        open={file.type.includes("image") ? isOpen : false}
        onOpenChange={setIsOpen}
      >
        <HoverCardTrigger className="w-full">
          <div className={`
            flex w-full items-center gap-3 rounded-xl border p-2.5 pr-3 transition-all duration-200
            ${isCanvasDrawing 
              ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm' 
              : 'bg-background hover:bg-accent border-input'
            }
          `}>
            <div className={`
              flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg relative
              ${isCanvasDrawing 
                ? 'bg-slate-100 dark:bg-slate-700/50 ring-1 ring-slate-200 dark:ring-slate-600' 
                : 'bg-accent-foreground'
              }
            `}>
              {file.type.includes("image") && imageUrl ? (
                <>
                  <Image
                    src={imageUrl}
                    alt={file.name}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover rounded-md"
                  />
                  {isCanvasDrawing && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-xs text-gray-400">
                  {file.name.split(".").pop()?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className={`
                truncate text-sm font-medium
                ${isCanvasDrawing ? 'text-slate-700 dark:text-slate-300' : ''}
              `}>
                {isCanvasDrawing ? 'Canvas Drawing' : file.name}
              </span>
              <span className={`
                text-xs
                ${isCanvasDrawing ? 'text-slate-500 dark:text-slate-400' : 'text-gray-500'}
              `}>
                {isCanvasDrawing ? 'Sketch • ' : ''}{(file.size / 1024).toFixed(1)}kB
              </span>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent side="top" className={`
          ${isCanvasDrawing 
            ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900' 
            : ''
          }
        `}>
          <div className="relative">
            {imageUrl && (
              <Image
                src={imageUrl}
                alt={file.name}
                width={200}
                height={200}
                className="h-full w-full object-cover rounded-lg"
              />
            )}
            {isCanvasDrawing && (
              <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                Canvas
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
      {!isRemoving ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleRemove}
              className="border-background absolute top-1 right-1 z-10 inline-flex size-6 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] bg-black text-white shadow-none transition-colors"
              aria-label="Remove file"
            >
              <X className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Remove file</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}

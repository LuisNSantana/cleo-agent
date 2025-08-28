'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { MessageContent } from '@/components/prompt-kit/message'
import { cn } from '@/lib/utils'

interface ResponseModalProps {
  title?: string
  content: string
  onClose: () => void
}

export function ResponseModal({ title = 'Respuesta', content, onClose }: ResponseModalProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-background border border-border rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50">
          <h3 className="text-sm font-semibold truncate pr-4 text-foreground">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
        <div className="p-4 overflow-auto bg-background">
          <MessageContent
            className={cn(
              'prose dark:prose-invert max-w-none text-foreground',
              'prose-h1:scroll-m-20 prose-h1:text-2xl prose-h1:font-semibold',
              'prose-h2:mt-8 prose-h2:scroll-m-20 prose-h2:text-xl prose-h2:mb-3 prose-h2:font-medium',
              'prose-h3:scroll-m-20 prose-h3:text-base prose-h3:font-medium',
              'prose-strong:font-medium prose-table:block prose-table:overflow-y-auto'
            )}
            markdown
          >
            {content}
          </MessageContent>
        </div>
      </div>
    </div>
  )
}

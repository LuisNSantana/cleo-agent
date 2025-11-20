"use client"

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { PromptCopyButton } from './PromptCopyButton'
import { EditablePromptView } from './EditablePromptView'
import { Button } from '@/components/ui/button'

export interface PromptExample {
  category: string
  title: string
  description: string
  prompt: string
  notes?: string
  modelHint?: string
}

const MAX_PREVIEW_LENGTH = 200

export function PromptCard({ ex }: { ex: PromptExample }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showInteractive, setShowInteractive] = useState(false)
  const needsExpansion = ex.prompt.length > MAX_PREVIEW_LENGTH
  
  // Check if prompt has placeholders [LIKE THIS]
  const hasPlaceholders = /\[([^\]]+)\]/.test(ex.prompt)

  return (
    <div className="group relative rounded-lg border bg-gradient-to-br from-muted/30 via-background to-background p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h5 className="text-xs font-semibold tracking-wide text-primary/90">{ex.title}</h5>
        <div className="flex items-center gap-1">
          {hasPlaceholders && !showInteractive && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowInteractive(true)}
              className="h-6 px-2 text-[10px] text-brand-violet hover:text-brand-violet hover:bg-brand-violet/10"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Customize
            </Button>
          )}
          {!showInteractive && <PromptCopyButton text={ex.prompt} />}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">{ex.description}</p>
      
      {showInteractive ? (
        <div className="mb-2">
          <EditablePromptView 
            template={ex.prompt}
            description="Click variables to customize, then copy your personalized prompt"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowInteractive(false)}
            className="mt-2 h-6 text-[10px] text-muted-foreground"
          >
            ← Back to standard view
          </Button>
        </div>
      ) : (
        <>
          <pre className="text-[11px] leading-relaxed font-mono overflow-x-auto rounded bg-background/70 border p-3 mb-2 whitespace-pre-wrap">
            {needsExpansion && !isExpanded
              ? `${ex.prompt.substring(0, MAX_PREVIEW_LENGTH)}...`
              : ex.prompt}
          </pre>
          {needsExpansion && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary mb-2 transition"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show more
                </>
              )}
            </button>
          )}
        </>
      )}
      
      <div className="flex flex-wrap gap-2 items-center">
        <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px] uppercase tracking-wide">{ex.category}</span>
        {ex.modelHint && <span className="rounded bg-secondary/10 text-secondary px-2 py-0.5 text-[10px]">Model: {ex.modelHint}</span>}
        {ex.notes && <span className="text-[10px] text-muted-foreground italic">{ex.notes}</span>}
        {hasPlaceholders && (
          <span className="rounded bg-brand-violet/10 text-brand-violet px-2 py-0.5 text-[10px] flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" />
            Interactive
          </span>
        )}
      </div>
    </div>
  )
}

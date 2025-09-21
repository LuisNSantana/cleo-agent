import React from 'react'
import { PromptCopyButton } from './PromptCopyButton'

export interface PromptExample {
  category: string
  title: string
  description: string
  prompt: string
  notes?: string
  modelHint?: string
}

export function PromptCard({ ex }: { ex: PromptExample }) {
  return (
    <div className="group relative rounded-lg border bg-gradient-to-br from-muted/30 via-background to-background p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h5 className="text-xs font-semibold tracking-wide text-primary/90">{ex.title}</h5>
        <PromptCopyButton text={ex.prompt} />
      </div>
      <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">{ex.description}</p>
      <pre className="text-[11px] leading-relaxed font-mono overflow-x-auto rounded bg-background/70 border p-3 mb-2 whitespace-pre-wrap">{ex.prompt}</pre>
      <div className="flex flex-wrap gap-2 items-center">
        <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px] uppercase tracking-wide">{ex.category}</span>
        {ex.modelHint && <span className="rounded bg-secondary/10 text-secondary px-2 py-0.5 text-[10px]">Model: {ex.modelHint}</span>}
        {ex.notes && <span className="text-[10px] text-muted-foreground italic">{ex.notes}</span>}
      </div>
    </div>
  )
}

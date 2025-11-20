"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { Sparkles, Check, RotateCcw } from 'lucide-react'
import { PromptCopyButton } from './PromptCopyButton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Variable {
  id: string
  placeholder: string
  value: string
  description?: string
}

interface EditablePromptViewProps {
  template: string
  title?: string
  description?: string
  className?: string
}

/**
 * Interactive Editable Prompt Component
 * 
 * This component detects placeholders in prompt templates (e.g., [PLACEHOLDER])
 * and makes them click-to-edit chips. Users can customize prompts inline
 * without leaving the page.
 * 
 * Innovation features:
 * - Auto-detection of bracketed placeholders
 * - Click-to-edit with visual feedback
 * - Real-time preview of customized prompt
 * - One-click reset to original template
 * - Copy personalized version
 */
export function EditablePromptView({ 
  template, 
  title, 
  description,
  className 
}: EditablePromptViewProps) {
  // Parse template and extract variables
  const extractedVariables = useMemo(() => {
    const regex = /\[([^\]]+)\]/g
    const matches: Variable[] = []
    let match
    let idCounter = 0

    while ((match = regex.exec(template)) !== null) {
      const placeholder = match[1]
      // Skip if already added (deduplication)
      if (!matches.find(v => v.placeholder === placeholder)) {
        matches.push({
          id: `var-${idCounter++}`,
          placeholder,
          value: '', // Empty initially - user will fill
          description: inferDescription(placeholder)
        })
      }
    }

    return matches
  }, [template])

  const [variables, setVariables] = useState<Variable[]>(extractedVariables)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Infer helpful descriptions from placeholder text
  function inferDescription(placeholder: string): string {
    const lower = placeholder.toLowerCase()
    if (lower.includes('topic') || lower.includes('subject')) return 'What is this about?'
    if (lower.includes('goal') || lower.includes('objective')) return 'What do you want to achieve?'
    if (lower.includes('audience') || lower.includes('target')) return 'Who is this for?'
    if (lower.includes('context') || lower.includes('background')) return 'Provide background info'
    if (lower.includes('deadline') || lower.includes('timeline')) return 'When is it due?'
    if (lower.includes('tone') || lower.includes('style')) return 'e.g., formal, casual, technical'
    if (lower.includes('paste') || lower.includes('insert')) return 'Paste your content here'
    return 'Click to customize'
  }

  // Update a variable value
  const updateVariable = useCallback((id: string, newValue: string) => {
    setVariables(prev => 
      prev.map(v => v.id === id ? { ...v, value: newValue } : v)
    )
  }, [])

  // Reset all variables to empty
  const resetAll = useCallback(() => {
    setVariables(extractedVariables.map(v => ({ ...v, value: '' })))
  }, [extractedVariables])

  // Generate final prompt with user values
  const finalPrompt = useMemo(() => {
    let result = template
    variables.forEach(variable => {
      const replacement = variable.value || `[${variable.placeholder}]`
      result = result.replace(new RegExp(`\\[${variable.placeholder}\\]`, 'g'), replacement)
    })
    return result
  }, [template, variables])

  const hasCustomizations = variables.some(v => v.value.trim() !== '')
  const allFilled = variables.every(v => v.value.trim() !== '')

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-violet" />
              {title}
            </h4>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Variable Chips */}
      {variables.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Customize variables ({variables.filter(v => v.value).length}/{variables.length} filled)
            </p>
            {hasCustomizations && (
              <Button
                size="sm"
                variant="ghost"
                onClick={resetAll}
                className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {variables.map((variable) => {
              const isEditing = editingId === variable.id
              const isFilled = variable.value.trim() !== ''

              return (
                <div key={variable.id} className="relative">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={variable.value}
                        onChange={(e) => updateVariable(variable.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingId(null)
                          if (e.key === 'Escape') {
                            updateVariable(variable.id, '')
                            setEditingId(null)
                          }
                        }}
                        placeholder={variable.description}
                        className="h-7 px-2 text-xs border border-brand-violet/50 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-brand-violet/20 min-w-[200px]"
                      />
                      <button
                        onClick={() => setEditingId(null)}
                        className="h-7 w-7 flex items-center justify-center rounded-md bg-brand-violet text-white hover:bg-brand-violet/90 transition"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingId(variable.id)}
                      className={cn(
                        "group h-7 px-3 rounded-full text-xs font-medium transition-all",
                        "border hover:shadow-md",
                        isFilled
                          ? "bg-brand-violet/10 border-brand-violet/30 text-brand-violet hover:bg-brand-violet/20"
                          : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:border-brand-violet/30"
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        {isFilled && <Check className="h-3 w-3" />}
                        <span className="max-w-[200px] truncate">
                          {isFilled ? variable.value : variable.placeholder}
                        </span>
                      </span>
                    </button>
                  )}
                  
                  {/* Tooltip */}
                  {!isEditing && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-popover text-popover-foreground text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-border shadow-lg">
                      {variable.description}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Preview
          </p>
          {allFilled && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check className="h-3 w-3" />
              <span>Ready to copy</span>
            </div>
          )}
        </div>
        
        <pre className={cn(
          "text-[11px] leading-relaxed font-mono overflow-x-auto rounded-lg p-4 whitespace-pre-wrap",
          "border transition-colors",
          allFilled
            ? "bg-brand-violet/5 border-brand-violet/30"
            : "bg-muted/30 border-border"
        )}>
          {finalPrompt}
        </pre>

        <div className="flex items-center gap-2">
          <PromptCopyButton 
            text={finalPrompt} 
            className={cn(
              "transition-all",
              allFilled && "ring-2 ring-brand-violet/20"
            )}
          />
          {hasCustomizations && (
            <p className="text-xs text-muted-foreground">
              {allFilled 
                ? "Your personalized prompt is ready!"
                : "Fill all variables to complete customization"
              }
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

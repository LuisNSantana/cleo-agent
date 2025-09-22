"use client"
import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, X, AlertTriangle, Calendar, Mail, Folder, Settings, Trash2, Loader2, ChevronDown, ChevronUp, Hash, AtSign, Link as LinkIcon } from 'lucide-react'
import clsx from 'clsx'

export interface ConfirmationItemPreviewDetail {
  label: string
  value: string
  type?: string
}

export interface ConfirmationItemPreview {
  title?: string
  summary?: string
  details?: ConfirmationItemPreviewDetail[]
  warnings?: string[]
}

export interface ConfirmationItem {
  id: string
  toolName: string
  category: string
  sensitivity: 'low'|'medium'|'high'|'critical'
  undoable: boolean
  preview: ConfirmationItemPreview
  message?: string
  timestamp: string | number
}

interface ConfirmationPanelProps {
  items: ConfirmationItem[]
  onResolve: (id: string, approved: boolean) => Promise<void> | void
  loadingId?: string | null
  minimal?: boolean // forces compact mode
}

const categoryIcon: Record<string, React.ReactNode> = {
  calendarActions: <Calendar className="h-5 w-5" />,
  emailActions: <Mail className="h-5 w-5" />,
  fileActions: <Folder className="h-5 w-5" />,
  socialActions: <Settings className="h-5 w-5" />,
  dataModification: <Settings className="h-5 w-5" />,
  delete: <Trash2 className="h-5 w-5" />
}

const sensitivityColor: Record<string, {border: string; bg: string; chip: string; text: string}> = {
  low: { border: 'border-slate-300 dark:border-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/70', chip: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200', text: 'text-slate-800 dark:text-slate-200' },
  medium: { border: 'border-amber-300 dark:border-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/40', chip: 'bg-amber-200 dark:bg-amber-600 text-amber-900 dark:text-amber-50', text: 'text-amber-900 dark:text-amber-100' },
  high: { border: 'border-orange-400 dark:border-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/40', chip: 'bg-orange-300 dark:bg-orange-700 text-orange-900 dark:text-orange-50', text: 'text-orange-900 dark:text-orange-100' },
  critical: { border: 'border-red-500 dark:border-red-700', bg: 'bg-red-50 dark:bg-red-900/40', chip: 'bg-red-500 dark:bg-red-700 text-white', text: 'text-red-900 dark:text-red-100' }
}

// Utility: strip basic markdown bold/italics and asterisks for compact preview snippets
function sanitizeInline(text?: string) {
  if (!text) return ''
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim()
}

export function ConfirmationPanel({ items, onResolve, loadingId, minimal }: ConfirmationPanelProps) {
  const [index, setIndex] = useState(0)
  const current = items[index]
  const isNarrow = typeof window !== 'undefined' ? window.innerWidth < 520 : false
  const compact = minimal || isNarrow
  const [detailsOpen, setDetailsOpen] = useState<boolean>(true)

  // Derived queue meta
  const queueInfo = useMemo(() => ({ total: items.length, position: index + 1 }), [items.length, index])

  const handleApprove = useCallback(async () => {
    if (!current) return
    await onResolve(current.id, true)
    setIndex(0)
  }, [current, onResolve])

  const handleReject = useCallback(async () => {
    if (!current) return
    await onResolve(current.id, false)
    setIndex(0)
  }, [current, onResolve])

  // Keyboard shortcuts
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (!current) return
      if (e.key === 'Enter') { e.preventDefault(); handleApprove() }
      if (e.key === 'Escape') { e.preventDefault(); handleReject() }
      if (e.key === 'ArrowRight' && queueInfo.total > 1) { setIndex((i) => (i + 1) % queueInfo.total) }
      if (e.key === 'ArrowLeft' && queueInfo.total > 1) { setIndex((i) => (i - 1 + queueInfo.total) % queueInfo.total) }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [current, handleApprove, handleReject, queueInfo.total])

  if (!current) return null

  // Auto‑collapse details on very small screens to save space
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 480) setDetailsOpen(false)
    }
  }, [current?.id])
  const colors = sensitivityColor[current.sensitivity] || sensitivityColor.medium
  const icon = categoryIcon[current.category] || <Settings className="h-5 w-5" />

  return (
      <Card role="dialog" aria-labelledby={`confirm-title-${current.id}`} aria-describedby={`confirm-desc-${current.id}`} className={clsx('w-full shadow-sm border mb-3 rounded-lg', colors.border, colors.bg, compact && 'py-2') }>
        <div className="flex flex-col gap-3 p-4">
          <header className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={clsx('flex h-10 w-10 items-center justify-center rounded-md border', colors.border, colors.bg)}>
                {icon}
              </div>
              <div className="space-y-1">
                <h2 id={`confirm-title-${current.id}`} className={clsx('font-semibold leading-tight flex items-center gap-2 flex-wrap', colors.text, compact && 'text-sm') }>
                  {sanitizeInline(current.preview.title) || current.toolName}
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', colors.chip)}>
                    {current.sensitivity}
                  </span>
                  {!current.undoable && !compact && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold bg-red-600 text-white px-2 py-0.5 rounded">
                      Irreversible
                    </span>
                  )}
                </h2>
                {current.preview.summary && !compact && (
                  <p id={`confirm-desc-${current.id}`} className="text-sm text-muted-foreground max-w-prose">
                    {sanitizeInline(current.preview.summary)}
                  </p>
                )}
                {!compact && <button
                  type="button"
                  onClick={() => setDetailsOpen(o => !o)}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary rounded"
                  aria-expanded={detailsOpen}
                  aria-controls={`confirm-details-${current.id}`}
                >
                  {detailsOpen ? <ChevronUp className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>}
                  {detailsOpen ? 'Ocultar detalles' : 'Ver detalles'}
                </button>}
              </div>
            </div>
            {queueInfo.total > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{queueInfo.position}/{queueInfo.total}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" disabled={queueInfo.total<2} onClick={() => setIndex(i => (i - 1 + queueInfo.total)%queueInfo.total)} className="h-8 w-8">←</Button>
                  <Button size="icon" variant="outline" disabled={queueInfo.total<2} onClick={() => setIndex(i => (i + 1)%queueInfo.total)} className="h-8 w-8">→</Button>
                </div>
              </div>
            )}
          </header>

          {/* Specialized tweet preview */}
          { current.toolName === 'postTweet' && detailsOpen && !compact && (
            <div className="flex flex-col gap-2" id={`confirm-details-${current.id}`}>
              {/* Character counter */}
              {(() => {
                const textDetail = current.preview.details?.find(d => d.label === 'Text')
                const text = textDetail?.value || ''
                const length = [...text].length
                const nearLimit = length >= 250 && length <= 280
                const overLimit = length > 280
                return (
                  <div className={clsx('flex items-center justify-between rounded border px-3 py-2 text-xs', overLimit ? 'border-red-500 bg-red-100/50 dark:bg-red-900/30' : nearLimit ? 'border-amber-400 bg-amber-100/40 dark:bg-amber-900/30' : 'border-border/40 bg-background/50') }>
                    <span className="font-medium">Caracteres</span>
                    <span className={clsx('font-mono', overLimit && 'text-red-600 dark:text-red-400', nearLimit && 'text-amber-600 dark:text-amber-300')}>{length} / 280</span>
                  </div>
                )
              })()}
              {/* Tweet text block */}
              {(() => {
                const text = current.preview.details?.find(d => d.label === 'Text')?.value || ''
                return (
                  <div className="rounded border border-border/40 bg-background/50 p-3">
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Contenido</span>
                    <p className="text-sm whitespace-pre-wrap break-words leading-snug max-h-52 overflow-auto">{text}</p>
                  </div>
                )
              })()}
              {/* Hashtags, mentions, urls extraction (basic regex again on client) */}
              {(() => {
                const text = current.preview.details?.find(d => d.label === 'Text')?.value || ''
                const hashtags = Array.from(text.match(/#[A-Za-z0-9_]+/g) || [])
                const mentions = Array.from(text.match(/@[A-Za-z0-9_]+/g) || [])
                const urls = Array.from(text.match(/https?:\/\/\S+/g) || [])
                const hasMeta = hashtags.length + mentions.length + urls.length > 0
                if (!hasMeta) return null
                return (
                  <div className="flex flex-col gap-2">
                    {hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium"><Hash className="h-3 w-3"/>Hashtags</span>
                        {hashtags.slice(0,12).map(h => (
                          <span key={h} className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[11px] font-medium">{h}</span>
                        ))}
                      </div>
                    )}
                    {mentions.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium"><AtSign className="h-3 w-3"/>Menciones</span>
                        {mentions.slice(0,12).map(m => (
                          <span key={m} className="px-2 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-700 text-[11px] font-medium">{m}</span>
                        ))}
                      </div>
                    )}
                    {urls.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium"><LinkIcon className="h-3 w-3"/>Links</span>
                        {urls.slice(0,6).map(u => (
                          <span key={u} className="px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-700 text-[10px] max-w-[160px] truncate" title={u}>{u}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
          {/* Generic details fallback */}
          { current.toolName !== 'postTweet' && !compact && detailsOpen && current.preview.details && current.preview.details.length > 0 && (
            <div id={`confirm-details-${current.id}`} className="grid gap-2 sm:grid-cols-2">
              {current.preview.details.slice(0,10).map((d, idx) => (
                <div key={idx} className="flex flex-col rounded border border-border/40 bg-background/50 px-3 py-2 min-w-0">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium truncate" title={d.label}>{d.label}</span>
                  <span className="text-xs break-words leading-snug max-h-24 overflow-auto whitespace-pre-wrap" title={d.value}>{d.value || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          { !compact && current.preview.warnings && current.preview.warnings.length > 0 && (
            <div className="rounded-md border border-orange-300/60 bg-orange-100/40 dark:border-orange-700 dark:bg-orange-900/30 p-2 space-y-1">
              <div className="flex items-center gap-1 text-xs font-medium text-orange-800 dark:text-orange-200">
                <AlertTriangle className="h-3 w-3" /> Alerta
              </div>
              <ul className="pl-4 space-y-0.5 text-xs text-orange-700 dark:text-orange-300 list-disc">
                {current.preview.warnings.map((w,i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Raw message */}
          { !compact && current.message && !current.preview.summary && (
            <pre className="max-h-32 overflow-auto rounded bg-muted/20 p-2 text-[11px] whitespace-pre-wrap font-mono text-muted-foreground leading-snug">
              {sanitizeInline(current.message)}
            </pre>
          )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-1">
              {!compact && (
                <div className="text-[10px] text-muted-foreground order-2 sm:order-1 tracking-wide">
                  ↵ Enter = Aprobar • Esc = Cancelar • {new Date(current.timestamp).toLocaleTimeString()}
                </div>
              )}
              <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                <Button
                  onClick={handleApprove}
                  disabled={loadingId === current.id}
                  className={clsx('bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none h-9 text-sm', compact ? 'min-w-[0] px-3' : 'sm:min-w-[140px]')}
                >
                  {loadingId === current.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  {compact ? 'OK' : 'Aprobar'}
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={loadingId === current.id}
                  variant="outline"
                  className={clsx('flex-1 sm:flex-none h-9 text-sm border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950', compact ? 'min-w-[0] px-3' : 'sm:min-w-[110px]')}
                >
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            </div>
        </div>
      </Card>
  )
}

export default ConfirmationPanel
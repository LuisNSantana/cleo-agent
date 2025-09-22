"use client"
import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, X, AlertTriangle, Calendar, Mail, Folder, Settings, Trash2, Loader2 } from 'lucide-react'
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

export function ConfirmationPanel({ items, onResolve, loadingId }: ConfirmationPanelProps) {
  const [index, setIndex] = useState(0)
  const current = items[index]

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
  const colors = sensitivityColor[current.sensitivity] || sensitivityColor.medium
  const icon = categoryIcon[current.category] || <Settings className="h-5 w-5" />

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex w-full justify-center px-4 pb-6 pointer-events-none">
      <Card role="dialog" aria-labelledby={`confirm-title-${current.id}`} aria-describedby={`confirm-desc-${current.id}`} className={clsx('max-w-3xl w-full pointer-events-auto shadow-xl border backdrop-blur-md', colors.border, colors.bg)}>
        <div className="flex flex-col gap-4 p-5">
          <header className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={clsx('flex h-10 w-10 items-center justify-center rounded-md border', colors.border, colors.bg)}>
                {icon}
              </div>
              <div className="space-y-1">
                <h2 id={`confirm-title-${current.id}`} className={clsx('font-semibold leading-tight flex items-center gap-2', colors.text)}>
                  {current.preview.title || current.toolName}
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', colors.chip)}>
                    {current.sensitivity}
                  </span>
                  {!current.undoable && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold bg-red-600 text-white px-2 py-0.5 rounded">
                      Irreversible
                    </span>
                  )}
                </h2>
                {current.preview.summary && (
                  <p id={`confirm-desc-${current.id}`} className="text-sm text-muted-foreground max-w-prose">
                    {current.preview.summary}
                  </p>
                )}
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

          {/* Details */}
          {current.preview.details && current.preview.details.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {current.preview.details.slice(0,10).map((d, idx) => (
                <div key={idx} className="flex flex-col rounded border border-border/40 bg-background/40 px-3 py-2">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{d.label}</span>
                  <span className="text-sm break-words leading-snug">{d.value || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {current.preview.warnings && current.preview.warnings.length > 0 && (
            <div className="rounded-md border border-orange-300/70 bg-orange-100/60 dark:border-orange-700 dark:bg-orange-900/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-200">
                <AlertTriangle className="h-4 w-4" /> Warnings
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-orange-700 dark:text-orange-300">
                {current.preview.warnings.map((w,i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Raw message optional (collapsed by default in future) */}
          {current.message && !current.preview.summary && (
            <pre className="max-h-40 overflow-auto rounded bg-muted/30 p-3 text-xs whitespace-pre-wrap font-mono text-muted-foreground">
              {current.message}
            </pre>
          )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[11px] text-muted-foreground order-2 sm:order-1">
                Enter = Approve • Esc = Cancel • {new Date(current.timestamp).toLocaleTimeString()}
              </div>
              <div className="flex gap-3 order-1 sm:order-2">
                <Button
                  onClick={handleApprove}
                  disabled={loadingId === current.id}
                  className="bg-green-600 hover:bg-green-700 text-white min-w-[150px]"
                >
                  {loadingId === current.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Approve & Execute
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={loadingId === current.id}
                  variant="outline"
                  className="min-w-[120px] border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
              </div>
            </div>
        </div>
      </Card>
    </div>
  )
}

export default ConfirmationPanel
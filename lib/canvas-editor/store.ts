"use client"

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type CanvasEditorMode = 'rich' | 'markdown'

export interface CanvasEditorState {
  isOpen: boolean
  mode: CanvasEditorMode
  initialText: string
  currentText: string
  initialHtml?: string
  currentHtml?: string
  loading: boolean
  lastSavedAt?: number
  documentId?: string
  filename?: string
  saving?: boolean
  open: (opts: { text: string; mode?: CanvasEditorMode; html?: string; documentId?: string; filename?: string }) => void
  close: () => void
  setText: (text: string) => void
  setHtml: (html: string) => void
  setMode: (mode: CanvasEditorMode) => void
  markSaved: () => void
  setSaving: (saving: boolean) => void
  attachDocumentMeta: (doc: { id: string; filename: string }) => void
  reset: () => void
}

export const useCanvasEditorStore = create<CanvasEditorState>()(devtools((set, get) => ({
  isOpen: false,
  mode: 'rich',
  initialText: '',
  currentText: '',
  initialHtml: undefined,
  currentHtml: undefined,
  loading: false,
  open: ({ text, mode, html, documentId, filename }) => set({ isOpen: true, initialText: text, currentText: text, initialHtml: html, currentHtml: html, mode: mode ?? 'rich', documentId, filename }),
  close: () => set({ isOpen: false }),
  setText: (text) => set({ currentText: text }),
  setHtml: (html) => set({ currentHtml: html }),
  setMode: (mode) => set({ mode }),
  markSaved: () => set({ lastSavedAt: Date.now(), initialText: get().currentText, initialHtml: get().currentHtml }),
  setSaving: (saving) => set({ saving }),
  attachDocumentMeta: (doc) => set({ documentId: doc.id, filename: doc.filename }),
  reset: () => set({ isOpen: false, mode: 'rich', initialText: '', currentText: '', initialHtml: undefined, currentHtml: undefined, lastSavedAt: undefined, documentId: undefined, filename: undefined, saving: false })
})))

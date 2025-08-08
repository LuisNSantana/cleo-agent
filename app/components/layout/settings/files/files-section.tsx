"use client"

import { useEffect, useState, useCallback } from 'react'
import { listDocuments, createDocument, deleteDocument, getDocument, updateDocument, DocumentRecord } from '@/lib/documents'
import { useCanvasEditorStore } from '@/lib/canvas-editor/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { FileTextIcon, TrashIcon, PlusIcon, PencilSimpleIcon, DownloadSimpleIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import { exportContent } from '@/lib/canvas-editor/exports'
import { htmlToMarkdown } from '@/lib/canvas-editor/convert'

export function FilesSection() {
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('nuevo.md')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const { open, documentId } = useCanvasEditorStore()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const d = await listDocuments()
      setDocs(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      setCreating(true)
      const doc = await createDocument({ filename: newName.trim(), content_md: '# Nuevo documento\n\n', title: newName.trim() })
      setNewName('nuevo.md')
      await load()
      // Open in editor
      open({ text: doc.content_md || '', mode: 'markdown', documentId: doc.id, filename: doc.filename })
      setSelectedId(doc.id)
    } catch (e) { console.error(e) } finally { setCreating(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este archivo?')) return
    try {
      await deleteDocument(id)
      await load()
      if (selectedId === id) setSelectedId(null)
    } catch (e) { console.error(e) }
  }

  async function handleRename(id: string) {
    try {
      await updateDocument(id, { filename: renameValue, title: renameValue })
      setRenamingId(null)
      await load()
    } catch (e) { console.error(e) }
  }

  async function openDoc(id: string) {
    try {
      const doc = await getDocument(id)
      open({ text: doc.content_md || '', mode: 'markdown', documentId: doc.id, filename: doc.filename })
      setSelectedId(id)
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium flex items-center gap-2"><FileTextIcon className="size-4" /> Files</h3>
        <p className="text-xs text-muted-foreground">Gestiona tus documentos markdown generados y ábrelos en el Canvas Editor.</p>
      </div>
      <div className="flex gap-2 items-center">
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="nombre.md" className="h-8 w-48" />
        <Button size="sm" onClick={handleCreate} disabled={creating}>{creating ? 'Creando...' : 'Crear'}</Button>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? 'Cargando...' : 'Refrescar'}</Button>
      </div>
      <div className="border rounded divide-y">
        {loading && <div className="p-4 text-xs">Cargando...</div>}
        {!loading && docs.length === 0 && <div className="p-4 text-xs text-muted-foreground">Sin archivos todavía.</div>}
        {docs.map(d => {
          const selected = d.id === selectedId
          const isRenaming = renamingId === d.id
          return (
            <div key={d.id} className={cn('flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/40', selected && 'bg-accent/30')}>              
              {isRenaming ? (
                <input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="flex-1 bg-background border rounded px-2 py-1 text-xs" />
              ) : (
                <button className="flex-1 text-left truncate" onClick={() => openDoc(d.id)} title={d.filename}>{d.filename}</button>
              )}
              <span className="text-[10px] text-muted-foreground hidden md:inline">{d.updated_at?.slice(0,10)}</span>
              {isRenaming ? (
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleRename(d.id)}><PencilSimpleIcon className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRenamingId(null)}>✕</Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setRenamingId(d.id); setRenameValue(d.filename) }}><PencilSimpleIcon className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(d.id)}><TrashIcon className="size-4 text-destructive" /></Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="text-[11px] text-muted-foreground">
        Los cambios se guardarán manualmente por ahora al exportar desde el editor. (Próximo: autosave remoto)
      </div>
    </div>
  )
}

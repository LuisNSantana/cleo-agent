"use client"

import { useEffect, useState, useCallback } from 'react'
import { listDocuments, createDocument, deleteDocument, getDocument, updateDocument, DocumentRecord } from '@/lib/documents'
import { useCanvasEditorStore } from '@/lib/canvas-editor/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { 
  FileTextIcon, 
  TrashIcon, 
  PlusIcon, 
  PencilSimpleIcon, 
  DownloadSimpleIcon, 
  ArrowSquareOutIcon,
  EyeIcon,
  EyeSlashIcon,
  CalendarIcon,
  ClockIcon
} from '@phosphor-icons/react'
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
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState<string>('')
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

  async function handlePreview(id: string) {
    if (previewingId === id) {
      // Toggle preview off
      setPreviewingId(null)
      setPreviewContent('')
      return
    }

    try {
      const doc = await getDocument(id)
      setPreviewContent(doc.content_md || '')
      setPreviewingId(id)
    } catch (e) { 
      console.error(e)
    }
  }

  async function handleDownload(doc: DocumentRecord) {
    try {
      const content = doc.content_md || ''
      const blob = new Blob([content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  const getFileSize = (content?: string) => {
    if (!content) return '0 KB'
    const bytes = new Blob([content]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium flex items-center gap-2">
          <FileTextIcon className="size-4" /> 
          Files ({docs.length})
        </h3>
        <p className="text-xs text-muted-foreground">
          Gestiona tus documentos markdown. Previsualiza, edita en Canvas Editor o descarga.
        </p>
      </div>

      {/* Create new file section */}
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <div className="flex gap-2 items-center">
            <PlusIcon className="size-4 text-muted-foreground" />
            <Input 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              placeholder="nombre-archivo.md" 
              className="h-8 flex-1" 
            />
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creando...' : 'Crear'}
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? 'Cargando...' : 'Refrescar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files list */}
      <div className="space-y-2">
        {loading && (
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Cargando archivos...</div>
            </CardContent>
          </Card>
        )}
        
        {!loading && docs.length === 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="text-center py-8">
                <FileTextIcon className="size-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No tienes archivos todavía</p>
                <p className="text-xs text-muted-foreground mt-1">Crea tu primer documento arriba</p>
              </div>
            </CardContent>
          </Card>
        )}

        {docs.map(d => {
          const selected = d.id === selectedId
          const isRenaming = renamingId === d.id
          const isPreviewing = previewingId === d.id
          
          return (
            <Card key={d.id} className={cn(
              'transition-all hover:shadow-sm',
              selected && 'ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20'
            )}>
              <CardContent className="pt-4">
                {/* File header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <input 
                        value={renameValue} 
                        onChange={e => setRenameValue(e.target.value)}
                        className="w-full bg-background border rounded px-2 py-1 text-sm"
                        onKeyDown={e => e.key === 'Enter' && handleRename(d.id)}
                        autoFocus
                      />
                    ) : (
                      <div>
                        <h4 className="font-medium text-sm truncate" title={d.filename}>
                          {d.filename}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="size-3" />
                            {formatDate(d.updated_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="size-3" />
                            {getFileSize(d.content_md)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {isRenaming ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleRename(d.id)}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={() => handlePreview(d.id)}
                        title={isPreviewing ? "Ocultar vista previa" : "Vista previa"}
                      >
                        {isPreviewing ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={() => openDoc(d.id)}
                        title="Abrir en Canvas Editor"
                      >
                        <ArrowSquareOutIcon className="size-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownload(d)}
                        title="Descargar archivo"
                      >
                        <DownloadSimpleIcon className="size-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={() => { setRenamingId(d.id); setRenameValue(d.filename) }}
                        title="Renombrar archivo"
                      >
                        <PencilSimpleIcon className="size-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(d.id)}
                        title="Eliminar archivo"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Preview content */}
                {isPreviewing && (
                  <div className="border-t pt-3 mt-3">
                    <div className="bg-muted/30 rounded-lg p-3 max-h-64 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                        {previewContent || 'Sin contenido'}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Footer info */}
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <FileTextIcon className="size-3" />
          <span className="font-medium">Funcionalidades:</span>
        </div>
        <ul className="space-y-1 text-xs ml-5">
          <li>• <strong>Vista previa:</strong> Click en 👁️ para ver contenido</li>
          <li>• <strong>Editar:</strong> Click en ↗️ para abrir en Canvas Editor</li>
          <li>• <strong>Descargar:</strong> Click en ⬇️ para descargar .md</li>
          <li>• <strong>Renombrar:</strong> Click en ✏️ para cambiar nombre</li>
        </ul>
      </div>
    </div>
  )
}

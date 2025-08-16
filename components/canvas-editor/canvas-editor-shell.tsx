"use client"

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useCanvasEditorStore } from '@/lib/canvas-editor/store'
import { exportContent } from '@/lib/canvas-editor/exports'
import { markdownToHtml, wrapPrintHtml } from '@/lib/markdown-to-html'
import { htmlToMarkdown, htmlToText } from '@/lib/canvas-editor/convert'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { updateDocument } from '@/lib/documents'
import { uploadToDrive } from '@/lib/google-drive'
const RichEditor = dynamic(() => import('./rich-editor').then(m => m.RichEditor), { ssr: false })
const Markdown = dynamic(() => import("@/components/prompt-kit/markdown").then(m => m.Markdown), { ssr: false })
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/components/ui/toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { ChevronDownIcon, DownloadIcon } from 'lucide-react'

// Phase 1: plain textarea (rich mode real editor deferred)

export function CanvasEditorShell({ 
  onWidthChange, 
  onCollapseChange,
  initialWidth
}: { 
  onWidthChange?: (width: number) => void
  onCollapseChange?: (collapsed: boolean) => void 
  initialWidth?: number
}) {
  const { isOpen, close, currentText, setText, currentHtml, setHtml, mode, setMode, markSaved, initialText, initialHtml, documentId, filename } = useCanvasEditorStore()
  const [remoteSaving, setRemoteSaving] = useState(false)
  const [remoteSavedAt, setRemoteSavedAt] = useState<number | null>(null)
  const [driveOpen, setDriveOpen] = useState(false)
  const [driveUploading, setDriveUploading] = useState(false)
  const [driveFilename, setDriveFilename] = useState<string>('')
  const [driveLink, setDriveLink] = useState<string | null>(null)
  const [driveFolderId, setDriveFolderId] = useState<string>('')
  const [driveFormat, setDriveFormat] = useState<'md' | 'txt' | 'html'>('md')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const lastAutoSave = useRef<number>(0)
  const saveTimer = useRef<any>(null)
  const autosaveKey = 'canvas-editor-draft'
  // Responsive and collapse state
  const [isMobile, setIsMobile] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  // Calculate 70% of screen width for editor
  const defaultPanelWidth = initialWidth || Math.floor(screenWidth * 0.7)
  const [panelWidth, setPanelWidth] = useState(defaultPanelWidth)

  // Update panel width when screen resizes or initialWidth changes
  useEffect(() => {
    if (initialWidth) {
      setPanelWidth(initialWidth)
    }
  }, [initialWidth])

  useEffect(() => {
    const updateWidth = () => {
      const newScreenWidth = window.innerWidth
      setScreenWidth(newScreenWidth)
      if (!initialWidth) {
        const newPanelWidth = Math.floor(newScreenWidth * 0.7)
        setPanelWidth(newPanelWidth)
      }
    }
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [initialWidth])

  // Load draft when opening if empty
  useEffect(() => {
    if (!isOpen || initialText) return
    try {
      const raw = localStorage.getItem(autosaveKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.text) setText(parsed.text)
        if (parsed?.html) setHtml(parsed.html)
      }
    } catch {}
  }, [isOpen, initialText, setText, setHtml])

  const scheduleAutosave = useCallback(() => {
    if (!isOpen) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(autosaveKey, JSON.stringify({ text: currentText, html: currentHtml, ts: Date.now() })) } catch {}
      lastAutoSave.current = Date.now()
    }, 800)
  }, [currentText, currentHtml, isOpen])

  useEffect(() => { scheduleAutosave() }, [scheduleAutosave])
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])
  useEffect(() => { if (isOpen && textareaRef.current && mode === 'markdown') textareaRef.current.focus() }, [isOpen, mode])

  // Match media listener (runs always but cheap when hidden)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Notify parent of state changes
  useEffect(() => {
    onWidthChange?.(panelWidth)
  }, [panelWidth, onWidthChange])

  useEffect(() => {
    onCollapseChange?.(collapsed)
  }, [collapsed, onCollapseChange])

  const dirty = currentText !== initialText || currentHtml !== initialHtml
  const counts = getCounts(mode === 'rich' && currentHtml ? htmlToPlain(currentHtml) : currentText)

  // Derived content and default filename for Drive
  const driveContent = useMemo(() => {
    return (mode === 'rich' && currentHtml) ? htmlToMarkdown(currentHtml) : (currentText || '')
  }, [mode, currentHtml, currentText])
  useEffect(() => {
    const base = (filename || 'documento.md')
    const ensured = base.endsWith('.md') ? base : `${base}`.replace(/\.[^.]+$/, '.md')
    setDriveFilename(ensured)
  }, [filename, isOpen])

  if (!isOpen) return null

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="h-dvh flex flex-col bg-background">
          <header className="flex items-center gap-2 border-b px-3 h-14 select-none text-xs bg-background">
            <span className="font-medium truncate">Canvas Editor {filename && <span className="text-xs text-muted-foreground ml-2">{filename}</span>}</span>
            <div className="ml-auto flex gap-1 flex-shrink-0">
              <button
                onClick={close}
                className="rounded border px-2 py-1 text-xs hover:bg-destructive/10 transition-colors"
              >✕</button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-3">
            {mode === 'rich' ? (
              <RichEditor
                htmlValue={currentHtml}
                textValue={currentText}
                onChange={(html, plain) => {
                  setHtml(html)
                  setText(plain)
                }}
                editorRef={(inst) => { editorRef = inst }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                className="h-full w-full resize-none rounded border bg-background p-3 font-mono text-sm leading-relaxed outline-none focus:ring-1 focus:ring-primary/50"
                value={currentText}
                onChange={(e) => setText(e.target.value)}
                spellCheck
                placeholder="Escribe tu documento aquí..."
              />
            )}
          </main>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col bg-background border-l h-full w-full"
    >
      <header className="flex items-center gap-2 border-b px-3 h-14 select-none bg-background/95 backdrop-blur">
        {!isMobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="rounded-md border px-2 py-1 text-xs hover:bg-accent transition-colors flex-shrink-0 font-medium"
            title={collapsed ? 'Expandir editor' : 'Colapsar editor'}
          >
            {collapsed ? '⟨⟨' : '⟩⟩'}
          </button>
        )}
        {!collapsed && !isMobile && (
          <>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">📝 Canvas</span>
              {filename && <span className="text-muted-foreground text-xs bg-muted px-2 py-1 rounded-md">{filename}</span>}
            </div>
            
            <div className="flex items-center gap-1 ml-4">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-accent transition-colors"
              >
                <option value="rich">📄 Rich Text</option>
                <option value="markdown">🔤 Markdown</option>
              </select>
              
              {dirty && (
                <span className="text-amber-500 text-xs bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded-md font-medium">
                  ● Sin guardar
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
              <span className="bg-muted px-2 py-1 rounded-md">
                {counts.words} palabras
              </span>
              <span className="bg-muted px-2 py-1 rounded-md">
                {counts.chars} caracteres
              </span>
            </div>
            
            <div className="flex gap-1 flex-shrink-0">{/* action buttons */}
              {documentId && (
                <button
                  onClick={async () => {
                    if (!documentId) return
                    try {
                      setRemoteSaving(true)
                      if (mode === 'rich' && currentHtml) {
                        await updateDocument(documentId, { content_html: currentHtml, content_md: htmlToMarkdown(currentHtml) })
                      } else {
                        await updateDocument(documentId, { content_md: currentText })
                      }
                      setRemoteSavedAt(Date.now())
                    } catch (e) {
                      console.error(e)
                    } finally {
                      setRemoteSaving(false)
                    }
                  }}
                  className="rounded-md border bg-primary text-primary-foreground px-3 py-1 text-xs hover:bg-primary/90 transition-colors font-medium"
                  disabled={remoteSaving}
                  title="Guardar documento en la nube"
                >
                  {remoteSaving ? '⟳ Guardando...' : remoteSavedAt ? '✓ Guardado' : '💾 Guardar'}
                </button>
              )}
              
              {/* Botón de Exportación Desplegable */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-md border px-2 py-1 text-xs hover:bg-accent transition-colors flex items-center gap-1"
                    title="Opciones de exportación"
                  >
                    <DownloadIcon className="w-3 h-3" />
                    Exportar
                    <ChevronDownIcon className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => {
                      const base = mode === 'rich' && currentHtml ? htmlToText(currentHtml) : currentText
                      exportContent({ format: 'txt', content: base })
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    📄 Archivo de Texto (.txt)
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => {
                      if (mode === 'rich' && currentHtml) {
                        exportContent({ format: 'md', content: htmlToMarkdown(currentHtml) })
                      } else {
                        exportContent({ format: 'md', content: currentText })
                      }
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    🔤 Archivo Markdown (.md)
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => {
                      // Exportar PDF vía ventana de impresión
                      const title = (filename || 'documento').replace(/\.[^.]+$/, '')
                      const bodyHtml = (mode === 'rich' && currentHtml)
                        ? currentHtml
                        : markdownToHtml(currentText)
                      const html = wrapPrintHtml(title, bodyHtml)
                      const win = window.open('', '_blank')
                      if (!win) return
                      win.document.open()
                      win.document.write(html)
                      win.document.close()
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    🖨️ Exportar como PDF
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={() => setDriveOpen(true)}
                    className="flex items-center gap-2 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    <img
                      src="/icons/google-drive.svg"
                      alt="Google Drive"
                      style={{ width: 16, height: 16 }}
                    />
                    Subir a Google Drive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <button
                onClick={close}
                className="rounded-md border border-destructive/50 px-2 py-1 text-xs hover:bg-destructive hover:text-destructive-foreground transition-colors"
                title="Cerrar editor"
              >✕ Cerrar</button>
            </div>
          </>
        )}
        {collapsed && !isMobile && (
          <button
            onClick={close}
            className="ml-auto rounded border px-1.5 py-0.5 text-[10px] hover:bg-destructive/10 transition-colors"
            title="Cerrar editor"
          >
            ✕
          </button>
        )}
      </header>

      {!collapsed && mode === 'rich' && (
        <div className="flex items-center gap-1 border-b bg-muted/50 px-3 py-2 overflow-x-auto">
          <div className="flex items-center gap-1 pr-2 border-r border-border">
            <FormatButton label="𝐁" onClick={() => execCommand('toggleBold')} title="Negrita (Ctrl+B)" />
            <FormatButton label="𝐼" onClick={() => execCommand('toggleItalic')} title="Cursiva (Ctrl+I)" />
            <FormatButton label="𝐔" onClick={() => execCommand('toggleUnderline')} title="Subrayado" />
          </div>
          <div className="flex items-center gap-1 pr-2 border-r border-border">
            <FormatButton label="H1" onClick={() => execCommand('toggleHeading', 1)} title="Título 1" />
            <FormatButton label="H2" onClick={() => execCommand('toggleHeading', 2)} title="Título 2" />
            <FormatButton label="H3" onClick={() => execCommand('toggleHeading', 3)} title="Título 3" />
          </div>
          <div className="flex items-center gap-1 pr-2 border-r border-border">
            <FormatButton label="• Lista" onClick={() => execCommand('toggleBulletList')} title="Lista con viñetas" />
            <FormatButton label="1. Lista" onClick={() => execCommand('toggleOrderedList')} title="Lista numerada" />
            <FormatButton label="☑ Tareas" onClick={() => execCommand('toggleTaskList')} title="Lista de tareas" />
          </div>
          <div className="flex items-center gap-1">
            <FormatButton label="💬 Cita" onClick={() => execCommand('toggleBlockquote')} title="Cita en bloque" />
            <FormatButton label="{ } Código" onClick={() => execCommand('toggleCodeBlock')} title="Bloque de código" />
            <FormatButton label="🔗 Link" onClick={() => execCommand('toggleLink')} title="Enlace" />
          </div>
        </div>
      )}

      {!collapsed && (
        <main className="flex-1 overflow-auto bg-background">
          {mode === 'rich' ? (
            <div className="h-full bg-gradient-to-b from-background to-background/95">
              <RichEditor
                htmlValue={currentHtml}
                textValue={currentText}
                onChange={(html, plain) => {
                  setHtml(html)
                  setText(plain)
                }}
                editorRef={(inst) => { editorRef = inst }}
              />
            </div>
          ) : (
            <div className="h-full p-6 bg-gradient-to-b from-background to-background/95">
              <textarea
                ref={textareaRef}
                className="h-full w-full resize-none rounded-lg border bg-background/50 backdrop-blur p-6 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                value={currentText}
                onChange={(e) => setText(e.target.value)}
                spellCheck
                placeholder="Escribe tu documento en Markdown aquí...

# Mi Documento

Este es un ejemplo de **texto en negrita** y *texto en cursiva*.

- Lista item 1
- Lista item 2

## Código

\`\`\`javascript
console.log('Hello World!');
\`\`\`"
              />
            </div>
          )}
        </main>
      )}
      {/* Google Drive Upload Dialog */}
      <Dialog open={driveOpen} onOpenChange={(open) => {
        setDriveOpen(open)
        if (!open) {
          setDriveUploading(false)
          setDriveLink(null)
        }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src="/icons/google-drive.svg" alt="Google Drive" className="size-5" />
              Subir a Google Drive
            </DialogTitle>
            <DialogDescription>
              Revisa y confirma los detalles. Te mostraré una vista previa y podrás cambiar el nombre, formato y carpeta destino antes de subirlo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <label className="text-sm font-medium text-muted-foreground">Nombre del archivo</label>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Input
                  value={driveFilename}
                  onChange={(e) => setDriveFilename(e.target.value)}
                  placeholder={driveFormat === 'md' ? 'documento.md' : driveFormat === 'txt' ? 'documento.txt' : 'documento.html'}
                  disabled={driveUploading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <label className="text-sm font-medium text-muted-foreground">Formato</label>
              <div className="sm:col-span-2 flex items-center gap-2">
                <select
                  className="rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-accent transition-colors"
                  value={driveFormat}
                  onChange={(e) => setDriveFormat(e.target.value as any)}
                  disabled={driveUploading}
                >
                  <option value="md">Markdown (.md)</option>
                  <option value="txt">Texto (.txt)</option>
                  <option value="html">HTML (.html)</option>
                </select>
                <span className="text-[11px] text-muted-foreground">Markdown conserva títulos, listas y formato.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <label className="text-sm font-medium text-muted-foreground">Carpeta destino (opcional)</label>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Input
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  placeholder="ID de carpeta en Drive (déjalo vacío para raíz)"
                  disabled={driveUploading}
                />
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs text-muted-foreground grid grid-cols-2 sm:grid-cols-3 gap-2">
                <span>Vista previa</span>
                <span className="text-right">{counts.words} palabras</span>
                <span className="text-right hidden sm:block">{counts.chars} caracteres</span>
              </div>
              <div className="max-h-[50vh] overflow-auto p-4">
                {driveContent ? (
                  <Markdown className="prose prose-sm dark:prose-invert max-w-none">
                    {driveContent}
                  </Markdown>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay contenido para previsualizar.</p>
                )}
              </div>
            </div>

            {driveUploading && (
              <div className="space-y-2">
                <Progress value={25} className="h-2" />
                <p className="text-xs text-muted-foreground">Subiendo a Google Drive…</p>
              </div>
            )}

            {driveLink && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200/50 dark:border-green-900/50 rounded-md p-3 text-sm flex items-center justify-between">
                <span className="text-green-700 dark:text-green-300">Archivo subido correctamente.</span>
                <a href={driveLink} target="_blank" rel="noreferrer" className="text-green-700 underline text-xs">Abrir</a>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDriveOpen(false)}
              disabled={driveUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!driveContent?.trim()) {
                  toast({ title: 'No hay contenido para subir', status: 'warning' })
                  return
                }
                if (!driveFilename?.trim()) {
                  toast({ title: 'Ingresa un nombre de archivo', status: 'warning' })
                  return
                }
                // Asegurar extensión según formato
                const ensureExt = (base: string) => {
                  if (driveFormat === 'md') return base.endsWith('.md') ? base : base.replace(/\.[^.]+$/, '.md')
                  if (driveFormat === 'txt') return base.endsWith('.txt') ? base : base.replace(/\.[^.]+$/, '.txt')
                  if (driveFormat === 'html') return base.endsWith('.html') ? base : base.replace(/\.[^.]+$/, '.html')
                  return base
                }
                const name = ensureExt(driveFilename)
                const mime = driveFormat === 'md' ? 'text/markdown' : driveFormat === 'txt' ? 'text/plain' : 'text/html'
                const contentForFormat = (() => {
                  if (driveFormat === 'md') return driveContent
                  if (driveFormat === 'txt') return (mode === 'rich' && currentHtml) ? htmlToPlain(currentHtml) : (currentText || '')
                  if (driveFormat === 'html') {
                    const body = (mode === 'rich' && currentHtml) ? currentHtml : markdownToHtml(currentText)
                    return wrapPrintHtml(name.replace(/\.[^.]+$/, ''), body)
                  }
                  return driveContent
                })()
                try {
                  setDriveUploading(true)
                  setDriveLink(null)
                  const { file } = await uploadToDrive({ filename: name, content: contentForFormat, mimeType: mime, folderId: driveFolderId || undefined })
                  const link = file.webViewLink || file.webContentLink || null
                  setDriveLink(link)
                  setDriveUploading(false)
                  toast({ title: 'Subido a Google Drive', description: file.name, status: 'success' })
                } catch (e: any) {
                  setDriveUploading(false)
                  toast({ title: 'No se pudo subir a Drive', description: e?.message || 'Error desconocido', status: 'error' })
                }
              }}
              disabled={driveUploading}
            >
              {driveUploading ? 'Subiendo…' : 'Subir a Drive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}function htmlToPlain(html: string) {
  return htmlToText(html)
}

let editorRef: any = null

function execCommand(command: string, level?: number) {
  if (!editorRef) return
  const chain = editorRef.chain().focus()
  switch (command) {
    case 'toggleBold': chain.toggleBold(); break
    case 'toggleItalic': chain.toggleItalic(); break
    case 'toggleHeading': level && chain.toggleHeading({ level }); break
    case 'toggleBulletList': chain.toggleBulletList(); break
    case 'toggleOrderedList': chain.toggleOrderedList(); break
    case 'toggleCodeBlock': chain.toggleCodeBlock(); break
    case 'toggleBlockquote': chain.toggleBlockquote(); break
    case 'undo': editorRef.commands.undo(); return
    case 'redo': editorRef.commands.redo(); return
    default: return
  }
  chain.run()
}

function FormatButton({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
  return (
    <button 
      type="button" 
      onClick={onClick} 
      className="rounded-md border px-2 py-1 hover:bg-accent text-xs flex-shrink-0 font-medium transition-colors"
      title={title}
    >
      {label}
    </button>
  )
}

function getCounts(text: string) {
  const chars = text.length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  // Very rough token approximation (avg 4 chars per token)
  const tokens = Math.ceil(chars / 4)
  return { chars, words, tokens }
}

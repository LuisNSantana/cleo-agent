"use client"

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sparkle, ArrowRight, CheckCircle, XCircle, MagicWand } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { fetchClient } from '@/lib/fetch'
import { normalizeModelId } from '@/lib/openproviders/provider-map'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

// Dynamic tool metadata fetched from API. Each entry mapped into a simplified UI model.
interface FetchedToolMeta { name: string; description: string; category: string; requiresConnection?: string }
interface UIToolMeta { id: string; label: string; capability: string; requiresConnection?: string; category: string }

const CATEGORY_LABELS: Record<string, string> = {
  google_calendar: 'Google Calendar',
  google_drive: 'Google Drive',
  google_docs: 'Google Docs',
  google_slides: 'Google Slides',
  google_sheets: 'Google Sheets',
  gmail: 'Gmail',
  notion: 'Notion',
  twitter: 'Twitter',
  instagram: 'Instagram',
  facebook: 'Facebook',
  telegram: 'Telegram',
  shopify: 'Shopify',
  skyvern: 'Automation (Skyvern)',
  research: 'Research / Web',
  finance: 'Finanzas',
  documents: 'Documentos / PDF',
  memory: 'Memoria',
  delegation: 'Delegación',
  utilities: 'Utilidades',
  general: 'General'
}

const MODEL_OPTIONS = [
  'gpt-4o-mini',
  'gpt-4o',
  'claude-3-haiku-20240307',
  'grok-2-mini',
]

const TEMPLATE_OPTIONS = [
  { id: 'basic', label: 'Básico rápido', desc: 'Prompt base minimalista' },
  { id: 'research', label: 'Research', desc: 'Síntesis y fuentes' },
  { id: 'planner', label: 'Planner', desc: 'Planificación estratégica' },
  { id: 'writer', label: 'Writer', desc: 'Redacción y edición' },
]

export interface DialogCreateAgentProps {
  isOpen: boolean
  setIsOpenAction: (v: boolean) => void
}

export function DialogCreateAgent({ isOpen, setIsOpenAction }: DialogCreateAgentProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [template, setTemplate] = useState('basic')
  const [selectedTools, setSelectedTools] = useState<string[]>(['webSearch'])
  const [loadingTools, setLoadingTools] = useState(false)
  const [allTools, setAllTools] = useState<UIToolMeta[]>([])
  const [toolCategoryOpen, setToolCategoryOpen] = useState<Record<string, boolean>>({})
  const [connections, setConnections] = useState<Record<string, { connected: boolean; account?: string | null }>>({})
  const [checkingConnections, setCheckingConnections] = useState(false)
  const [showConnectDrawer, setShowConnectDrawer] = useState<string | null>(null)
  // Fetch connection statuses + tool metadata when modal opens
  useEffect(() => {
    if (isOpen) {
      setCheckingConnections(true)
      setLoadingTools(true)
      Promise.all([
        fetchClient('/api/connections/status').then(r => r.json()).catch(() => ({})),
        fetchClient('/api/tools/list').then(r => r.json()).catch(() => ({ tools: [] }))
      ]).then(([connData, toolData]) => {
        setConnections(connData)
        const fetched: FetchedToolMeta[] = toolData.tools || []
        const mapped: UIToolMeta[] = fetched.map(t => ({
          id: t.name,
            label: t.name
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/_/g, ' ')
              .replace(/-/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase()),
          capability: t.description?.slice(0, 140) || 'Tool sin descripción.',
          requiresConnection: t.requiresConnection,
          category: t.category
        }))
        setAllTools(mapped)
        // Initialize collapsed state per category
        const catState: Record<string, boolean> = {}
        for (const cat of new Set(mapped.map(m => m.category))) {
          catState[cat] = true // expanded by default
        }
        setToolCategoryOpen(catState)
      }).finally(() => { setCheckingConnections(false); setLoadingTools(false) })
    }
  }, [isOpen])

  const [customPrompt, setCustomPrompt] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [error, setError] = useState<string | null>(null)

  const canContinueStep1 = name.trim().length >= 2
  const canContinueStep2 = description.trim().length >= 5
  const canContinueStep3 = selectedTools.length >= 0 // allow zero tools

  const previewPrompt = useMemo(() => {
    if (customPrompt.trim()) return customPrompt.trim()
    const base = description || 'Agente especializado.'
    // Rebranding: use Kylio instead of Cleo when referencing the supervisor implicitly (not by id)
    const supervisorName = 'Kylio'
    switch (template) {
      case 'research': return `Eres ${name}. Especialista en investigación y síntesis útil. ${base}`
      case 'planner': return `Eres ${name}. Planificador estratégico, divides objetivos y evalúas riesgos. ${base}`
      case 'writer': return `Eres ${name}. Asistente de escritura que propone estructura y refina estilo. ${base}`
      default: return `Eres ${name}. ${base} Colabora con ${supervisorName} y responde con claridad y próximos pasos.`
    }
  }, [name, description, template, customPrompt])

  // Auto-generator: produce un prompt estructurado según entradas
  const generatePrompt = useCallback(() => {
    const nameStr = name.trim() || 'Agente'
    const descStr = description.trim() || 'Agente especializado.'
    const toolsDesc = selectedTools.map(id => {
      const meta = allTools.find(tp => tp.id === id)
      if (!meta) return '• Capacidad general.'
      const conn = meta.requiresConnection ? connections[meta.requiresConnection] : null
      const connSuffix = meta.requiresConnection ? (conn?.connected ? '' : ' (requiere conexión pendiente)') : ''
      return `• ${meta.capability}${connSuffix}`
    }).join('\n')

    const behaviorHints = (() => {
      switch (template) {
        case 'research': return '1) Comienza con 3-5 preguntas de aclaración si faltan detalles. 2) Busca fuentes confiables, contrasta y cita con viñetas. 3) Sintetiza en insights accionables con pros/cons.'
        case 'planner': return '1) Entiende el objetivo y restricciones. 2) Propón milestones con estimaciones y riesgos. 3) Pide confirmación antes de ejecutar.'
        case 'writer': return '1) Propón estructura (índice) y tono. 2) Itera: borrador → revisión → versión final. 3) Mantén consistencia estilística.'
        default: return '1) Pide aclaraciones cuando sea necesario. 2) Divide problemas en pasos pequeños. 3) Ofrece siguientes pasos claros.'
      }
    })()

    const outputFormat = '- Respuesta en Markdown con títulos y listas claras.\n- Incluye al final “Siguientes pasos” (3 bullets).'

  const promptStr = `Rol: ${nameStr}\n\nCoordinación: Trabajas junto al supervisor Kylio (id interno cleo-supervisor) para delegar y colaborar.\n\nDescripción: ${descStr}\n\nCapacidades:\n${toolsDesc || '• Capacidades básicas de asistencia y análisis.'}\n\nComportamiento operativo:\n${behaviorHints}\n\nPolíticas generales:\n- Sé conciso, directo y proactivo.\n- Explica el porqué cuando tomes decisiones.\n- Evita alucinar; si no sabes, indica cómo lo investigarías.\n\nFormato de salida:\n${outputFormat}`

    setCustomPrompt(promptStr)
    if (step < 3) setStep(3)
  }, [name, description, selectedTools, template, step])

  const toggleTool = useCallback((id: string) => {
    setSelectedTools(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }, [])

  const resetAll = () => {
    setStep(1)
    setName('')
    setDescription('')
    setModel('gpt-4o-mini')
    setTemplate('basic')
  setSelectedTools(['webSearch'])
    setCustomPrompt('')
    setColor('#6366f1')
    setError(null)
  }

  const quickCreateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        role: 'specialist',
        model: normalizeModelId(model),
        tools: selectedTools,
        prompt: previewPrompt,
        color,
        quickTemplate: template !== 'basic' ? template : undefined,
      }
      const res = await fetchClient('/api/agents/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error creando agente')
      return data as { agent: { id: string; name: string }; chatId: string }
    },
    onSuccess: (data) => {
      setIsOpenAction(false)
      resetAll()
      router.push(`/c/${data.chatId}`)
    },
    onError: (err: any) => {
      setError(err?.message || 'Error desconocido')
    }
  })

  const handleNext = () => setStep(s => Math.min(s + 1, 4))
  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) setIsOpenAction(false) }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear agente personalizado</DialogTitle>
          <DialogDescription>Despliega un agente en menos de 2 minutos. 4 pasos rápidos.</DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-4 text-xs">
            {[1,2,3,4].map(n => (
              <div key={n} className={`flex-1 h-1 rounded-full ${n <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block">Nombre</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Atlas" autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Modelo</label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block">Descripción / Rol</label>
                <Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Qué hace y para qué sirve" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Plantilla rápida</label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATE_OPTIONS.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTemplate(tpl.id)}
                      className={`rounded-md border px-2 py-2 text-left text-xs hover:bg-muted transition ${template === tpl.id ? 'border-primary bg-primary/10' : 'border-border'}`}
                    >
                      <div className="font-medium mb-0.5">{tpl.label}</div>
                      <div className="opacity-70 text-[11px] leading-tight">{tpl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block">Tools opcionales</label>
                {loadingTools && <div className="text-[10px] opacity-60 mb-2">Cargando tools...</div>}
                {!loadingTools && allTools.length === 0 && (
                  <div className="text-[11px] opacity-70">No se encontró ningún tool.</div>
                )}
                <div className="space-y-3 max-h-72 overflow-auto pr-1 border rounded-md p-2 bg-background/40">
                  {Object.entries(
                    allTools.reduce<Record<string, UIToolMeta[]>>((acc, t) => {
                      (acc[t.category] ||= []).push(t); return acc
                    }, {})
                  ).sort((a,b) => a[0].localeCompare(b[0])).map(([category, items]) => {
                    const open = toolCategoryOpen[category]
                    return (
                      <div key={category} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setToolCategoryOpen(s => ({ ...s, [category]: !open }))}
                          className="flex items-center justify-between w-full text-[11px] font-semibold py-1 px-1 rounded hover:bg-muted/60"
                        >
                          <span>{CATEGORY_LABELS[category] || category} <span className="opacity-50 font-normal">({items.length})</span></span>
                          <span className="text-xs">{open ? '−' : '+'}</span>
                        </button>
                        {open && (
                          <div className="grid grid-cols-2 gap-2 pl-1">
                            {items.map(tool => {
                              const active = selectedTools.includes(tool.id)
                              const requires = tool.requiresConnection
                              const conn = requires ? connections[requires] : undefined
                              const needsConnect = requires && !conn?.connected
                              return (
                                <div key={tool.id} className={`border rounded-md p-2 flex flex-col gap-1 bg-background/50 ${active ? 'border-primary' : 'border-border'}`}>
                                  <button
                                    type="button"
                                    onClick={() => toggleTool(tool.id)}
                                    className={`flex justify-between items-center text-[10px] font-medium ${active ? 'text-primary' : ''}`}
                                  >
                                    <span className="truncate" title={tool.label}>{tool.label}</span>
                                    <span className={`inline-block size-2 rounded-full ${active ? 'bg-primary' : 'bg-muted-foreground/30'}`}></span>
                                  </button>
                                  <p className="text-[9px] leading-tight opacity-70 line-clamp-3" title={tool.capability}>{tool.capability}</p>
                                  {requires && (
                                    <div className="flex items-center gap-1 mt-1">
                                      {needsConnect ? (
                                        <button
                                          type="button"
                                          onClick={() => setShowConnectDrawer(requires)}
                                          className="text-[9px] px-1 py-0.5 rounded border border-destructive/40 text-destructive hover:bg-destructive/10"
                                        >Conectar</button>
                                      ) : (
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Conectado</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {checkingConnections && (
                  <div className="text-[10px] mt-2 opacity-60">Verificando conexiones...</div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium block">Prompt personalizado (opcional)</label>
                  <Button type="button" size="sm" variant="outline" onClick={generatePrompt}>
                    <MagicWand className="mr-1" size={14} /> {t.sidebar.generatePrompt}
                  </Button>
                </div>
                <Textarea rows={6} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Genera el prompt automáticamente o edítalo a tu gusto" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Color</label>
                <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-20 p-1" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-muted/40">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkle size={16} weight="duotone" />
                  <span className="text-xs font-semibold">Preview final</span>
                </div>
                <div className="text-sm font-medium mb-1">{name || 'Sin nombre'}</div>
                <div className="text-xs mb-2 opacity-80">Modelo: {model} · Tools: {selectedTools.length ? selectedTools.join(', ') : 'Ninguno'}</div>
                <div className="text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-auto border-t pt-2 font-mono bg-background/40">
                  {previewPrompt}
                </div>
              </div>
              {error && (
                <div className="text-xs text-red-600 flex items-center gap-1"><XCircle size={14} /> {error}</div>
              )}
              <div className="text-[11px] opacity-60">Al crear el agente se abrirá automáticamente un chat con saludo inicial.</div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={handleBack}>Atrás</Button>
            )}
          </div>
          {step < 4 && (
            <Button
              type="button"
              size="sm"
              disabled={(step===1 && !canContinueStep1) || (step===2 && !canContinueStep2) || (step===3 && !canContinueStep3)}
              onClick={handleNext}
            >
              Siguiente <ArrowRight className="ml-1" size={14} />
            </Button>
          )}
          {step === 4 && (
            <Button
              type="button"
              size="sm"
              disabled={quickCreateMutation.isPending || !name.trim()}
              onClick={() => quickCreateMutation.mutate()}
            >
              {quickCreateMutation.isPending ? 'Creando...' : 'Desplegar'} {quickCreateMutation.isSuccess && <CheckCircle size={14} className="ml-1" />}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      {/* Simple connect drawer */}
      {showConnectDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1" onClick={() => setShowConnectDrawer(null)} />
          <div className="w-80 bg-background border-l border-border p-4 flex flex-col gap-3 shadow-xl animate-in slide-in-from-right">
            <h3 className="text-sm font-semibold mb-1">Conectar servicio</h3>
            <p className="text-xs opacity-70">Servicio: {showConnectDrawer}</p>
            <p className="text-xs">Para usar estas tools necesitas vincular tu cuenta. Abre configuración para añadir credenciales/API keys.</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => setShowConnectDrawer(null)}>Cerrar</Button>
              <Button size="sm" onClick={() => {
                // Navegar a settings (personality placeholder or future integrations tab)
                window.location.href = '/integrations'
              }}>Ir a Integraciones</Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  )
}

"use client"

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sparkle, ArrowRight, CheckCircle, XCircle, MagicWand, CalendarBlank, FolderOpen, FileText, Presentation, Table, EnvelopeSimple, NotePencil, TwitterLogo, InstagramLogo, FacebookLogo, TelegramLogo, ShoppingCart, Robot, MagnifyingGlass, CurrencyCircleDollar, Files, Brain, Users, Wrench } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { fetchClient } from '@/lib/fetch'
import { normalizeModelId } from '@/lib/openproviders/provider-map'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { motion } from 'framer-motion'

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

const CATEGORY_ICONS: Record<string, any> = {
  google_calendar: CalendarBlank,
  google_drive: FolderOpen,
  google_docs: FileText,
  google_slides: Presentation,
  google_sheets: Table,
  gmail: EnvelopeSimple,
  notion: NotePencil,
  twitter: TwitterLogo,
  instagram: InstagramLogo,
  facebook: FacebookLogo,
  telegram: TelegramLogo,
  shopify: ShoppingCart,
  skyvern: Robot,
  research: MagnifyingGlass,
  finance: CurrencyCircleDollar,
  documents: Files,
  memory: Brain,
  delegation: Users,
  utilities: Wrench,
  general: Wrench
}

// Restricted model list for Quick Agent Creator
// Only allow: gpt-4o-mini, gpt-5, grok-4-1-fast-reasoning, gemini-2.5-flash-lite (OpenRouter)
const MODEL_OPTIONS = [
  'gpt-4o-mini',
  'gpt-5',
  'grok-4-1-fast-reasoning',
  'google/gemini-2.5-flash-lite', // available via OpenRouter
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
  const [selectedTools, setSelectedTools] = useState<string[]>(['webSearch', 'complete_task', 'get_current_date_time'])
  const [loadingTools, setLoadingTools] = useState(false)
  const [allTools, setAllTools] = useState<UIToolMeta[]>([])
  const [toolCategoryOpen, setToolCategoryOpen] = useState<Record<string, boolean>>({})
  const [connections, setConnections] = useState<Record<string, { connected: boolean; account?: string | null }>>({})
  const [checkingConnections, setCheckingConnections] = useState(false)
  const [showConnectDrawer, setShowConnectDrawer] = useState<string | null>(null)
  const [toolSearchQuery, setToolSearchQuery] = useState('')
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [createdAgentData, setCreatedAgentData] = useState<{ agent: { id: string; name: string; icon?: string; color?: string; model?: string }; chatId: string } | null>(null)
  const [sendingWelcomeMessage, setSendingWelcomeMessage] = useState(false)
  
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
    // Prevent disabling required tools
    const requiredTools = ['complete_task', 'get_current_date_time']
    if (requiredTools.includes(id)) return
    
    setSelectedTools(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }, [])

  const resetAll = () => {
    setStep(1)
    setName('')
    setDescription('')
    setModel('gpt-4o-mini')
    setTemplate('basic')
    setSelectedTools(['webSearch', 'complete_task', 'get_current_date_time'])
    setCustomPrompt('')
    setColor('#6366f1')
    setError(null)
    setToolSearchQuery('')
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
      return data as { agent: { id: string; name: string; icon?: string; color?: string; model?: string }; chatId: string }
    },
    onSuccess: (data) => {
      setCreatedAgentData(data)
      setShowSuccessDialog(true)
      setIsOpenAction(false)
      resetAll()
    },
    onError: (err: any) => {
      setError(err?.message || 'Error desconocido')
    }
  })

  const handleNext = () => setStep(s => Math.min(s + 1, 4))
  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) setIsOpenAction(false) }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
                <label className="text-xs font-medium mb-2 block">Tools opcionales</label>
                
                {/* Search filter */}
                <div className="mb-3">
                  <Input 
                    type="text" 
                    placeholder="Buscar tools..." 
                    value={toolSearchQuery}
                    onChange={(e) => setToolSearchQuery(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                
                {loadingTools && <div className="text-xs opacity-60 mb-2">Cargando tools...</div>}
                {!loadingTools && allTools.length === 0 && (
                  <div className="text-xs opacity-70">No se encontró ningún tool.</div>
                )}
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 border rounded-md p-3 bg-muted/20">
                  {Object.entries(
                    allTools
                      .filter(tool => {
                        if (!toolSearchQuery.trim()) return true
                        const query = toolSearchQuery.toLowerCase()
                        return tool.label.toLowerCase().includes(query) || 
                               tool.capability.toLowerCase().includes(query) ||
                               tool.category.toLowerCase().includes(query)
                      })
                      .reduce<Record<string, UIToolMeta[]>>((acc, t) => {
                        (acc[t.category] ||= []).push(t); return acc
                      }, {})
                  ).sort((a,b) => a[0].localeCompare(b[0])).map(([category, items]) => {
                    const open = toolCategoryOpen[category]
                    const CategoryIcon = CATEGORY_ICONS[category] || Wrench
                    return (
                      <div key={category} className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setToolCategoryOpen(s => ({ ...s, [category]: !open }))}
                          className="flex items-center gap-2 w-full text-xs font-semibold py-1.5 px-2 rounded-md hover:bg-muted/80 transition-colors"
                        >
                          <CategoryIcon size={14} weight="duotone" className="text-primary/80" />
                          <span className="flex-1 text-left">{CATEGORY_LABELS[category] || category}</span>
                          <span className="text-[10px] opacity-60 font-normal">({items.length})</span>
                          <span className="text-sm font-bold">{open ? '−' : '+'}</span>
                        </button>
                        {open && (
                          <div className="grid grid-cols-1 gap-2 pl-6">
                            {items.map(tool => {
                              const active = selectedTools.includes(tool.id)
                              const requires = tool.requiresConnection
                              const conn = requires ? connections[requires] : undefined
                              const needsConnect = requires && !conn?.connected
                              const isRequired = tool.id === 'complete_task' || tool.id === 'get_current_date_time'
                              return (
                                <div key={tool.id} className={`border rounded-md p-2.5 flex flex-col gap-1.5 transition-all ${active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background/50 hover:border-border/60'} ${isRequired ? 'opacity-100' : ''}`}>
                                  <button
                                    type="button"
                                    onClick={() => toggleTool(tool.id)}
                                    disabled={isRequired}
                                    className={`flex justify-between items-center text-xs font-medium ${active ? 'text-primary' : 'text-foreground'} ${isRequired ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    <span className="truncate flex items-center gap-1.5" title={tool.label}>
                                      {tool.label}
                                      {isRequired && <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Requerido</span>}
                                    </span>
                                    <span className={`inline-block size-3 rounded-full transition-colors ${active ? 'bg-primary' : 'bg-muted-foreground/30'}`}></span>
                                  </button>
                                  <p className="text-[10px] leading-snug opacity-75 line-clamp-2" title={tool.capability}>{tool.capability}</p>
                                  {requires && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {needsConnect ? (
                                        <button
                                          type="button"
                                          onClick={() => setShowConnectDrawer(requires)}
                                          className="text-[10px] px-2 py-1 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 font-medium transition-colors"
                                        >Conectar</button>
                                      ) : (
                                        <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">✓ Conectado</span>
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
                  {toolSearchQuery.trim() && Object.keys(
                    allTools
                      .filter(tool => {
                        const query = toolSearchQuery.toLowerCase()
                        return tool.label.toLowerCase().includes(query) || 
                               tool.capability.toLowerCase().includes(query) ||
                               tool.category.toLowerCase().includes(query)
                      })
                      .reduce<Record<string, UIToolMeta[]>>((acc, t) => {
                        (acc[t.category] ||= []).push(t); return acc
                      }, {})
                  ).length === 0 && (
                    <div className="text-xs opacity-60 text-center py-4">
                      No se encontraron tools que coincidan con "{toolSearchQuery}"
                    </div>
                  )}
                </div>
                {checkingConnections && (
                  <div className="text-xs mt-2 opacity-60">Verificando conexiones...</div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium block">Prompt personalizado (opcional)</label>
                  <Button type="button" size="sm" variant="outline" onClick={generatePrompt}>
                    <MagicWand className="mr-1" size={14} /> {t.sidebar.generatePrompt}
                  </Button>
                </div>
                <Textarea 
                  value={customPrompt} 
                  onChange={e => setCustomPrompt(e.target.value)} 
                  placeholder="Genera el prompt automáticamente o edítalo a tu gusto" 
                  className="min-h-[140px] max-h-[140px] resize-none overflow-y-auto font-mono text-xs leading-relaxed"
                />
                <p className="text-[10px] opacity-60 mt-1.5">Usa scroll para leer el prompt completo</p>
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
                <div className="flex items-center gap-2 mb-3">
                  <Sparkle size={16} weight="duotone" className="text-primary" />
                  <span className="text-xs font-semibold">Preview final</span>
                </div>
                <div className="text-sm font-semibold mb-1">{name || 'Sin nombre'}</div>
                <div className="text-xs mb-3 opacity-80">
                  <span className="font-medium">Modelo:</span> {model} · <span className="font-medium">Tools:</span> {selectedTools.length ? selectedTools.length : 'Ninguno'}
                </div>
                <div className="text-[11px] whitespace-pre-wrap leading-relaxed h-40 overflow-y-auto border-t pt-2 font-mono bg-background/60 rounded-md p-2">
                  {previewPrompt}
                </div>
                <p className="text-[10px] opacity-60 mt-2">Usa scroll para leer el prompt completo</p>
              </div>
              {error && (
                <div className="text-xs text-red-600 flex items-center gap-1"><XCircle size={14} /> {error}</div>
              )}
              <div className="text-xs opacity-70 bg-blue-500/10 border border-blue-500/20 rounded-md p-2">
                💡 Al crear el agente se abrirá automáticamente un chat con saludo inicial.
              </div>
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

    {/* Success Confirmation Dialog */}
    <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-500/10 rounded-full">
              <CheckCircle size={32} className="text-green-500" weight="fill" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">¡Agente desplegado con éxito!</DialogTitle>
            </div>
          </div>
        </DialogHeader>
        
        {createdAgentData && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: createdAgentData.agent.color || '#6366f1' }}
              >
                {createdAgentData.agent.icon || '🤖'}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{createdAgentData.agent.name}</div>
                <div className="text-xs text-muted-foreground">
                  {createdAgentData.agent.model || 'gpt-4o-mini'} · {selectedTools.length} herramientas
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                <span>Agente registrado y disponible en el sistema</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                <span>Chat creado con mensaje de bienvenida</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                <span>Listo para recibir tu primera consulta</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSuccessDialog(false)}
            disabled={sendingWelcomeMessage}
          >
            Cerrar
          </Button>
          <Button 
            size="sm"
            disabled={sendingWelcomeMessage}
            onClick={async () => {
              if (!createdAgentData?.chatId || !createdAgentData?.agent) return
              
              setSendingWelcomeMessage(true)
              try {
                // Dynamic, personalized welcome prompt inspired by UX best practices
                const welcomePrompt = `¡Acabo de crear mi nuevo agente "${createdAgentData.agent.name}"! 
                
Su especialidad es: ${description || 'asistente inteligente'}.

Preséntalo de forma amigable y entusiasta. Explica brevemente qué puede hacer por mí y hazme una pregunta sobre cómo puedo empezar a usarlo. Máximo 3-4 líneas. Usa emojis relevantes. ✨`
                
                // Send message and wait for response to start before redirecting
                const response = await fetchClient('/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chatId: createdAgentData.chatId,
                    messages: [{ role: 'user', content: welcomePrompt }],
                    model: 'gpt-4o-mini', // Fastest model
                    stream: true, // Enable streaming
                  })
                })
                
                // Wait a tiny bit for the stream to start (200ms)
                // This ensures Kylio is already "typing" when user arrives
                await new Promise(resolve => setTimeout(resolve, 200))
                
                // Redirect - user will see Kylio responding in real-time
                router.push(`/c/${createdAgentData.chatId}`)
                setShowSuccessDialog(false)
              } catch (error) {
                console.error('Error sending welcome message:', error)
                // Even if message fails, still redirect to chat
                router.push(`/c/${createdAgentData.chatId}`)
                setShowSuccessDialog(false)
              } finally {
                setSendingWelcomeMessage(false)
              }
            }}
          >
            {sendingWelcomeMessage ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  ⚡
                </motion.div>
                Conectando con Kylio...
              </>
            ) : (
              <>
                Ir al chat <ArrowRight size={14} className="ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}



'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  BrainIcon,
  RobotIcon,
  CopyIcon,
  XIcon
} from '@phosphor-icons/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AgentConfig, AgentRole } from '@/lib/agents/types'
import Image from 'next/image'
import { Markdown } from '@/components/prompt-kit/markdown'
import { useModel } from '@/lib/model-store/provider'

// Tool information for the agent details modal
interface ToolInfo {
  name: string
  description: string
  category: string
  useCases: string[]
  icon?: string
}

const TOOL_REGISTRY: Record<string, ToolInfo> = {
  // Web & Search Tools
  'webSearch': {
    name: 'Web Search',
    description: 'Search the internet for current information and resources',
    category: 'Web & Search',
  useCases: ['Market research', 'Latest news', 'Technical documentation', 'Industry trends'],
  icon: '/icons/internet.png'
  },

  // Google Workspace Tools
  'listCalendarEvents': {
    name: 'Calendar Events',
    description: 'List and view Google Calendar events',
    category: 'Google Workspace',
  useCases: ['Schedule management', 'Meeting planning', 'Event tracking'],
  icon: '/icons/google-calendar.svg'
  },
  'createCalendarEvent': {
    name: 'Create Calendar Event',
    description: 'Create new events in Google Calendar',
    category: 'Google Workspace',
  useCases: ['Meeting scheduling', 'Reminder creation', 'Event planning'],
  icon: '/icons/google-calendar.svg'
  },
  'listDriveFiles': {
    name: 'Drive File List',
    description: 'List files and folders in Google Drive',
    category: 'Google Workspace',
  useCases: ['File organization', 'Document discovery', 'Asset management'],
  icon: '/icons/google-drive.svg'
  },
  'searchDriveFiles': {
    name: 'Drive File Search',
    description: 'Search for specific files in Google Drive',
    category: 'Google Workspace',
  useCases: ['Document retrieval', 'Content search', 'File location'],
  icon: '/icons/google-drive.svg'
  },
  'getDriveFileDetails': {
    name: 'Drive File Details',
    description: 'Get detailed information about Drive files',
    category: 'Google Workspace',
  useCases: ['File analysis', 'Metadata review', 'Version tracking'],
  icon: '/icons/google-drive.svg'
  },
  'listGmailMessages': {
    name: 'Gmail Messages',
    description: 'List and filter Gmail messages',
    category: 'Google Workspace',
  useCases: ['Email management', 'Communication tracking', 'Inbox organization'],
  icon: '/icons/gmail-icon.svg'
  },
  'getGmailMessage': {
    name: 'Gmail Message Details',
    description: 'Get detailed Gmail message information',
    category: 'Google Workspace',
  useCases: ['Email analysis', 'Content review', 'Message tracking'],
  icon: '/icons/gmail-icon.svg'
  },
  'sendGmailMessage': {
    name: 'Send Gmail',
    description: 'Send email messages through Gmail',
    category: 'Google Workspace',
  useCases: ['Email communication', 'Automated responses', 'Notifications'],
  icon: '/icons/gmail-icon.svg'
  },

  // Shopify E-commerce Tools
  'shopifyGetProducts': {
    name: 'Shopify Products',
    description: 'Retrieve product listings and details from Shopify stores',
    category: 'E-commerce',
  useCases: ['Inventory management', 'Product analysis', 'Catalog review', 'Price monitoring'],
  icon: '/icons/shopify.png'
  },
  'shopifyGetOrders': {
    name: 'Shopify Orders',
    description: 'Access order data and transaction history',
    category: 'E-commerce',
  useCases: ['Sales tracking', 'Order fulfillment', 'Revenue analysis', 'Customer orders'],
  icon: '/icons/shopify.png'
  },
  'shopifyGetAnalytics': {
    name: 'Shopify Analytics',
    description: 'Generate business insights and performance metrics',
    category: 'E-commerce',
  useCases: ['Sales reporting', 'Performance analysis', 'Business intelligence', 'Growth metrics'],
  icon: '/icons/shopify.png'
  },
  'shopifyGetCustomers': {
    name: 'Shopify Customers',
    description: 'Manage customer data and profiles',
    category: 'E-commerce',
  useCases: ['Customer management', 'CRM integration', 'User analytics', 'Support assistance'],
  icon: '/icons/shopify.png'
  },
  'shopifySearchProducts': {
    name: 'Product Search',
    description: 'Search and filter products within Shopify stores',
    category: 'E-commerce',
  useCases: ['Product discovery', 'Inventory search', 'Catalog filtering', 'Stock checking'],
  icon: '/icons/shopify.png'
  },

  // Document & Content Tools
  'createDocument': {
    name: 'Create Document',
    description: 'Generate new documents and content',
    category: 'Content Creation',
  useCases: ['Report generation', 'Content creation', 'Documentation', 'Template building'],
  icon: '/icons/docs.png'
  },
  'openDocument': {
    name: 'Open Document',
    description: 'Access and read existing documents',
    category: 'Content Management',
  useCases: ['Document review', 'Content analysis', 'File access', 'Information retrieval'],
  icon: '/icons/docs.png'
  },

  // Memory & AI Tools
  'memoryAddNote': {
    name: 'Add Memory Note',
    description: 'Store important information for future reference',
    category: 'AI Memory',
  useCases: ['Information retention', 'Context preservation', 'Knowledge base', 'Personal notes'],
  icon: '/icons/notes.png'
  },
  'analyze_emotion': {
    name: 'Emotion Analysis',
    description: 'Analyze emotional context and sentiment',
    category: 'AI Intelligence',
  useCases: ['Sentiment analysis', 'Mood detection', 'Emotional support', 'Communication insights'],
  icon: '/icons/analyze_emotional.png'
  },
  'provide_support': {
    name: 'Emotional Support',
    description: 'Provide empathetic responses and emotional assistance',
    category: 'AI Intelligence',
  useCases: ['Mental wellness', 'Empathetic communication', 'Support conversations', 'Care assistance'],
  icon: '/icons/emotional_support.png'
  },

  // Delegation Tools
  'delegate_to_toby': {
    name: 'Delegate to Toby',
    description: 'Assign technical and research tasks to Toby specialist',
    category: 'Task Delegation',
  useCases: ['Technical analysis', 'Data research', 'Information processing', 'Expert consultation'],
  icon: '/img/agents/toby4.png'
  },
  'delegate_to_ami': {
    name: 'Delegate to Ami',
    description: 'Assign creative tasks to Ami specialist',
    category: 'Task Delegation',
  useCases: ['Creative projects', 'Design work', 'Content creation', 'Artistic tasks'],
  icon: '/img/agents/ami4.png'
  },
  'delegate_to_peter': {
    name: 'Delegate to Peter',
    description: 'Assign logical and mathematical tasks to Peter specialist',
    category: 'Task Delegation',
  useCases: ['Problem solving', 'Mathematical calculations', 'Logic puzzles', 'Analytical tasks'],
  icon: '/img/agents/peter4.png'
  },
  'delegate_to_emma': {
    name: 'Delegate to Emma',
    description: 'Assign e-commerce and business tasks to Emma specialist',
    category: 'Task Delegation',
  useCases: ['E-commerce management', 'Sales analysis', 'Business operations', 'Store management'],
  icon: '/img/agents/emma4.png'
  },
  'delegate_to_apu': {
    name: 'Delegate to Apu',
    description: 'Assign research and intelligence tasks to Apu specialist',
    category: 'Task Delegation',
    useCases: ['Web research', 'Market analysis', 'News synthesis', 'Competitive intelligence'],
    icon: '/img/agents/apu4.png'
  },
  'complete_task': {
    name: 'Complete Task',
    description: 'Mark task as complete and return to coordinator',
    category: 'Task Management',
  useCases: ['Task completion', 'Workflow management', 'Process control', 'Status updates'],
  icon: '/icons/completion_task.png'
  }
}

interface AgentCRUDPanelProps {
  agents: AgentConfig[]
  onCreateAgent: (agent: Partial<AgentConfig>) => void
  onUpdateAgent: (id: string, agent: Partial<AgentConfig>) => void
  onDeleteAgent: (id: string) => void
}

// Function to generate delegation tools for Cleo based on available agents
const generateDelegationTools = (agents: AgentConfig[]) => {
  const baseDelegationTools = ['analyze_emotion', 'provide_support']
  const dynamicDelegationTools = agents
    .filter(agent => agent.id !== 'cleo-supervisor' && agent.role === 'specialist')
    .map(agent => `delegate_to_${agent.name.toLowerCase()}`)
  
  return [...baseDelegationTools, ...dynamicDelegationTools]
}

// Function to update Cleo's delegation capabilities
const updateCleoWithNewAgent = async (newAgentName: string, agents: AgentConfig[]) => {
  const cleoAgent = agents.find(agent => agent.id === 'cleo-supervisor')
  if (!cleoAgent) return

  // Generate updated tools list
  const updatedTools = generateDelegationTools([...agents, { name: newAgentName, role: 'specialist' } as AgentConfig])
  
  // Update Cleo's prompt to include the new agent
  const currentPrompt = cleoAgent.prompt || ''
  const newAgentLine = `- **${newAgentName}**: Custom specialist agent (trigger with: "${newAgentName.toLowerCase()}", "custom", "specialized")`
  
  // Find the delegation section and add the new agent
  const updatedPrompt = currentPrompt.includes('**Your Specialized Sub-Agents:**') 
    ? currentPrompt.replace(
        /(\*\*Your Specialized Sub-Agents:\*\*[\s\S]*?)(\n\n\*\*Delegation Guidelines:\*\*)/,
        `$1\n${newAgentLine}$2`
      )
    : currentPrompt + `\n\n**New Agent Added:**\n${newAgentLine}`

  return {
    tools: updatedTools,
    prompt: updatedPrompt
  }
}

export function AgentCRUDPanel({ agents, onCreateAgent, onUpdateAgent, onDeleteAgent }: AgentCRUDPanelProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [detailsAgent, setDetailsAgent] = useState<AgentConfig | null>(null)
  const [toolSearch, setToolSearch] = useState('')
  const [toolCategory, setToolCategory] = useState<string>('All')
  // Guard for IME composition to prevent cursor jumps
  const isComposingRef = React.useRef(false)
  
  const [formData, setFormData] = useState({
    name: '',
    role: 'specialist' as AgentRole,
  specialization: 'technical' as 'technical' | 'creative' | 'logical' | 'research' | 'custom',
    prompt: 'You are a helpful AI assistant.',
    description: '',
    tags: [] as string[],
  tools: ['complete_task'] as string[],
  model: '',
    temperature: 0.7,
    maxTokens: 2000,
    color: '#8B5CF6',
    icon: 'brain',
    parentAgentId: '' as string | ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      role: 'specialist' as AgentRole,
  specialization: 'technical',
      prompt: 'You are a helpful AI assistant.',
      description: '',
      tags: [],
  tools: ['complete_task'],
  model: '',
      temperature: 0.7,
      maxTokens: 2000,
      color: '#8B5CF6',
      icon: 'brain',
      parentAgentId: ''
    })
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.role) return
    
  const newAgent = {
      ...formData,
      id: `agent-${Date.now()}`
    }
    
    // Create the new agent
    onCreateAgent(newAgent)
    
    // Update Cleo's delegation capabilities if the new agent is a specialist
    if (formData.role === 'specialist') {
      try {
        const cleoUpdates = await updateCleoWithNewAgent(formData.name, agents)
        if (cleoUpdates) {
          onUpdateAgent('cleo-supervisor', cleoUpdates)
        }
        // If parent agent selected, try to update that agent's tools list too (client-side UX)
        if (formData.parentAgentId) {
          const parent = agents.find(a => a.id === formData.parentAgentId)
          if (parent) {
            const normalizedId = newAgent.id.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
            const toolName = `delegate_to_${normalizedId}`
            const ptools = Array.from(new Set([...(parent.tools || []), toolName]))
            onUpdateAgent(parent.id, { tools: ptools })
          }
        }
      } catch (error) {
        console.error('Failed to update Cleo delegation capabilities:', error)
      }
    }
    
    setIsCreateDialogOpen(false)
    resetForm()
  }

  const handleEdit = (agent: AgentConfig) => {
    setEditingAgent(agent)
    setFormData({
      name: agent.name || '',
      role: agent.role || 'specialist',
      specialization: (agent.tags?.includes('technical') || agent.tags?.includes('técnico')) ? 'technical'
        : (agent.tags?.includes('creative') || agent.tags?.includes('creativo')) ? 'creative'
        : (agent.tags?.includes('logical') || agent.tags?.includes('lógico')) ? 'logical'
        : (agent.tags?.includes('research') || agent.tags?.includes('investigación')) ? 'research'
        : 'custom',
      prompt: agent.prompt || 'You are a helpful AI assistant.',
      description: agent.description || '',
      tags: agent.tags || [],
      tools: Array.from(new Set([...(agent.tools || []), 'complete_task'])),
      model: agent.model || 'gpt-4',
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 2000,
      color: agent.color || '#8B5CF6',
  icon: agent.icon || 'brain',
  parentAgentId: ''
    })
  }

  // Duplicate an agent into the Create dialog (without ID)
  const handleCopyFromAgent = (agent: AgentConfig) => {
    const computedSpec: 'technical' | 'creative' | 'logical' | 'research' | 'custom' =
      (agent.tags?.includes('technical') || agent.tags?.includes('técnico')) ? 'technical'
      : (agent.tags?.includes('creative') || agent.tags?.includes('creativo')) ? 'creative'
      : (agent.tags?.includes('logical') || agent.tags?.includes('lógico')) ? 'logical'
      : (agent.tags?.includes('research') || agent.tags?.includes('investigación')) ? 'research'
      : 'custom'
    const copied = {
      name: agent.name ? `${agent.name} (Copy)` : '',
      role: agent.role || 'specialist',
      specialization: computedSpec,
      prompt: agent.prompt || 'You are a helpful AI assistant.',
      description: agent.description || '',
      tags: agent.tags || [],
      tools: Array.from(new Set([...(agent.tools || []), 'complete_task'])),
      model: agent.model || '',
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 2000,
      color: agent.color || '#8B5CF6',
      icon: agent.icon || 'brain',
      parentAgentId: '' as string | ''
    }
    setEditingAgent(null)
    setFormData(copied)
    setIsCreateDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!editingAgent?.id || !formData.name || !formData.role) return
    
    onUpdateAgent(editingAgent.id, formData)
    setEditingAgent(null)
    resetForm()
  }

  const handleDelete = (id: string) => {
    onDeleteAgent(id)
    setDeleteConfirm(null)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Prevent focus loss on controlled inputs by restoring focus after state updates
  const handleTextInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const el = e.target
    const elementId = el.id
    const selStart = (el as HTMLInputElement | HTMLTextAreaElement).selectionStart ?? undefined
    const selEnd = (el as HTMLInputElement | HTMLTextAreaElement).selectionEnd ?? undefined
    // Update state first
    const rawValue = el.value
    // Special case for tags input where we store as string[]
    const value: any = elementId === 'tags'
      ? rawValue.split(',').map((t) => t.trim()).filter(Boolean)
      : rawValue
    setFormData(prev => ({ ...prev, [field]: value }))

    // Restore focus on next frame to avoid Radix/Dialog focus juggling in re-renders
    requestAnimationFrame(() => {
      if (isComposingRef.current) return
      const nextEl = document.getElementById(elementId) as HTMLInputElement | HTMLTextAreaElement | null
      if (nextEl && document.activeElement !== nextEl) {
        try {
          nextEl.focus({ preventScroll: true })
          // Restore caret/selection if possible
          if (typeof selStart === 'number' && typeof selEnd === 'number' && nextEl.setSelectionRange) {
            nextEl.setSelectionRange(selStart, selEnd)
          }
        } catch {}
      }
    })
  }

  // Models context
  const { models } = useModel()

  // Tool catalog helpers
  const allCategories = React.useMemo(() => {
    const set = new Set<string>(['All'])
    Object.values(TOOL_REGISTRY).forEach(t => set.add(t.category))
    return Array.from(set)
  }, [])

  const filteredTools = React.useMemo(() => {
    const query = toolSearch.toLowerCase()
    return Object.entries(TOOL_REGISTRY).filter(([key, info]) => {
      const matchesCategory = toolCategory === 'All' || info.category === toolCategory
      const matchesQuery = !query || info.name.toLowerCase().includes(query) || info.description.toLowerCase().includes(query)
      return matchesCategory && matchesQuery
    })
  }, [toolSearch, toolCategory])

  // Helpers for enriched role/tag display
  const getSpecificRoleLabel = (agent: AgentConfig): { label: string; colorClass: string } => {
    const name = (agent.name || '').toLowerCase()
    if (agent.role === 'supervisor') return { label: 'Supervisor', colorClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30' }
    if (name.includes('toby')) return { label: 'Technical Specialist', colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
    if (name.includes('ami')) return { label: 'Creative Specialist', colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    if (name.includes('peter')) return { label: 'Logical Analyst', colorClass: 'bg-lime-500/20 text-lime-300 border-lime-500/30' }
    const tags = (agent.tags || []).map(t => t.toLowerCase())
    if (tags.some(t => ['technical','técnico','datos'].includes(t))) return { label: 'Technical Specialist', colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
    if (tags.some(t => ['creative','creativo','diseño','contenido'].includes(t))) return { label: 'Creative Specialist', colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    if (tags.some(t => ['logical','lógico','matemática','matemático'].includes(t))) return { label: 'Logical Analyst', colorClass: 'bg-lime-500/20 text-lime-300 border-lime-500/30' }
    if (agent.role === 'evaluator') return { label: 'Evaluator', colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
    if (agent.role === 'worker') return { label: 'Worker', colorClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
    return { label: 'Specialist', colorClass: 'bg-violet-500/20 text-violet-300 border-violet-500/30' }
  }

  const AgentForm = ({ isEdit = false }: { isEdit?: boolean }) => {
    const [promptView, setPromptView] = React.useState<'edit' | 'preview'>('edit')
    return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="basic">Básico</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
        <TabsTrigger value="prompt">Prompt</TabsTrigger>
        <TabsTrigger value="config">Config</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4">
        {/* Live Preview with Avatar and Icon/Emoji (real-time) */}
        <Card className="bg-slate-900/40 border-slate-700/50">
          <CardContent className="pt-4">
            {(() => {
              const name = (formData.name || '').toLowerCase()
              const avatar = name.includes('toby') ? '/img/agents/toby4.png'
                : name.includes('ami') ? '/img/agents/ami4.png'
                : name.includes('peter') ? '/img/agents/peter4.png'
                : name.includes('emma') ? '/img/agents/emma4.png'
                : name.includes('apu') ? '/img/agents/apu4.png'
                : name.includes('wex') ? '/img/agents/wex4.png'
                : name.includes('cleo') ? '/img/agents/logocleo4.png'
                : '/img/agents/logocleo4.png'
              const iconVal = (formData.icon || '').trim()
              const isUrlIcon = iconVal.startsWith('/') || iconVal.startsWith('http')
              const isEmojiIcon = !!iconVal && !isUrlIcon && iconVal.length <= 3
              return (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-14 w-14 rounded-xl ring-2 ring-slate-600/40">
                      <AvatarImage src={avatar} alt={formData.name || 'Agente'} className="object-cover rounded-xl" />
                      <AvatarFallback className="rounded-xl text-lg" style={{ backgroundColor: formData.color }}>
                        <BrainIcon className="w-6 h-6 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    {(isUrlIcon || isEmojiIcon) && (
                      <div
                        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border border-white/20 bg-slate-900/90 flex items-center justify-center shadow ring-1 ring-black/20"
                        style={{ outline: 'none' }}
                        aria-hidden
                      >
                        {isUrlIcon ? (
                          <Image src={iconVal} alt="icon" width={16} height={16} className="rounded" />
                        ) : (
                          <span className="text-base leading-none">{iconVal}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isEmojiIcon && (
                        <span className="text-lg" aria-hidden>{iconVal}</span>
                      )}
                      {isUrlIcon && (
                        <Image src={iconVal} alt="icon" width={16} height={16} className="rounded" />
                      )}
                      <span className="text-white font-medium">{formData.name || 'Nuevo Agente'}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-violet-500/10 text-violet-300 border-violet-500/30">
                        {formData.role}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs line-clamp-1">{formData.description || 'Descripción corta del agente'}</p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Agente</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={handleTextInputChange('name')}
            onCompositionStart={() => { isComposingRef.current = true }}
            onCompositionEnd={() => { isComposingRef.current = false }}
            placeholder="Mi Agente Especializado"
            className="bg-white/10 border-white/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role">Rol del agente</Label>
            <Select value={formData.role} onValueChange={(v) => handleInputChange('role', v as AgentRole)}>
              <SelectTrigger id="role" className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-700">
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="specialist">Specialist</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="evaluator">Evaluator</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-slate-400">Selecciona “Especialist” para habilitar la <span className="font-medium">Especialidad</span>.</div>
          </div>

          {/* Parent (optional) for sub-agent relationship */}
          <div className="space-y-2">
            <Label htmlFor="parent">Sub-agente de</Label>
            <Select value={formData.parentAgentId || 'none'} onValueChange={(v) => handleInputChange('parentAgentId', v === 'none' ? '' : v)}>
              <SelectTrigger id="parent" className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="(Opcional) Selecciona agente padre" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-700 max-h-64">
                <SelectItem value="none">Ninguno</SelectItem>
                {agents.map((a) => {
                  const lower = (a.name || '').toLowerCase()
                  const avatar = a.avatar 
                    || (lower.includes('toby') ? '/img/agents/toby4.png'
                    : lower.includes('ami') ? '/img/agents/ami4.png'
                    : lower.includes('peter') ? '/img/agents/peter4.png'
                    : lower.includes('emma') ? '/img/agents/emma4.png'
                    : lower.includes('apu') ? '/img/agents/apu4.png'
                    : lower.includes('wex') ? '/img/agents/wex4.png'
                    : lower.includes('cleo') ? '/img/agents/logocleo4.png'
                    : '/img/agents/logocleo4.png')
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={avatar} alt={a.name} />
                          <AvatarFallback className="text-[10px]">{(a.name || 'A').charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{a.name}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {formData.parentAgentId && (() => { const p = agents.find(x => x.id === formData.parentAgentId); if (!p) return null; const lower=(p.name||'').toLowerCase(); const avatar = p.avatar || (lower.includes('toby') ? '/img/agents/toby4.png' : lower.includes('ami') ? '/img/agents/ami4.png' : lower.includes('peter') ? '/img/agents/peter4.png' : lower.includes('emma') ? '/img/agents/emma4.png' : lower.includes('apu') ? '/img/agents/apu4.png' : lower.includes('wex') ? '/img/agents/wex4.png' : lower.includes('cleo') ? '/img/agents/logocleo4.png' : '/img/agents/logocleo4.png'); return (
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={avatar} alt={p.name} />
                  <AvatarFallback className="text-[10px]">{(p.name||'A').charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{p.name}</span>
              </div>
            )})()}
          </div>

          {formData.role === 'specialist' && (
            <div className="space-y-2">
              <Label>Especialidad</Label>
              <div className="text-xs text-slate-400">Elige el foco principal del agente especialista.</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'technical', label: 'Technical', icon: '⚙️', tags: ['technical','análisis','datos'] },
                  { id: 'creative', label: 'Creative', icon: '🎨', tags: ['creative','diseño','contenido'] },
                  { id: 'logical', label: 'Logical', icon: '🧮', tags: ['logical','matemática','algoritmo'] },
                  { id: 'research', label: 'Research', icon: '🔎', tags: ['research','investigación'] },
                  { id: 'custom', label: 'Custom', icon: '✨', tags: [] },
                ].map(opt => {
                  const active = formData.specialization === (opt.id as any)
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        handleInputChange('specialization', opt.id)
                        if (opt.tags.length) {
                          handleInputChange('tags', Array.from(new Set([...(formData.tags || []), ...opt.tags])))
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${active ? 'bg-violet-500/20 text-violet-200 border-violet-500/40' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
                    >
                      <span className="mr-1">{opt.icon}</span>{opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={handleTextInputChange('description')}
            onCompositionStart={() => { isComposingRef.current = true }}
            onCompositionEnd={() => { isComposingRef.current = false }}
            placeholder="Describe las capacidades y propósito de este agente..."
            className="bg-white/10 border-white/20 min-h-[100px]"
          />
        </div>

        {/* Color and Icon (only on create) */}
        {!isEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" type="color" value={formData.color} onChange={(e) => handleInputChange('color', e.target.value)} className="bg-white/10 border-white/20 h-10 p-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icono/Emoji</Label>
  <Input id="icon" value={formData.icon} onChange={handleTextInputChange('icon')} onCompositionStart={() => { isComposingRef.current = true }} onCompositionEnd={() => { isComposingRef.current = false }} placeholder="🤖, 🧠, 🛠️..." className="bg-white/10 border-white/20" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (separados por comas)</Label>
  <Input id="tags" value={formData.tags.join(', ')} onChange={handleTextInputChange('tags')} onCompositionStart={() => { isComposingRef.current = true }} onCompositionEnd={() => { isComposingRef.current = false }} placeholder="análisis, escritura, código..." className="bg-white/10 border-white/20" />
        </div>
      </TabsContent>

      <TabsContent value="tools" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="m-0">Herramientas</Label>
          <div className="flex gap-2">
            <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => handleInputChange('tools', Array.from(new Set(['complete_task', ...filteredTools.map(([k]) => k)])))}>
              Seleccionar visibles
            </Button>
            <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => handleInputChange('tools', ['complete_task'])}>
              Limpiar
            </Button>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setToolCategory(cat)}
              className={`px-2 py-1 rounded-full text-xs border transition-colors ${toolCategory === cat ? 'bg-violet-500/20 text-violet-200 border-violet-500/40' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <Input placeholder="Buscar herramientas por nombre o descripción..." value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} className="bg-white/10 border-white/20" />

        {/* Tools list - vertical with invisible scroll to optimize space */}
        <div className="relative">
          <div className="flex flex-col gap-2 sm:gap-3 max-h-[60vh] sm:max-h-[55vh] overflow-y-auto no-scrollbar pr-1">
          {filteredTools.map(([key, info]) => {
            const enabled = (formData.tools || []).includes(key)
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (key === 'complete_task') return
                  const next = new Set(formData.tools || [])
                  if (enabled) next.delete(key); else next.add(key)
                  next.add('complete_task')
                  handleInputChange('tools', Array.from(next))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (key === 'complete_task') return
                    const next = new Set(formData.tools || [])
                    if (enabled) next.delete(key); else next.add(key)
                    next.add('complete_task')
                    handleInputChange('tools', Array.from(next))
                  }
                }}
                className={`rounded-lg px-3 py-2 sm:px-4 sm:py-3 border transition-colors outline-none focus:ring-2 focus:ring-violet-400/40 ${enabled ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/10 bg-white/5 hover:bg-white/8'}`}
              >
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {info.icon ? (
                      <Image src={info.icon} alt={info.name} width={28} height={28} loading="lazy" className="rounded-md flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-md bg-white/10 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{info.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{info.category}</div>
                    </div>
                  </div>
                  <Switch
                    onClick={(e) => e.stopPropagation()}
                    checked={enabled}
                    disabled={key === 'complete_task'}
                    onCheckedChange={(checked) => {
                      if (key === 'complete_task') return
                      const next = new Set(formData.tools || [])
                      if (checked) next.add(key)
                      else next.delete(key)
                      next.add('complete_task')
                      handleInputChange('tools', Array.from(next))
                    }}
                  />
                </div>
                {info.description && (
                  <p className="text-[12px] sm:text-[11px] text-slate-400 mt-2 line-clamp-2">
                    {info.description}
                  </p>
                )}
              </div>
            )
          })}
          </div>
          {/* subtle gradient masks top/bottom to hint scroll without visible bar */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-800/90 to-transparent" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/90 to-transparent" />
        </div>

        {/* Invisible scrollbar utility (scoped) */}
        <style jsx global>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </TabsContent>

      <TabsContent value="prompt" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">System Prompt</Label>

          {/* Mobile: toggle between Edit and Preview */}
          <div className="lg:hidden">
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${promptView === 'edit' ? 'bg-violet-500/20 text-violet-200 border-violet-500/40' : 'bg-white/5 text-slate-300 border-white/10'}`}
                onClick={() => setPromptView('edit')}
              >Editar</button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${promptView === 'preview' ? 'bg-violet-500/20 text-violet-200 border-violet-500/40' : 'bg-white/5 text-slate-300 border-white/10'}`}
                onClick={() => setPromptView('preview')}
              >Vista previa</button>
            </div>

            {promptView === 'edit' ? (
              <div className="relative">
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => handleInputChange('prompt', e.target.value)}
                  placeholder="Eres un asistente especializado en..."
                  className="bg-white/10 border-white/20 min-h-[180px] max-h-[55vh] overflow-y-auto no-scrollbar resize-none"
                />
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-800/90 to-transparent" />
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/90 to-transparent" />
              </div>
            ) : (
              <div className="relative bg-slate-900/40 border border-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-2">Vista previa (Markdown)</div>
                <div className="max-h-[55vh] overflow-y-auto no-scrollbar text-slate-200 text-sm leading-relaxed">
                  <Markdown>{formData.prompt}</Markdown>
                </div>
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-800/90 to-transparent rounded-t-lg" />
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/90 to-transparent rounded-b-lg" />
              </div>
            )}
          </div>

          {/* Desktop: side-by-side */}
          <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Editor */}
            <div className="relative">
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => handleInputChange('prompt', e.target.value)}
                placeholder="Eres un asistente especializado en..."
                className="bg-white/10 border-white/20 min-h-[180px] max-h-[50vh] overflow-y-auto no-scrollbar resize-none"
              />
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-800/90 to-transparent" />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/90 to-transparent" />
            </div>

            {/* Markdown Preview */}
            <div className="relative bg-slate-900/40 border border-slate-700/50 rounded-lg p-3 lg:p-4">
              <div className="text-xs text-slate-400 mb-2">Vista previa (Markdown)</div>
              <div className="max-h-[50vh] overflow-y-auto no-scrollbar text-slate-200 text-sm leading-relaxed">
                <Markdown>{formData.prompt}</Markdown>
              </div>
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-800/90 to-transparent rounded-t-lg" />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/90 to-transparent rounded-b-lg" />
            </div>
          </div>
        </div>

        {/* Invisible scrollbar utility (scoped) */}
        <style jsx global>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </TabsContent>

      <TabsContent value="config" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Select value={formData.model} onValueChange={(v) => handleInputChange('model', v)}>
              <SelectTrigger id="model" className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder={models.length ? 'Selecciona un modelo' : 'Cargando modelos...'} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-700 max-h-64">
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input id="temperature" type="number" min="0" max="2" step="0.1" value={formData.temperature} onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))} className="bg-white/10 border-white/20" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input id="maxTokens" type="number" value={formData.maxTokens} onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))} className="bg-white/10 border-white/20" />
        </div>
      </TabsContent>
    </Tabs>
  )
  }

  const getAgentAvatar = (agent?: AgentConfig) => {
    if (!agent) return null
    // Prefer explicit avatar path on the agent config when set
    if (agent.avatar) return agent.avatar
    const key = agent.name?.toLowerCase() || ''
    if (key.includes('toby')) return '/img/agents/toby4.png'
    if (key.includes('ami')) return '/img/agents/ami4.png'
    if (key.includes('peter')) return '/img/agents/peter4.png'
    if (key.includes('cleo')) return '/img/agents/logocleo4.png'
    if (key.includes('emma')) return '/img/agents/emma4.png'
    if (key.includes('wex')) return '/img/agents/wex4.png'
    if (key.includes('apu')) return '/img/agents/apu4.png'
    return null
  }

  return (
  <div className="space-y-6 w-full max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Centro de Control de Agentes
          </h2>
          <p className="text-slate-400 mt-1">Administra y configura tus agentes de IA</p>
        </div>
        
        <Button
          onClick={() => { resetForm(); setEditingAgent(null); setIsCreateDialogOpen(true) }}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:text-white hover:border-violet-500 hover:bg-violet-500/10 transition-all duration-200"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Crear Agente
        </Button>
      </div>

      {/* Agents Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 w-full">
        <AnimatePresence>
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Card 
                className="h-full bg-slate-800/50 border-slate-700/50 hover:border-violet-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-violet-500/10 relative overflow-hidden cursor-pointer"
                onClick={() => setDetailsAgent(agent)}
              >
                {/* Enhanced background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                <div className="relative z-10">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Enhanced Avatar with better resolution */}
                      <div className="relative group">
                        <Avatar className="h-16 w-16 rounded-xl ring-2 ring-slate-600/50 group-hover:ring-violet-400/50 transition-all duration-300 group-hover:scale-105">
                          {getAgentAvatar(agent) ? (
                            <AvatarImage 
                              src={getAgentAvatar(agent)!} 
                              alt={agent.name}
                              className="object-cover rounded-xl"
                            />
                          ) : null}
                          <AvatarFallback className="rounded-xl text-lg" style={{ backgroundColor: agent.color }}>
                            <BrainIcon className="w-8 h-8 text-white" />
                          </AvatarFallback>
                        </Avatar>
                        {/* Subtle glow effect on hover */}
                        <div 
                          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"
                          style={{ backgroundColor: agent.color }}
                        />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg text-white mb-1">{agent.name}</CardTitle>
                        <div className="mb-2">
                          {(() => { const info = getSpecificRoleLabel(agent); return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${info.colorClass}`}>
                              {info.label}
                            </span>
                          )})()}
                        </div>
                        {agent.description && (
                          <p className="text-xs text-slate-400 line-clamp-1">{agent.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {agent.tags && agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
                      {agent.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs bg-slate-700/60 text-slate-200 border border-slate-600/60">
                          {tag}
                        </Badge>
                      ))}
                      {agent.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs bg-slate-700/60 text-slate-200 border border-slate-600/60">
                          +{agent.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <div className="text-xs text-slate-400">
                      <span className="font-medium">{agent.model}</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyFromAgent(agent)
                        }}
                        className="h-8 w-8 p-0 hover:bg-violet-500/20"
                        title="Copiar agente"
                      >
                        <CopyIcon className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(agent)
                        }}
                        className="h-8 w-8 p-0 hover:bg-violet-500/20"
                      >
                        <PencilIcon className="w-3 h-3" />
                      </Button>
                      
                      {/* Only show delete button if agent is not Cleo */}
                      {agent.id !== 'cleo-supervisor' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirm(agent.id!)
                          }}
                          className="h-8 w-8 p-0 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                        >
                          <TrashIcon className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
                </div> {/* Close relative z-10 wrapper */}
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 sm:rounded-lg rounded-none h-[95vh] sm:h-auto flex flex-col">
          <DialogHeader>
            <div className="relative">
              <DialogTitle className="text-xl font-bold text-white flex items-center">
                <RobotIcon className="w-5 h-5 mr-2 text-violet-400" />
                Crear Nuevo Agente
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCreateDialogOpen(false)}
                className="absolute right-0 top-0 h-8 w-8 p-0 text-slate-300 hover:text-white"
                aria-label="Cerrar"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
            <div className="space-y-6">
              <AgentForm />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700 bg-slate-800">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  resetForm()
                }}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.name || !formData.role || !formData.model}
                className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Agente
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={(open) => !open && setEditingAgent(null)}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 sm:rounded-lg rounded-none h-[95vh] sm:h-auto flex flex-col">
          <DialogHeader>
            <div className="relative">
              <DialogTitle className="text-xl font-bold text-white flex items-center">
                <PencilIcon className="w-5 h-5 mr-2 text-violet-400" />
                Editar Agente
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingAgent(null)}
                className="absolute right-0 top-0 h-8 w-8 p-0 text-slate-300 hover:text-white"
                aria-label="Cerrar"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
            <div className="space-y-6">
              <AgentForm isEdit={true} />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700 bg-slate-800">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingAgent(null)
                  resetForm()
                }}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!formData.name || !formData.role || !formData.model}
                className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Actualizar Agente
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-400">Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          
          <p className="text-slate-300">
            ¿Estás seguro de que deseas eliminar este agente? Esta acción no se puede deshacer.
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agent Details Modal */}
      <Dialog open={!!detailsAgent} onOpenChange={(open) => !open && setDetailsAgent(null)}>
        <DialogContent className="max-w-4xl bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
          {detailsAgent && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-4 mb-6">
                  {/* Agent Avatar */}
                  <div className="relative">
                    <Avatar className="h-20 w-20 rounded-xl ring-2 ring-violet-400/50">
            {getAgentAvatar(detailsAgent || undefined) ? (
                        <AvatarImage 
              src={getAgentAvatar(detailsAgent || undefined)!} 
              alt={detailsAgent!.name}
                          className="object-cover rounded-xl"
                        />
                      ) : null}
            <AvatarFallback className="rounded-xl text-xl" style={{ backgroundColor: detailsAgent!.color }}>
                        <BrainIcon className="w-10 h-10 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    {/* Glow effect */}
                    <div 
                      className="absolute inset-0 rounded-xl opacity-20 blur-xl"
            style={{ backgroundColor: detailsAgent!.color }}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold text-white flex items-center mb-2">
            {detailsAgent!.name}
                    </DialogTitle>
                    <div className="flex items-center space-x-3 mb-3">
            {(() => { const info = getSpecificRoleLabel(detailsAgent!); return (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${info.colorClass}`}>
                          {info.label}
                        </span>
                      )})()}
                      <Badge variant="secondary" className="bg-slate-700/60 text-slate-200 border border-slate-600/60">
            {detailsAgent!.model}
                      </Badge>
                    </div>
          <p className="text-slate-300 text-base leading-relaxed">{detailsAgent!.description}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-8">
                {/* Agent Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <RobotIcon className="w-5 h-5 mr-2 text-violet-400" />
                      Configuration
                    </h3>
                    <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Temperature:</span>
                        <span className="text-white font-medium">{detailsAgent!.temperature}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Max Tokens:</span>
                        <span className="text-white font-medium">{detailsAgent!.maxTokens?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Role:</span>
                        <span className="text-white font-medium capitalize">{detailsAgent!.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* System Prompt (Markdown Preview) */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">System Prompt</h3>
                    <div className="bg-slate-700/30 rounded-lg p-3 md:p-4">
                      <div className="max-h-[40vh] overflow-y-auto no-scrollbar prose prose-invert prose-sm">
                        <Markdown>{detailsAgent!.prompt || ''}</Markdown>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tools & Capabilities */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Tools & Capabilities</h3>
                  {detailsAgent!.tools && detailsAgent!.tools.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detailsAgent!.tools.map((toolName, index) => {
                        const toolInfo = TOOL_REGISTRY[toolName] || {
                          name: toolName,
                          description: 'Tool description not available',
                          category: 'Unknown',
                          useCases: []
                        }
                        return (
                          <div key={index} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30 hover:border-violet-500/30 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-medium text-white">{toolInfo.name}</h4>
                              <Badge variant="outline" className="text-xs border-violet-500/50 text-violet-300 bg-violet-900/20">
                                {toolInfo.category}
                              </Badge>
                            </div>
                            <p className="text-slate-400 text-sm mb-3 leading-relaxed">{toolInfo.description}</p>
                            {toolInfo.useCases.length > 0 && (
                              <div>
                                <p className="text-slate-300 text-xs font-medium mb-2">Use Cases:</p>
                                <ul className="text-slate-400 text-xs space-y-1">
                                  {toolInfo.useCases.slice(0, 3).map((useCase, i) => (
                                    <li key={i} className="flex items-center">
                                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mr-2 flex-shrink-0"></span>
                                      {useCase}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-700/30 rounded-lg p-8 text-center">
                      <RobotIcon className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-400 text-lg font-medium mb-1">No tools configured</p>
                      <p className="text-slate-500 text-sm">This agent doesn't have any specialized tools assigned</p>
                    </div>
                  )}
                </div>

                {/* Tags / Specializations */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Specializations</h3>
                  <div className="flex flex-wrap gap-2">
                    {detailsAgent!.tags && detailsAgent!.tags.length > 0 ? (
                      detailsAgent!.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-violet-900/30 text-violet-300 border border-violet-700/50 hover:bg-violet-800/30 transition-colors">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <div className="bg-slate-700/30 rounded-lg p-4 text-center">
                        <p className="text-slate-400 text-sm">No specializations defined</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-700">
                <Button
                  onClick={() => setDetailsAgent(null)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 transition-colors"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AgentCRUDPanel

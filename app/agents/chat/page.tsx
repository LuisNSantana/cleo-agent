'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useClientAgentStore } from '@/lib/agents/client-store'
import { AgentConfig } from '@/lib/agents/types'
import {
  ChatCircleIcon,
  PaperPlaneIcon,
  RobotIcon,
  UserIcon,
  BrainIcon,
  LightningIcon,
  HeartIcon,
  EyeIcon,
  ShieldIcon,
  LockIcon,
  ArrowRightIcon
} from '@phosphor-icons/react'
import { Markdown } from '@/components/prompt-kit/markdown'

interface ChatMessage {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  agentId?: string
  agentName?: string
  isDelegated?: boolean
  delegatedFrom?: string | null
  metadata?: Record<string, any>
}

export default function AgentsChatPage() {
  const { agents, executeAgent, isLoading, currentExecution, error, clearError, delegationEvents } = useClientAgentStore()
  
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [forceSupervised, setForceSupervised] = useState(false) // Toggle for forcing Cleo supervision
  const [showModeIndicator, setShowModeIndicator] = useState(true) // Show conversation mode indicator
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Track which executions we've already appended to avoid duplicates
  const appendedExecRef = useRef<Set<string>>(new Set())
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})
  
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Ensure CSRF cookie exists early for POSTs guarded by middleware
  useEffect(() => {
    const ensureCsrf = async () => {
      try {
        if (typeof document === 'undefined') return
        const has = /(?:^|; )csrf_token=/.test(document.cookie)
        if (!has) {
          await fetch('/api/csrf', { method: 'GET', credentials: 'same-origin' })
        }
      } catch (_) {
        // non-fatal
      }
    }
    ensureCsrf()
  }, [])

  // When an execution completes, append the AI messages from orchestrator
  useEffect(() => {
    if (!currentExecution) return
    if (currentExecution.status !== 'completed') return
    if (appendedExecRef.current.has(currentExecution.id)) return

    const aiMessages = (currentExecution.messages || [])
      .filter((m) => m.type === 'ai')
      // Suppress internal agent error placeholders
      .filter((m) => !(m.metadata && (m.metadata as any).error === 'agent_invoke_failed'))
    if (aiMessages.length === 0) return

    const mapped = aiMessages.map((m) => {
      const senderId = (m.metadata && (m.metadata as any).sender) || currentExecution.agentId || selectedAgent?.id
      const sender = agents.find((a) => a.id === senderId) || selectedAgent || null
      
      console.log('🔍 [CHAT DEBUG] Mapping execution message:', {
        messageId: m.id,
        originalMetadata: m.metadata,
        extractedSenderId: senderId,
        currentExecutionAgentId: currentExecution.agentId,
        selectedAgentId: selectedAgent?.id,
        finalSender: sender?.name,
        finalSenderId: sender?.id
      })
      
      return {
        id: m.id,
        type: 'agent' as const,
        content: m.content,
        timestamp: new Date(m.timestamp as any),
        agentId: sender?.id,
        agentName: sender?.name,
        metadata: (m.metadata as any) || {},
      }
    })

    setMessages((prev) => [...prev, ...mapped])
    appendedExecRef.current.add(currentExecution.id)
  }, [currentExecution, agents, selectedAgent])

  // Surface execution errors into the chat as a system message
  useEffect(() => {
    if (!error) return
    const sysMsg = {
      id: `err_${Date.now()}`,
      type: 'system' as const,
      content: `Execution error: ${error}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, sysMsg])
    // Clear store error after surfacing
    clearError?.()
  }, [error, clearError])

  // Load historical messages for the latest thread of the selected agent with mode segregation
  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedAgent) return
      setLoadingHistory(true)
      try {
  // Clear local messages when switching agent to avoid mixing threads
  setMessages([])
        appendedExecRef.current.clear()

        // Generate thread key with mode segregation
        const threadKey = `${selectedAgent.id}_${forceSupervised ? 'supervised' : 'direct'}`
        console.log(`🧵 Loading thread history for ${threadKey}`)

        // Try to get latest thread for this agent + mode; create one if none
        const params = new URLSearchParams({ 
          agentKey: threadKey, 
          limit: '1' 
        })
  let res = await fetch(`/api/agents/threads?${params.toString()}`, { credentials: 'same-origin' })
        if (!res.ok) throw new Error('Failed to fetch threads')
        let data = await res.json()
        let thread = data?.threads?.[0]
        if (!thread?.id) {
          const modeTitle = forceSupervised 
            ? `${selectedAgent.name} (Supervised by Cleo)` 
            : `${selectedAgent.name} (Direct Chat)`
          
          const cr = await fetch('/api/agents/threads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(typeof document !== 'undefined' && document.cookie.match(/(?:^|; )csrf_token=/) ? { 'x-csrf-token': (document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1] || '') } : {}) },
            credentials: 'same-origin',
            body: JSON.stringify({ 
              agentKey: threadKey, 
              agentName: selectedAgent.name, 
              title: modeTitle,
              metadata: {
                conversation_mode: forceSupervised ? 'supervised' : 'direct',
                target_agent_id: selectedAgent.id,
                created_with_dual_mode: true
              }
            })
          })
          if (cr.ok) {
            const cd = await cr.json()
            thread = cd.thread
          }
        }
        if (!thread?.id) return
        
        // Persist this thread as the active one for this agent + mode combination
        try {
          useClientAgentStore.setState((prev) => ({
            _agentThreadMap: { ...(prev as any)._agentThreadMap, [threadKey]: thread.id }
          }))
        } catch (_) { /* ignore */ }
  const mr = await fetch(`/api/agents/threads/${thread.id}/messages?limit=200`, { credentials: 'same-origin' })
        if (!mr.ok) throw new Error('Failed to fetch thread messages')
        const md = await mr.json()
        const mapped: ChatMessage[] = (md?.messages || []).map((m: any) => ({
          id: String(m.id),
          type: m.role === 'user' ? 'user' : (m.role === 'assistant' ? 'agent' : 'system'),
          content: m.content || '',
          timestamp: new Date(m.created_at),
          agentId: m.role === 'assistant' ? (m.metadata?.sender || selectedAgent.id) : undefined,
          agentName: m.role === 'assistant' ? (agents.find(a => a.id === (m.metadata?.sender || selectedAgent.id))?.name || selectedAgent.name) : undefined,
          isDelegated: m.metadata?.isDelegated || false,
          delegatedFrom: m.metadata?.delegatedFrom || null,
          metadata: m.metadata || {},
        }))
        
        console.log('🔍 [CHAT DEBUG] Mapped messages:', mapped.map(m => ({
          id: m.id,
          type: m.type,
          agentId: m.agentId,
          agentName: m.agentName,
          metadata: m.metadata,
          contentPreview: m.content.slice(0, 50) + '...'
        })))
        
        setMessages(mapped)
      } catch (e) {
        console.warn('Failed to load agent chat history:', e)
      } finally {
        setLoadingHistory(false)
      }
    }
    loadHistory()
  }, [selectedAgent, forceSupervised]) // Re-load when mode changes

  
  // Effective agent will be computed after lastDelegation is defined below

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    const currentInput = inputMessage
    setInputMessage('')

    try {
  // Start execution with dual-mode support
  console.log(`🎮 Sending message with mode: ${currentConversationMode.mode}, forceSupervised: ${forceSupervised}`)
  await executeAgent(
    currentInput, 
    effectiveAgent?.id || selectedAgent.id,
    forceSupervised
  )
      // Do not add a mock response; the effect above will append real AI messages when ready
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  // Helper to render tool call chips for a message if present in currentExecution
  const renderToolChips = (messageId: string) => {
    const exec = currentExecution
    if (!exec || !exec.messages) return null
    const m = exec.messages.find((mm) => mm.id === messageId)
    if (!m || !m.toolCalls || m.toolCalls.length === 0) return null
    return (
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {m.toolCalls.map((tc, idx) => {
          const key = `${messageId}_tool_${idx}`
          const open = !!expandedTools[key]
          return (
            <div key={key} className="group inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 text-amber-200 px-2 py-1 text-[11px]">
              <span className="inline-block bg-amber-400/20 rounded-full px-1.5 py-0.5 text-[10px]">tool</span>
              <span className="font-medium">{tc.name}</span>
              {tc.args && Object.keys(tc.args).length > 0 && (
                <Button variant="ghost" size="sm" className="h-5 px-1 text-amber-200 hover:text-amber-100" onClick={() => setExpandedTools((prev) => ({ ...prev, [key]: !open }))}>
                  {open ? 'hide' : 'view'}
                </Button>
              )}
              {open && (
                <div className="w-full mt-1 text-[10px] bg-slate-900/70 border border-slate-700 rounded-md p-2 text-slate-300">
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(tc.args, null, 2)}</pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Compute latest delegation info and first message index after it
  const lastDelegation = useMemo(() => {
    const steps = (currentExecution?.steps || []).filter(
      (st: any) => st.action === 'delegating' && st.metadata?.delegatedTo
    )
    const lastStep = steps.length ? steps[steps.length - 1] : null
    const lastEvent = delegationEvents.length ? delegationEvents[delegationEvents.length - 1] : null

    const stepTime = lastStep ? new Date(lastStep.timestamp as any).getTime() : 0
    const eventTime = lastEvent ? new Date((lastEvent as any).timestamp as any).getTime() : 0

    if (!lastStep && !lastEvent) return null

    if (stepTime >= eventTime) {
      return {
        ts: new Date(lastStep!.timestamp as any),
        to: String(lastStep!.metadata?.delegatedTo),
        reason: lastStep!.metadata?.reason as string | undefined,
      }
    }
    return {
      ts: new Date((lastEvent as any).timestamp as any),
      to: String((lastEvent as any).to),
      reason: (lastEvent as any).reason as string | undefined,
    }
  }, [currentExecution?.steps, delegationEvents])

  const firstAgentIdxAfterDelegation = useMemo(() => {
    if (!lastDelegation) return -1
    const t = lastDelegation.ts.getTime()
    return messages.findIndex((m) => m.type === 'agent' && m.timestamp.getTime() >= t)
  }, [messages, lastDelegation])

  // Effective agent to target for next message: prefer last delegated-to (not finalize)
  const effectiveAgent = useMemo(() => {
    if (lastDelegation && lastDelegation.to && lastDelegation.to !== 'finalize') {
      return agents.find(a => a.id === lastDelegation.to) || selectedAgent
    }
    return selectedAgent
  }, [lastDelegation, agents, selectedAgent])

  // Determine current conversation mode for UI indicators
  const currentConversationMode = useMemo(() => {
    if (forceSupervised) {
      return {
        mode: 'supervised' as const,
        description: 'Supervised by Cleo',
        icon: <ShieldIcon className="w-4 h-4" />,
        color: 'text-blue-400'
      }
    }
    
    if (selectedAgent && selectedAgent.id !== 'cleo-supervisor') {
      return {
        mode: 'direct' as const,
        description: `Direct chat with ${selectedAgent.name}`,
        icon: <ArrowRightIcon className="w-4 h-4" />,
        color: 'text-green-400'
      }
    }
    
    return {
      mode: 'supervised' as const,
      description: 'Supervised by Cleo',
      icon: <EyeIcon className="w-4 h-4" />,
      color: 'text-blue-400'
    }
  }, [selectedAgent, forceSupervised])

  // Helper to render an inline "assigned agent" chip based on delegation
  const renderDelegationChip = (delegation: { to: string; reason?: string } | null) => {
    if (!delegation || !delegation.to || delegation.to === 'finalize') return null
    const toAgent = agents.find((a) => a.id === delegation.to)
    const avatar = toAgent ? getAgentAvatar(toAgent) : null
    return (
      <div className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/15 text-violet-200 px-2 py-1 text-[11px]">
        <span className="inline-block bg-violet-400/20 rounded-full px-1.5 py-0.5 text-[10px]">assigned</span>
        <Avatar className="w-4 h-4">
          {avatar ? <AvatarImage src={avatar} alt={toAgent?.name || delegation.to} /> : null}
          <AvatarFallback className="bg-violet-600 text-[9px]">{toAgent?.name?.[0] || 'A'}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{toAgent?.name || delegation.to}</span>
        {delegation.reason && (
          <span className="text-[10px] text-violet-300/70">({String(delegation.reason).slice(0, 60)})</span>
        )}
      </div>
    )
  }

  const getAgentIcon = (agent: AgentConfig) => {
    switch (agent.icon) {
      case 'brain':
        return <BrainIcon className="w-5 h-5" />
      case 'lightning':
        return <LightningIcon className="w-5 h-5" />
      case 'heart':
        return <HeartIcon className="w-5 h-5" />
      default:
        return <RobotIcon className="w-5 h-5" />
    }
  }

  const getAgentAvatar = (agent: AgentConfig) => {
    // Map common agent names to avatars in public/img/agents
    const key = agent.name?.toLowerCase()
    if (key?.includes('toby')) return '/img/agents/toby4.png'
    if (key?.includes('ami')) return '/img/agents/ami4.png'
    if (key?.includes('peter')) return '/img/agents/peter4.png'
    if (key?.includes('cleo')) return '/img/agents/logocleo4.png'
    if (key?.includes('emma')) return '/img/agents/emma4.png'
    return null
  }

  const getSpecificRoleInfo = (agent: AgentConfig): { label: string; className: string } => {
    const name = (agent.name || '').toLowerCase()
    if (agent.role === 'supervisor') return { label: 'Supervisor', className: 'bg-pink-500/20 text-pink-300 border-pink-500/30' }
    if (name.includes('toby')) return { label: 'Technical Specialist', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
    if (name.includes('ami')) return { label: 'Creative Specialist', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    if (name.includes('peter')) return { label: 'Logical Analyst', className: 'bg-lime-500/20 text-lime-300 border-lime-500/30' }
    const tags = (agent.tags || []).map(t => t.toLowerCase())
    if (tags.some(t => ['technical','técnico','datos'].includes(t))) return { label: 'Technical Specialist', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
    if (tags.some(t => ['creative','creativo','diseño','contenido'].includes(t))) return { label: 'Creative Specialist', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    if (tags.some(t => ['logical','lógico','matemática','matemático'].includes(t))) return { label: 'Logical Analyst', className: 'bg-lime-500/20 text-lime-300 border-lime-500/30' }
    if (agent.role === 'evaluator') return { label: 'Evaluator', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
    if (agent.role === 'worker') return { label: 'Worker', className: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
    return { label: 'Specialist', className: 'bg-violet-500/20 text-violet-300 border-violet-500/30' }
  }

  return (
    <TooltipProvider>
      <div className="py-2 sm:py-4">
        {/* Dual-Mode Header with Controls */}
        {selectedAgent && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6"
          >
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Current Mode Indicator */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                      currentConversationMode.mode === 'direct' 
                        ? 'bg-green-500/15 border-green-500/30 text-green-400' 
                        : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                    }`}>
                      {currentConversationMode.icon}
                      <span className="text-sm font-medium">
                        {currentConversationMode.mode === 'direct' ? 'Direct Mode' : 'Supervised Mode'}
                      </span>
                    </div>

                    {/* Mode Description */}
                    <span className="text-sm text-slate-400">
                      {currentConversationMode.description}
                    </span>
                  </div>

                  {/* Force Supervised Toggle */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label 
                            htmlFor="force-supervised" 
                            className="text-sm text-slate-300 cursor-pointer flex items-center gap-2"
                          >
                            <ShieldIcon className="w-4 h-4" />
                            Force Cleo Supervision
                          </Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>When enabled, all messages go through Cleo for supervision and delegation, even when chatting with specific agents</p>
                        </TooltipContent>
                      </Tooltip>
                      <Switch
                        id="force-supervised"
                        checked={forceSupervised}
                        onCheckedChange={setForceSupervised}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="space-y-4 sm:space-y-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 min-h-[calc(100dvh-160px)] sm:min-h-[calc(100dvh-200px)] w-full">
            {/* Agent Selection Sidebar */}
            <div className="hidden lg:block lg:col-span-1">
            <Card className="h-full bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <RobotIcon className="w-5 h-5" />
                  Available Agents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {agents.length === 0 ? (
                  <div className="text-center py-8">
                    <RobotIcon className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400 text-sm">No agents available</p>
                    <Button size="sm" variant="outline" className="mt-3">
                      Create agent
                    </Button>
                  </div>
                ) : (
                  agents.map((agent) => (
                    <motion.div
                      key={agent.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all duration-200 ${
                          selectedAgent?.id === agent.id 
                            ? 'bg-violet-600/20 border-violet-500/50 shadow-lg' 
                            : 'bg-slate-700/30 border-slate-600/50 hover:border-violet-500/30'
                        }`}
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 ring-1 ring-slate-600/50 hover:ring-violet-400/50 transition-all duration-200">
                              {getAgentAvatar(agent) ? (
                                <AvatarImage src={getAgentAvatar(agent)!} alt={agent.name} className="object-cover" />
                              ) : null}
                              <AvatarFallback className="rounded-lg" style={{ backgroundColor: agent.color }}>
                                {getAgentIcon(agent)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-medium text-white text-sm">{agent.name}</h4>
                              <p className="text-xs text-slate-400 line-clamp-1">{agent.description}</p>
                              {(() => { const info = getSpecificRoleInfo(agent); return (
                                <Badge variant="secondary" className={`text-xs mt-1 border ${info.className}`}>
                                  {info.label}
                                </Badge>
                              )})()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-full bg-slate-800/50 border-slate-700/50 flex flex-col">
              {selectedAgent ? (
                <>
                  {/* Chat Header with avatar */}
                  <div className="sticky top-0 z-10 flex items-center gap-3 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 border-b border-slate-700/60 bg-slate-800/70 backdrop-blur">
                    <Avatar className="h-10 w-10 rounded-lg ring-1 ring-slate-600/50">
                      {getAgentAvatar(selectedAgent) ? (
                        <AvatarImage src={getAgentAvatar(selectedAgent)!} alt={selectedAgent.name} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="rounded-lg" style={{ backgroundColor: selectedAgent.color }}>
                        {getAgentIcon(selectedAgent)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{selectedAgent.name}</div>
                      {(() => { const info = getSpecificRoleInfo(selectedAgent); return (
                        <Badge variant="secondary" className={`text-[10px] border mt-0.5 ${info.className}`}>
                          {info.label}
                        </Badge>
                      )})()}
                    </div>
                    {/* Mobile agent switcher */}
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            // Ensure we have a thread for this agent + mode
                            const map = (useClientAgentStore.getState() as any)._agentThreadMap || {}
                            const compositeKey = `${selectedAgent.id}_${forceSupervised ? 'supervised' : 'direct'}`
                            let threadId = map[compositeKey]
                            if (!threadId) {
                              const cr = await fetch('/api/agents/threads', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...(typeof document !== 'undefined' && document.cookie.match(/(?:^|; )csrf_token=/) ? { 'x-csrf-token': (document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1] || '') } : {}) },
                                credentials: 'same-origin',
                                body: JSON.stringify({ 
                                  agentKey: compositeKey, 
                                  agentName: selectedAgent.name, 
                                  title: `${selectedAgent.name} (${forceSupervised ? 'Supervised by Cleo' : 'Direct Chat'})` 
                                })
                              })
                              if (cr.ok) {
                                const cd = await cr.json()
                                threadId = cd?.thread?.id
                                if (threadId) {
                                  useClientAgentStore.setState((prev) => ({
                                    _agentThreadMap: { ...(prev as any)._agentThreadMap, [compositeKey]: threadId }
                                  }))
                                }
                              }
                            }
                            if (!threadId) return
                            const del = await fetch(`/api/agents/threads/${threadId}/messages`, { method: 'DELETE', credentials: 'same-origin', headers: { ...(typeof document !== 'undefined' && document.cookie.match(/(?:^|; )csrf_token=/) ? { 'x-csrf-token': (document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1] || '') } : {}) } })
                            if (del.ok) {
                              setMessages([])
                            }
                          } catch (e) {
                            console.warn('Failed to clear conversation:', e)
                          }
                        }}
                      >
                        Clear
                      </Button>
                      <div className="lg:hidden">
                        <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                          Change
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Messages */}
                  <div className="flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 overflow-y-auto scrollbar-hide space-y-3 sm:space-y-4">
                    {loadingHistory && (
                      <div className="text-xs text-slate-400">Loading conversation history…</div>
                    )}
                    <AnimatePresence>
                      {messages.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center justify-center h-full text-center"
                        >
                          <div className="relative">
                            <Avatar className="w-20 h-20 rounded-2xl mb-4 ring-2 ring-slate-600/30 shadow-xl">
                              {getAgentAvatar(selectedAgent) ? (
                                <AvatarImage src={getAgentAvatar(selectedAgent)!} alt={selectedAgent.name} className="object-cover rounded-2xl" />
                              ) : null}
                              <AvatarFallback className="rounded-2xl text-2xl" style={{ backgroundColor: selectedAgent.color }}>
                                {getAgentIcon(selectedAgent)}
                              </AvatarFallback>
                            </Avatar>
                            {/* Subtle glow effect */}
                            <div 
                              className="absolute inset-0 w-20 h-20 rounded-2xl opacity-20 blur-xl mb-4"
                              style={{ backgroundColor: selectedAgent.color }}
                            />
                          </div>
                          <h3 className="text-xl font-semibold text-white mb-2">Hi! I'm {selectedAgent.name}</h3>
                          <p className="text-slate-400 max-w-md">{selectedAgent.description || `I'm a ${selectedAgent.role} here to help.`}</p>
                        </motion.div>
                      ) : (
                        messages.map((message, idx) => {
                          // Extract the correct agent ID from metadata first, fallback to message agentId
                          const actualAgentId = message.metadata?.sender || message.agentId
                          const displayAgent = message.type === 'agent' && actualAgentId
                            ? agents.find(a => a.id === actualAgentId) || null
                            : null
                          
                          // DEBUG: Log message metadata
                          if (message.type === 'agent') {
                            console.log(`🔍 [DEBUG] Message metadata:`, {
                              messageId: message.id,
                              originalAgentId: message.agentId,
                              metadataSender: message.metadata?.sender,
                              actualAgentId,
                              displayAgent: displayAgent?.name,
                              selectedAgent: selectedAgent?.name,
                              foundAgent: !!agents.find(a => a.id === actualAgentId)
                            })
                          }
                          
                          const avatarSrc = displayAgent ? getAgentAvatar(displayAgent) : null
                          // Decide if we show the single inline delegation chip on this message
                          const showDelegationChip = message.type !== 'user' && idx === firstAgentIdxAfterDelegation
                          // We now show only a single inline chip inside the bubble; no center/banners
                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className={`relative flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                              {/* No floating banners */}
                              <Avatar className="w-8 h-8">
                                {message.type === 'agent' && avatarSrc ? (
                                  <AvatarImage src={avatarSrc!} alt={displayAgent?.name || 'Agent'} />
                                ) : null}
                                <AvatarFallback className={message.type === 'user' ? 'bg-blue-600' : 'bg-violet-600'}>
                                  {message.type === 'user' ? (
                                    <UserIcon className="w-4 h-4 text-white" />
                                  ) : (
                                    displayAgent ? getAgentIcon(displayAgent) : <RobotIcon className="w-4 h-4 text-white" />
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div 
                                className={`max-w-[90%] sm:max-w-[75%] lg:max-w-3xl px-3 sm:px-4 py-2 rounded-2xl ${
                                  message.type === 'user' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-slate-700 text-white'
                                }`}
                              >
                                {/* Delegation chip inline (first agent message after latest delegation) */}
                                {showDelegationChip && renderDelegationChip(lastDelegation)}
                                
                                {/* Agent Identity Chip - Always show for agent messages */}
                                {message.type === 'agent' && (
                                  <div className="mb-2">
                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border bg-violet-500/15 border-violet-500/30 text-violet-300">
                                      {displayAgent ? (
                                        <>
                                          <Avatar className="w-3 h-3">
                                            {getAgentAvatar(displayAgent) ? (
                                              <AvatarImage src={getAgentAvatar(displayAgent)!} alt={displayAgent.name} />
                                            ) : null}
                                            <AvatarFallback className="bg-violet-600 text-[8px]">
                                              {displayAgent.name?.[0] || 'A'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span>{displayAgent.name}</span>
                                          {(() => {
                                            const info = getSpecificRoleInfo(displayAgent)
                                            return (
                                              <span className="text-[9px] opacity-75">• {info.label}</span>
                                            )
                                          })()}
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-red-400">⚠</span>
                                          <span>Unknown Agent ({actualAgentId || 'no-id'})</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Conversation Mode Indicator for Agent Messages */}
                                {message.type === 'agent' && currentExecution && (
                                  <div className="mb-2">
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${
                                      currentExecution.conversationContext?.mode === 'direct'
                                        ? 'bg-green-500/15 border-green-500/30 text-green-300'
                                        : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                                    }`}>
                                      {currentExecution.conversationContext?.mode === 'direct' ? (
                                        <>
                                          <ArrowRightIcon className="w-3 h-3" />
                                          <span>Direct Response</span>
                                        </>
                                      ) : (
                                        <>
                                          <EyeIcon className="w-3 h-3" />
                                          <span>Supervised</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {message.type === 'user' ? (
                                  <p className="text-[13px] sm:text-sm leading-relaxed">{message.content}</p>
                                ) : (
                                  <Markdown className="prose prose-invert max-w-none text-[13px] sm:text-sm leading-relaxed">{message.content}</Markdown>
                                )}
                                <p className="text-xs opacity-70 mt-1">
                                  {message.timestamp.toLocaleTimeString()}
                                </p>
                                {/* Tools used for this message (if any) */}
                                {renderToolChips(message.id)}
                              </div>
                            </motion.div>
                          )
                        })
                      )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="sticky bottom-0 border-t border-slate-700 p-2 sm:p-4 pb-[env(safe-area-inset-bottom)] bg-slate-800/80 backdrop-blur supports-[backdrop-filter]:bg-slate-800/60">
                    {/* Assignment hint if routing to a different agent than selected */}
                    {effectiveAgent && selectedAgent && effectiveAgent.id !== selectedAgent.id && (
                      <div className="mb-2 text-[11px] text-violet-200/80">
                        Next message will be handled by <span className="font-medium">{effectiveAgent.name}</span>
                      </div>
                    )}
                    {/* Typing indicator when execution is running */}
                    {currentExecution && currentExecution.status === 'running' && (
                      <div className="mb-2 flex items-center gap-2 text-slate-300">
                        {(() => {
                          // Prefer the most recent delegation step target as typing agent
                          const lastStepDelegation = (currentExecution?.steps || [])
                            .filter(st => st.action === 'delegating' && st.metadata?.delegatedTo)
                            .slice(-1)[0]
                          const lastEvent = delegationEvents.slice(-1)[0]
                          const targetId = lastStepDelegation?.metadata?.delegatedTo || lastEvent?.to || selectedAgent?.id
                          const agentForTyping = agents.find(a => a.id === targetId) || selectedAgent
                          const avatar = agentForTyping ? getAgentAvatar(agentForTyping) : null
                          return (
                            <>
                              <Avatar className="w-6 h-6">
                                {avatar ? <AvatarImage src={avatar} alt={agentForTyping?.name || 'Agent'} /> : null}
                                <AvatarFallback className="bg-violet-600 text-[10px]">
                                  {agentForTyping?.name?.[0] || 'A'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs">
                                {agentForTyping?.name || 'Agent'} is typing
                              </span>
                              <span className="flex gap-1 ml-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.2s]"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.1s]"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                              </span>
                            </>
                          )
                        })()}
                      </div>
                    )}
                    <div className="flex gap-2 sm:gap-3">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={`Type a message for ${effectiveAgent?.name || selectedAgent.name}...`}
                        className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 h-10 sm:h-11"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={isLoading}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 h-10 sm:h-11"
                      >
                        <PaperPlaneIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <ChatCircleIcon className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-300 mb-2">Select an agent</h3>
                    <p className="text-slate-500 mb-3">Choose an agent from the list to start chatting</p>
                    <div className="lg:hidden">
                      <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>Choose agent</Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Agent Picker */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="left" className="bg-slate-900 border-slate-800 w-[88%] sm:w-3/4">
          <SheetHeader className="p-3">
            <SheetTitle className="text-white">Select Agent</SheetTitle>
          </SheetHeader>
          <div className="p-3 space-y-3 overflow-y-auto scrollbar-hide">
            {agents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No agents available</div>
            ) : (
              agents.map((agent) => (
                <Card 
                  key={agent.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedAgent?.id === agent.id 
                      ? 'bg-violet-600/20 border-violet-500/50 shadow-lg' 
                      : 'bg-slate-700/30 border-slate-600/50 hover:border-violet-500/30'
                  }`}
                  onClick={() => { setSelectedAgent(agent); setPickerOpen(false) }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 ring-1 ring-slate-600/50">
                        {getAgentAvatar(agent) ? (
                          <AvatarImage src={getAgentAvatar(agent)!} alt={agent.name} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="rounded-lg" style={{ backgroundColor: agent.color }}>
                          {getAgentIcon(agent)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{agent.name}</div>
                        <div className="text-xs text-slate-400 truncate">{agent.description}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </TooltipProvider>
  )
}

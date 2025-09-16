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
import { useExecutionProgress } from './hooks/use-execution-progress'
import ExecutionProgress from '@/components/agents/execution-progress'
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
import DelegationStatus from '@/components/agents/delegation-status'

interface ChatMessage {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  agentId?: string
  agentName?: string
  isDelegated?: boolean
  delegatedFrom?: string | null
  metadata?: Record<string, any> & {
    messageType?: 'delegated_result' | 'supervisor_synthesis'
    sender?: string
  }
  toolCalls?: Array<{ id: string; name: string; args: any; result?: any; error?: string }>
  delegationResults?: Array<{
    agentId: string
    agentName: string
    content: string
    timestamp: Date
    toolCalls?: Array<{ id: string; name: string; args: any; result?: any; error?: string }>
  }>
}

export default function AgentsChatPage() {
  const { 
    agents, 
    executeAgent, 
    isLoading, 
    currentExecution, 
    error, 
    clearError, 
    delegationEvents,
    currentDelegationId,
    activeDelegations
  } = useClientAgentStore()

  // Execution progress hook
  const { progress, setProgress, clearProgress, simulateProgress } = useExecutionProgress()
  
  // Calculate real delegation progress from store
  const delegationProgress = useMemo(() => {
    console.log('🔍 [DELEGATION PROGRESS CALC] currentDelegationId:', currentDelegationId)
    console.log('🔍 [DELEGATION PROGRESS CALC] activeDelegations:', activeDelegations)
    
    if (!currentDelegationId || !activeDelegations[currentDelegationId]) {
      return null
    }
    
    const delegation = activeDelegations[currentDelegationId]
    console.log('🔍 [DELEGATION PROGRESS] Current delegation:', delegation)
    
    // Find the agent by ID to get the friendly name
    const agent = agents.find(a => a.id === delegation.targetAgent)
    const agentName = agent?.name || delegation.targetAgent
    
    // Map delegation stages to messages
    const stageMessages = {
      'initializing': `${agentName} is initializing`,
      'analyzing': `${agentName} is analyzing the task`,
      'researching': `${agentName} is researching`,
      'processing': `${agentName} is processing the task`,
      'synthesizing': `${agentName} is synthesizing results`,
      'finalizing': `${agentName} is finalizing response`
    }
    
    const result = {
      isActive: delegation.status === 'in_progress' || delegation.status === 'completing',
      stage: delegation.stage,
      message: stageMessages[delegation.stage] || `${agentName} está trabajando`,
      agentId: delegation.targetAgent,
      progress: delegation.progress || 0
    }
    
    console.log('🔍 [DELEGATION PROGRESS] Calculated result:', result)
    
    return result
  }, [currentDelegationId, activeDelegations, agents])
  
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
  const initHandledRef = useRef(false)
  
  
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

  // Read URL params for agent selection and message prefill
  useEffect(() => {
    if (initHandledRef.current) return
    try {
      const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      const agentId = sp.get('agentId')
      const prefill = sp.get('prefill')
      const prefillKey = sp.get('prefillKey')

      if (agents && agents.length > 0) {
        if (agentId) {
          const found = agents.find(a => a.id === agentId)
          if (found) setSelectedAgent(found)
        } else if (!selectedAgent) {
          // Default to first agent for smoother UX
          setSelectedAgent(agents[0])
        }
      }

      let initial = ''
      if (prefill) initial = prefill
      if (!initial && prefillKey && typeof window !== 'undefined' && window.sessionStorage) {
        const stored = window.sessionStorage.getItem(prefillKey)
        if (stored) initial = stored
      }
      if (initial) setInputMessage(initial)
      // Clear consumed prefill to avoid polluting future sessions
      if (prefillKey && typeof window !== 'undefined' && window.sessionStorage) {
        try { window.sessionStorage.removeItem(prefillKey) } catch {}
      }
    } catch (_) {
      // ignore
    } finally {
      initHandledRef.current = true
    }
  }, [agents])

  // When an execution completes, append the AI messages from orchestrator
  useEffect(() => {
    if (!currentExecution) return
    if (currentExecution.status !== 'completed') return
    if (appendedExecRef.current.has(currentExecution.id)) return

    console.log('🔍 [CHAT DEBUG] Processing completed execution:', {
      executionId: currentExecution.id,
      status: currentExecution.status,
      messagesCount: currentExecution.messages?.length,
      messages: currentExecution.messages?.map(m => ({
        id: m.id,
        type: m.type,
        contentPreview: m.content.slice(0, 100),
        sender: m.metadata?.sender,
        source: m.metadata?.source
      }))
    })

    const aiMessages = (currentExecution.messages || [])
      .filter((m) => m.type === 'ai')
      // Suppress internal agent error placeholders
      .filter((m) => !(m.metadata && (m.metadata as any).error === 'agent_invoke_failed'))
    
    console.log('🔍 [CHAT DEBUG] Filtered AI messages:', aiMessages.length)
    
    if (aiMessages.length === 0) return

    // Group messages: delegated results + final synthesis
    const delegatedMessages: any[] = []
    let finalSynthesisMessage: any = null
    
    for (const m of aiMessages) {
      const senderId = (m.metadata && (m.metadata as any).sender) || currentExecution.agentId || selectedAgent?.id
      const isDelegatedMessage = senderId && senderId !== currentExecution.agentId && senderId !== 'cleo-supervisor'
      
      console.log('🔍 [DELEGATION DEBUG] Processing message:', {
        messageId: m.id,
        originalSender: m.metadata?.sender,
        extractedSenderId: senderId,
        currentExecutionAgentId: currentExecution.agentId,
        isDelegatedMessage,
        content: m.content.slice(0, 50)
      })
      
      if (isDelegatedMessage) {
        // This is a delegated agent result - store for inclusion as delegation result
        const sender = agents.find((a) => a.id === senderId) || null
        
        console.log('🔍 [DELEGATION DEBUG] Found delegated message:', {
          senderId,
          senderName: sender?.name,
          agentFound: !!sender
        })
        
        delegatedMessages.push({
          agentId: senderId,
          agentName: sender?.name || `Agent ${senderId}`,
          content: m.content,
          timestamp: new Date(m.timestamp as any),
          toolCalls: m.toolCalls || []
        })
      } else {
        // This is the final synthesis message from supervisor
        finalSynthesisMessage = m
      }
    }
    
    console.log('🔍 [CHAT DEBUG] Grouped messages:', {
      delegatedCount: delegatedMessages.length,
      hasFinalSynthesis: !!finalSynthesisMessage,
      delegatedAgents: delegatedMessages.map(d => d.agentName)
    })
    
    // Create the final chat message (synthesis + delegation results)
    const mapped: ChatMessage[] = []
    
    if (finalSynthesisMessage) {
      const supervisorId = currentExecution.agentId || selectedAgent?.id
      const supervisor = agents.find((a) => a.id === supervisorId) || selectedAgent || null
      
      mapped.push({
        id: finalSynthesisMessage.id,
        type: 'agent' as const,
        content: finalSynthesisMessage.content,
        timestamp: new Date(finalSynthesisMessage.timestamp as any),
        agentId: supervisor?.id,
        agentName: supervisor?.name,
        isDelegated: false,
        delegatedFrom: null,
        metadata: { 
          ...(finalSynthesisMessage.metadata as any) || {},
          messageType: 'supervisor_synthesis'
        },
        toolCalls: finalSynthesisMessage.toolCalls || [],
        // Include delegation results as expandable content
        delegationResults: delegatedMessages
      })
    } else if (delegatedMessages.length > 0) {
      // Fallback: if no synthesis, show the last delegated message as main with others as delegation results
      const lastDelegated = delegatedMessages[delegatedMessages.length - 1]
      const otherDelegated = delegatedMessages.slice(0, -1)
      
      mapped.push({
        id: `fallback_${Date.now()}`,
        type: 'agent' as const,
        content: lastDelegated.content,
        timestamp: lastDelegated.timestamp,
        agentId: lastDelegated.agentId,
        agentName: lastDelegated.agentName,
        isDelegated: true,
        delegatedFrom: currentExecution.agentId,
        metadata: { messageType: 'delegated_result' },
        toolCalls: lastDelegated.toolCalls,
        delegationResults: otherDelegated
      })
    }

    console.log('🔍 [CHAT DEBUG] Adding mapped messages to chat:', mapped.length)
    setMessages((prev) => [...prev, ...mapped])
    appendedExecRef.current.add(currentExecution.id)
  }, [currentExecution?.id, currentExecution?.status])

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

  // Simulate execution progress when currentExecution status changes
  useEffect(() => {
    if (!currentExecution) {
      clearProgress()
      return
    }

    if (currentExecution.status === 'running') {
      // Determine target agent from delegation events or default to selected agent
      const lastDelegationStep = (currentExecution?.steps || [])
        .filter(st => st.action === 'delegating' && st.metadata?.delegatedTo)
        .slice(-1)[0]
      
      const recentMessages = (currentExecution?.messages || [])
        .filter(m => m.type === 'ai' && m.metadata?.sender && m.metadata.sender !== 'cleo-supervisor')
      const lastDelegatedMessage = recentMessages.slice(-1)[0]
      
      let targetAgentId = selectedAgent?.id
      let targetAgentName = selectedAgent?.name
      
      if (lastDelegationStep) {
        targetAgentId = lastDelegationStep.metadata.delegatedTo
        targetAgentName = agents.find(a => a.id === targetAgentId)?.name || 'Agent'
      } else if (lastDelegatedMessage && lastDelegatedMessage.metadata?.sender) {
        targetAgentId = lastDelegatedMessage.metadata.sender
        targetAgentName = agents.find(a => a.id === targetAgentId)?.name || 'Agent'
      }
      
      // Define realistic progression stages
      const progressStages = [
        {
          stage: 'initializing',
          message: `Starting task analysis...`,
          agentId: 'cleo-supervisor',
          duration: 1000
        },
        {
          stage: 'analyzing',
          message: `${targetAgentName} analyzing request...`,
          agentId: targetAgentId,
          duration: 2000
        }
      ]
      
      // Add delegation-specific stages if there was delegation
      if (lastDelegationStep || lastDelegatedMessage) {
        progressStages.push(
          {
            stage: 'researching',
            message: `${targetAgentName} researching and gathering information...`,
            agentId: targetAgentId,
            duration: 3000
          },
          {
            stage: 'processing',
            message: `${targetAgentName} processing findings...`,
            agentId: targetAgentId,
            duration: 2500
          },
          {
            stage: 'finalizing',
            message: `Cleo synthesizing results...`,
            agentId: 'cleo-supervisor',
            duration: 1500
          }
        )
      } else {
        progressStages.push(
          {
            stage: 'processing',
            message: `${targetAgentName} processing request...`,
            agentId: targetAgentId,
            duration: 3000
          },
          {
            stage: 'finalizing',
            message: `${targetAgentName} finalizing response...`,
            agentId: targetAgentId,
            duration: 1500
          }
        )
      }

      simulateProgress(progressStages)
    } else if (currentExecution.status === 'completed') {
      clearProgress()
    }
  }, [currentExecution?.status, currentExecution?.id, simulateProgress, clearProgress])

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
          toolCalls: m.tool_calls || [], // Include toolCalls from database
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

  // Refresh messages when execution completes to ensure DB persistence
  // This ensures a reply shows even if execution.messages are not populated by the orchestrator
  useEffect(() => {
    const refreshMessagesAfterExecution = async () => {
      if (!currentExecution || currentExecution.status !== 'completed' || !selectedAgent) return

      // Wait a bit for server-side persistence to commit
      setTimeout(async () => {
        try {
          const threadKey = `${selectedAgent.id}_${forceSupervised ? 'supervised' : 'direct'}`
          const params = new URLSearchParams({ agentKey: threadKey, limit: '1' })
          const res = await fetch(`/api/agents/threads?${params.toString()}`, { credentials: 'same-origin' })
          if (!res.ok) return

          const data = await res.json()
          const thread = data?.threads?.[0]
          if (!thread?.id) return

          const mr = await fetch(`/api/agents/threads/${thread.id}/messages?limit=200`, { credentials: 'same-origin' })
          if (!mr.ok) return

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
            toolCalls: m.tool_calls || [],
          }))

          console.log('🔄 [CHAT DEBUG] Refreshed messages after execution completion:', mapped.length)
          setMessages(mapped)
        } catch (e) {
          console.warn('Failed to refresh messages after execution:', e)
        }
      }, 1500)
    }

    refreshMessagesAfterExecution()
  }, [currentExecution?.status, currentExecution?.id, selectedAgent, forceSupervised])

  
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

  // Helper to render tool call chips for a message
  const renderToolChips = (messageId: string, message?: ChatMessage) => {
    // Helper function to get tool icon, style, and display name
    const getToolDisplay = (toolName: string) => {
      const name = toolName.toLowerCase()
      
      // Delegation tools - Agent-specific styling with avatars
      if (name === 'delegate_to_apu') {
        return {
          icon: '/img/agents/apu4.png',
          bgColor: 'bg-purple-500/15',
          borderColor: 'border-purple-400/30',
          textColor: 'text-purple-200',
          badgeColor: 'bg-purple-400/20',
          displayName: '🔍 Delegado a Apu',
          description: 'Investigación y Búsqueda Avanzada'
        }
      }
      if (name === 'delegate_to_emma') {
        return {
          icon: '/img/agents/emma4.png',
          bgColor: 'bg-pink-500/15',
          borderColor: 'border-pink-400/30',
          textColor: 'text-pink-200',
          badgeColor: 'bg-pink-400/20',
          displayName: '🛍️ Delegado a Emma',
          description: 'E-commerce y Negocios'
        }
      }
      if (name === 'delegate_to_toby') {
        return {
          icon: '/img/agents/toby4.png',
          bgColor: 'bg-blue-500/15',
          borderColor: 'border-blue-400/30',
          textColor: 'text-blue-200',
          badgeColor: 'bg-blue-400/20',
          displayName: '⚡ Delegado a Toby',
          description: 'Análisis Técnico y Datos'
        }
      }
      if (name === 'delegate_to_ami') {
        return {
          icon: '/img/agents/ami4.png',
          bgColor: 'bg-orange-500/15',
          borderColor: 'border-orange-400/30',
          textColor: 'text-orange-200',
          badgeColor: 'bg-orange-400/20',
          displayName: '🎨 Delegado a Ami',
          description: 'Creatividad y Diseño'
        }
      }
      if (name === 'delegate_to_peter') {
        return {
          icon: '/img/agents/peter4.png',
          bgColor: 'bg-green-500/15',
          borderColor: 'border-green-400/30',
          textColor: 'text-green-200',
          badgeColor: 'bg-green-400/20',
          displayName: '🧮 Delegado a Peter',
          description: 'Lógica y Matemáticas'
        }
      }
      
      // Google Docs tools
      if (name === 'creategoogledoc') {
        return {
          icon: '/icons/google_docs.png',
          bgColor: 'bg-blue-500/15',
          borderColor: 'border-blue-400/30',
          textColor: 'text-blue-200',
          badgeColor: 'bg-blue-400/20',
          displayName: '📄 Create Google Doc',
          description: 'Document creation'
        }
      }
      if (name === 'readgoogledoc') {
        return {
          icon: '/icons/google_docs.png',
          bgColor: 'bg-green-500/15',
          borderColor: 'border-green-400/30',
          textColor: 'text-green-200',
          badgeColor: 'bg-green-400/20',
          displayName: '📖 Read Google Doc',
          description: 'Document reading'
        }
      }
      if (name === 'updategoogledoc') {
        return {
          icon: '/icons/google_docs.png',
          bgColor: 'bg-yellow-500/15',
          borderColor: 'border-yellow-400/30',
          textColor: 'text-yellow-200',
          badgeColor: 'bg-yellow-400/20',
          displayName: '✏️ Update Google Doc',
          description: 'Document editing'
        }
      }
      
      // Google Sheets tools  
      if (name === 'creategooglesheet') {
        return {
          icon: '/icons/sheets.png',
          bgColor: 'bg-green-500/15',
          borderColor: 'border-green-400/30',
          textColor: 'text-green-200',
          badgeColor: 'bg-green-400/20',
          displayName: '📊 Create Google Sheet',
          description: 'Spreadsheet creation'
        }
      }
      if (name === 'readgooglesheet') {
        return {
          icon: '/icons/sheets.png',
          bgColor: 'bg-blue-500/15',
          borderColor: 'border-blue-400/30',
          textColor: 'text-blue-200',
          badgeColor: 'bg-blue-400/20',
          displayName: '📈 Read Google Sheet',
          description: 'Spreadsheet reading'
        }
      }
      if (name === 'updategooglesheet') {
        return {
          icon: '/icons/sheets.png',
          bgColor: 'bg-yellow-500/15',
          borderColor: 'border-yellow-400/30',
          textColor: 'text-yellow-200',
          badgeColor: 'bg-yellow-400/20',
          displayName: '✏️ Update Google Sheet',
          description: 'Spreadsheet editing'
        }
      }
      if (name === 'appendgooglesheet') {
        return {
          icon: '/icons/sheets.png',
          bgColor: 'bg-purple-500/15',
          borderColor: 'border-purple-400/30',
          textColor: 'text-purple-200',
          badgeColor: 'bg-purple-400/20',
          displayName: '➕ Append Google Sheet',
          description: 'Add data to spreadsheet'
        }
      }
      
      // SerpAPI/Google search tools
      if (name.includes('serp') || name.includes('google') || name.includes('search')) {
        return {
          icon: '/img/google-icon.png',
          bgColor: 'bg-blue-500/15',
          borderColor: 'border-blue-400/30',
          textColor: 'text-blue-200',
          badgeColor: 'bg-blue-400/20',
          displayName: name.includes('news') ? '📰 News Search' : 
                      name.includes('scholar') ? '🎓 Scholar Search' :
                      name.includes('location') ? '📍 Location Search' : '🔍 Web Search',
          description: 'Google-powered search'
        }
      }
      
      // Other tools with better names
      if (name === 'getcurrentdatetime') {
        return {
          icon: null,
          bgColor: 'bg-slate-500/15',
          borderColor: 'border-slate-400/30',
          textColor: 'text-slate-200',
          badgeColor: 'bg-slate-400/20',
          displayName: '🕐 Current Time',
          description: 'Date & time information'
        }
      }
      
      if (name === 'weatherinfo') {
        return {
          icon: null,
          bgColor: 'bg-sky-500/15',
          borderColor: 'border-sky-400/30',
          textColor: 'text-sky-200',
          badgeColor: 'bg-sky-400/20',
          displayName: '🌤️ Weather Info',
          description: 'Weather conditions'
        }
      }
      
      // Default tool style
      return {
        icon: null,
        bgColor: 'bg-amber-500/15',
        borderColor: 'border-amber-400/30',
        textColor: 'text-amber-200',
        badgeColor: 'bg-amber-400/20',
        displayName: toolName.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'),
        description: 'System tool'
      }
    }

    // Extract tool invocations from persisted message parts (for historical messages)
    const extractToolsFromParts = (message: any) => {
      if (!message || !message.parts) return []
      
      try {
        const parts = Array.isArray(message.parts) ? message.parts : JSON.parse(message.parts)
        const toolInvocations = parts.filter((part: any) => 
          part.type === 'tool-invocation' && 
          part.toolInvocation && 
          part.toolInvocation.toolName
        )
        
        return toolInvocations.map((part: any) => ({
          id: part.toolInvocation.toolCallId || Math.random().toString(),
          name: part.toolInvocation.toolName,
          args: part.toolInvocation.args || {},
          result: part.toolInvocation.result
        }))
      } catch (error) {
        console.warn('Error parsing tool invocations from parts:', error)
        return []
      }
    }

    // Get tools from message.toolCalls (runtime) or extract from parts (historical)
    let toolCalls = []
    if (message && message.toolCalls && message.toolCalls.length > 0) {
      toolCalls = message.toolCalls
    } else if (message) {
      toolCalls = extractToolsFromParts(message)
    }

    // First try to get toolCalls from the message directly or extracted from parts
    if (toolCalls.length > 0) {
      return (
        <div className="mt-2 flex flex-wrap gap-2">
          {toolCalls.map((tc: any, idx: number) => {
            const key = `${messageId}_tool_${idx}`
            const open = !!expandedTools[key]
            const display = getToolDisplay(tc.name)
            return (
              <div key={key} className={`group relative inline-flex items-center gap-2 rounded-lg border ${display.borderColor} ${display.bgColor} ${display.textColor} px-3 py-1.5 text-[11px] shadow-sm transition-all hover:shadow-md`}>
                <div className="flex items-center gap-1.5">
                  {display.icon && (
                    <img src={display.icon} alt="" className="w-6 h-6 rounded-full opacity-90" />
                  )}
                  <span className={`inline-block ${display.badgeColor} rounded-full px-2 py-0.5 text-[9px] uppercase font-medium tracking-wide`}>
                    tool
                  </span>
                </div>
                <span className="font-medium">{tc.name}</span>
                {tc.args && Object.keys(tc.args).length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-5 px-2 ${display.textColor} hover:${display.textColor.replace('200', '100')} transition-colors`} 
                    onClick={() => setExpandedTools((prev) => ({ ...prev, [key]: !open }))}
                  >
                    <span className="text-[10px]">{open ? '▼' : '▶'}</span>
                  </Button>
                )}
                {open && (
                  <div className="absolute top-full left-0 z-10 mt-1 w-80 text-[10px] bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-slate-300 shadow-lg backdrop-blur-sm">
                    <div className="font-medium text-slate-200 mb-2">Tool Arguments:</div>
                    <pre className="whitespace-pre-wrap break-words overflow-auto max-h-40">{JSON.stringify(tc.args, null, 2)}</pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }
    
    // Fallback to currentExecution for newly executed messages
    const exec = currentExecution
    if (!exec || !exec.messages) return null
    const m = exec.messages.find((mm) => mm.id === messageId)
    if (!m || !m.toolCalls || m.toolCalls.length === 0) return null
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {m.toolCalls.map((tc, idx) => {
          const key = `${messageId}_tool_${idx}`
          const open = !!expandedTools[key]
          const display = getToolDisplay(tc.name)
          return (
            <div key={key} className={`group relative inline-flex items-center gap-2 rounded-lg border ${display.borderColor} ${display.bgColor} ${display.textColor} px-3 py-1.5 text-[11px] shadow-sm transition-all hover:shadow-md`}>
              <div className="flex items-center gap-1.5">
                {display.icon && (
                  <img src={display.icon} alt="" className="w-6 h-6 rounded-full opacity-90" />
                )}
                <span className={`inline-block ${display.badgeColor} rounded-full px-2 py-0.5 text-[9px] uppercase font-medium tracking-wide`}>
                  tool
                </span>
              </div>
              <span className="font-medium">{tc.name}</span>
              {tc.args && Object.keys(tc.args).length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-5 px-2 ${display.textColor} hover:${display.textColor.replace('200', '100')} transition-colors`} 
                  onClick={() => setExpandedTools((prev) => ({ ...prev, [key]: !open }))}
                >
                  <span className="text-[10px]">{open ? '▼' : '▶'}</span>
                </Button>
              )}
              {open && (
                <div className="absolute top-full left-0 z-10 mt-1 w-80 text-[10px] bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-slate-300 shadow-lg backdrop-blur-sm">
                  <div className="font-medium text-slate-200 mb-2">Tool Arguments:</div>
                  <pre className="whitespace-pre-wrap break-words overflow-auto max-h-40">{JSON.stringify(tc.args, null, 2)}</pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Helper to render delegation results as expandible chips
  const renderDelegationResults = (messageId: string, delegationResults?: Array<{
    agentId: string
    agentName: string
    content: string
    timestamp: Date
    toolCalls?: Array<{ id: string; name: string; args: any; result?: any; error?: string }>
  }>) => {
    if (!delegationResults || delegationResults.length === 0) return null

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {delegationResults.map((result, idx) => {
          const key = `${messageId}_delegation_${idx}`
          const open = !!expandedTools[key]
          const agent = agents.find(a => a.id === result.agentId)
          const agentAvatar = agent ? getAgentAvatar(agent) : null
          
          return (
            <div 
              key={key} 
              className="group relative inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 px-3 py-1.5 text-[11px] shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-1.5">
                {agentAvatar ? (
                  <img src={agentAvatar} alt="" className="w-6 h-6 rounded-full opacity-90" />
                ) : (
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="bg-emerald-600 text-[8px]">
                      {result.agentName?.[0] || 'A'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="inline-block bg-emerald-400/20 rounded-full px-2 py-0.5 text-[9px] uppercase font-medium tracking-wide">
                  delegated
                </span>
              </div>
              <span className="font-medium">Tarea realizada por {result.agentName}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 px-2 text-emerald-200 hover:text-emerald-100 transition-colors" 
                onClick={() => setExpandedTools((prev) => ({ ...prev, [key]: !open }))}
              >
                <span className="text-[10px]">{open ? '▼' : '▶'}</span>
              </Button>
              {open && (
                <div className="absolute top-full left-0 z-10 mt-1 w-96 text-[12px] bg-slate-900/95 border border-slate-700 rounded-lg p-4 text-slate-300 shadow-lg backdrop-blur-sm max-h-80 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
                    {agentAvatar ? (
                      <img src={agentAvatar} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-emerald-600 text-xs">
                          {result.agentName?.[0] || 'A'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <div className="font-medium text-slate-200">{result.agentName}</div>
                      <div className="text-[10px] text-slate-400">
                        {result.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="font-medium text-slate-200 mb-2">Resultado del Agente:</div>
                    <div className="bg-slate-800/50 rounded p-2 border border-slate-700">
                      <Markdown className="prose prose-invert max-w-none text-[11px] leading-relaxed">
                        {result.content}
                      </Markdown>
                    </div>
                  </div>
                  
                  {result.toolCalls && result.toolCalls.length > 0 && (
                    <div>
                      <div className="font-medium text-slate-200 mb-2">Tools Utilizados:</div>
                      <div className="space-y-1">
                        {result.toolCalls.map((tc, tcIdx) => (
                          <div key={tcIdx} className="bg-slate-800/50 rounded p-2 border border-slate-700">
                            <div className="font-medium text-[10px] text-slate-300 mb-1">{tc.name}</div>
                            {tc.args && (
                              <pre className="text-[9px] text-slate-400 whitespace-pre-wrap break-words">
                                {JSON.stringify(tc.args, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
        return <BrainIcon className="w-6 h-6" />
      case 'lightning':
        return <LightningIcon className="w-6 h-6" />
      case 'heart':
        return <HeartIcon className="w-6 h-6" />
      default:
        return <RobotIcon className="w-6 h-6" />
    }
  }

  const getAgentAvatar = (agent: AgentConfig) => {
    // Prefer explicit avatar from config when available
    if (agent.avatar) return agent.avatar
    // Map common agent names to avatars in public/img/agents
    const key = agent.name?.toLowerCase()
    if (key?.includes('user message')) return null // No avatar for user message, use icon instead
    if (key?.includes('toby')) return '/img/agents/toby4.png'
    if (key?.includes('ami')) return '/img/agents/ami4.png'
    if (key?.includes('peter')) return '/img/agents/peter4.png'
    if (key?.includes('cleo')) return '/img/agents/logocleo4.png'
    if (key?.includes('emma')) return '/img/agents/emma4.png'
    if (key?.includes('wex')) return '/img/agents/wex4.png'
    if (key?.includes('apu')) return '/img/agents/apu4.png'
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
  <div className="py-2 sm:py-4 h-full overflow-hidden">
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

        <div className="space-y-4 sm:space-y-6 w-full h-full overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 h-[calc(100dvh-200px)] sm:h-[calc(100dvh-220px)] w-full overflow-hidden">
            {/* Agent Selection Sidebar */}
            <div className="hidden lg:block lg:col-span-1 h-full overflow-hidden">
            <Card className="h-full bg-slate-800/50 border-slate-700/50 overflow-hidden flex flex-col">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <RobotIcon className="w-6 h-6" />
                  Available Agents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 overflow-y-auto">
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
          <div className="lg:col-span-3 h-full overflow-hidden">
            <Card className="h-full bg-slate-800/50 border-slate-700/50 flex flex-col overflow-hidden">
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
                            ? (agents.find(a => a.id === actualAgentId) || selectedAgent || null)
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
                                  <div className="mb-2 flex items-center gap-2">
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
                                    {/* Delegation indicator */}
                                    {message.isDelegated && message.delegatedFrom && (
                                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                        <span>🔗</span>
                                        <span>Delegated task</span>
                                      </div>
                                    )}
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
                                {renderToolChips(message.id, message)}
                                {/* Delegation results for this message (if any) */}
                                {renderDelegationResults(message.id, message.delegationResults)}
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
                    
                    {/* Enhanced execution progress indicator */}
                    {currentExecution && currentExecution.status === 'running' && (
                      <div className="mb-3">
                        {/* Show delegation progress if available, otherwise fallback to simulated progress */}
                        {delegationProgress && delegationProgress.isActive ? (
                          <ExecutionProgress
                            stage={delegationProgress.stage}
                            message={delegationProgress.message}
                            agentId={delegationProgress.agentId}
                            agentName={agents.find(a => a.id === delegationProgress.agentId)?.name}
                            agentAvatar={(() => {
                              const agent = agents.find(a => a.id === delegationProgress.agentId)
                              return agent ? getAgentAvatar(agent) || undefined : undefined
                            })()}
                            progress={delegationProgress.progress}
                            isActive={delegationProgress.isActive}
                          />
                        ) : progress && progress.isActive ? (
                          <ExecutionProgress
                            stage={progress.stage}
                            message={progress.message}
                            agentId={progress.agentId}
                            agentName={agents.find(a => a.id === progress.agentId)?.name}
                            agentAvatar={(() => {
                              const agent = agents.find(a => a.id === progress.agentId)
                              return agent ? getAgentAvatar(agent) || undefined : undefined
                            })()}
                            progress={progress.progress}
                            isActive={progress.isActive}
                          />
                        ) : currentDelegationId ? (
                          <DelegationStatus className="mb-0" />
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <Avatar className="w-6 h-6">
                              {selectedAgent && getAgentAvatar(selectedAgent) ? (
                                <AvatarImage src={getAgentAvatar(selectedAgent)!} alt={selectedAgent.name} />
                              ) : null}
                              <AvatarFallback className="bg-violet-600 text-[10px]">
                                {selectedAgent?.name?.[0] || 'A'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="text-sm text-slate-200">
                                <span className="font-medium">{selectedAgent?.name || 'Agent'}</span> is working...
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.2s]"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.1s]"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                            </div>
                          </div>
                        )}
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

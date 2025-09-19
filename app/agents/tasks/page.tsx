
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ListChecksIcon, CalendarIcon, ClockIcon, CheckCircleIcon, CircleIcon, PlayIcon, PauseIcon, ArrowClockwiseIcon, TrashIcon, ChatCircleIcon, PencilIcon } from '@phosphor-icons/react'
import { Inbox, Bell } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DateTime } from 'luxon'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useUserTimezone } from '@/app/hooks/use-user-timezone'

type AgentSummary = {
  id: string
  name: string
  icon?: string
  color?: string
}

type AgentTask = {
  task_id: string
  user_id: string
  title: string
  description: string
  agent_id: string
  agent_name: string
  agent_avatar?: string
  task_type: string
  priority?: number
  task_config: Record<string, any>
  context_data: Record<string, any>
  scheduled_for?: string
  scheduled_at?: string
  status: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled'
  created_at: string
  updated_at: string
  completed_at?: string
  error_message?: string
  result_data?: any
  execution_time_ms?: number
  tags?: string[]
}

type TaskNotification = {
  id: string
  user_id: string
  task_id: string
  agent_id: string
  agent_name: string
  agent_avatar?: string
  notification_type: 'task_completed' | 'task_failed' | 'task_scheduled' | 'task_reminder'
  title: string
  message: string
  task_result?: any
  error_details?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  read: boolean
  read_at?: string
  action_buttons?: Array<{
    label: string
    action: string
    variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  }>
  metadata?: any
  expires_at?: string
  created_at: string
  updated_at: string
}

export default function AgentsTasksPage() {
  // Hook para detectar timezone automáticamente
  const { timezone: userTimezone, isLoading: timezoneLoading, getTimezoneDisplayName, formatInUserTimezone } = useUserTimezone()
  
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [notifications, setNotifications] = useState<TaskNotification[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [includeCompleted, setIncludeCompleted] = useState(true)
  const [creating, setCreating] = useState(false)
  const [openResults, setOpenResults] = useState<Record<string, boolean>>({})

  // Create-form state
  const [formOpen, setFormOpen] = useState(false)
  const [formAgentId, setFormAgentId] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formTaskType, setFormTaskType] = useState<'manual' | 'scheduled' | 'recurring'>('manual')
  const [formPriority, setFormPriority] = useState(5)
  const [formScheduledAt, setFormScheduledAt] = useState('')
  const [formCron, setFormCron] = useState('')
  const [formTimezone, setFormTimezone] = useState('UTC') // Se actualizará automáticamente
  const [formTags, setFormTags] = useState('')
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(true)
  const [notifyOnFailure, setNotifyOnFailure] = useState(true)
  
  // Estados para edición de tasks
  const [editingTask, setEditingTask] = useState<AgentTask | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<TaskNotification | null>(null)
  const [showRawResult, setShowRawResult] = useState(false)

  // Actualizar timezone automáticamente cuando se detecte
  useEffect(() => {
    if (!timezoneLoading && userTimezone) {
      setFormTimezone(userTimezone)
      console.log('🌍 Timezone automático configurado:', userTimezone, 'Display:', getTimezoneDisplayName())
    }
  }, [userTimezone, timezoneLoading, getTimezoneDisplayName])

  // Mostrar toast informativo cuando se detecte el timezone
  useEffect(() => {
    if (!timezoneLoading && userTimezone && userTimezone !== 'UTC') {
      console.log('ℹ️ Timezone detectado automáticamente:', getTimezoneDisplayName())
    }
  }, [userTimezone, timezoneLoading, getTimezoneDisplayName])

  const openDetails = (n: TaskNotification) => {
    setSelectedNotification(n)
    setDetailsOpen(true)
  setShowRawResult(false)
    if (!n.read) {
      markNotificationAsRead(n.id)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/40'
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/40'
      case 'cancelled': return 'bg-slate-500/20 text-slate-300 border-slate-500/40'
      case 'running': return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      case 'scheduled': return 'bg-orange-500/20 text-orange-300 border-orange-500/40'
      case 'pending': return 'bg-purple-500/20 text-purple-300 border-purple-500/40'
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/40'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="w-4 h-4" />
      case 'failed': return <CircleIcon className="w-4 h-4" />
      case 'cancelled': return <PauseIcon className="w-4 h-4" />
      case 'running': return <PlayIcon className="w-4 h-4" />
      case 'scheduled': return <ClockIcon className="w-4 h-4" />
      case 'pending': return <CircleIcon className="w-4 h-4" />
      default: return <CircleIcon className="w-4 h-4" />
    }
  }

  // Avatar resolver: prefer explicit URL, else map by agent name
  const getAgentAvatarUrl = (agentName?: string, avatarField?: string) => {
    if (avatarField && /\.(png|jpg|jpeg|gif|webp)$/i.test(avatarField)) return avatarField
    // Accept values like "/img/agents/emma4.png" even without extension test above
    if (avatarField && avatarField.startsWith('/img/agents/')) return avatarField
    const map: Record<string, string> = {
      'emma': '/img/agents/emma4.png',
      'wex': '/img/agents/wex4.png',
      'toby': '/img/agents/toby4.png',
      'peter': '/img/agents/peter4.png',
      'apu': '/img/agents/apu4.png',
      'ami': '/img/agents/ami4.png',
      // fallback brand avatar
      'cleo': '/img/agents/logocleo4.png'
    }
    const key = (agentName || '').toLowerCase().trim()
    return map[key] || '/img/agents/logocleo4.png'
  }

  const formatDate = (dateString?: string, timezone?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const effectiveTimezone = timezone || userTimezone || 'UTC'
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: effectiveTimezone
    }).format(date)
  }

  // Helper function to format time ago
  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'hace unos segundos'
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`
    if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 86400)} días`
    return `hace ${Math.floor(diffInSeconds / 2592000)} meses`
  }

  const renderResultPreview = (result: any) => {
    if (result == null) return null
    if (typeof result === 'string') return <pre className="whitespace-pre-wrap text-foreground text-sm">{result}</pre>
    try {
      return (
        <pre className="whitespace-pre-wrap text-foreground text-xs bg-background/50 p-3 rounded border border-border overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )
    } catch {
      return <pre className="whitespace-pre-wrap text-foreground text-sm">{String(result)}</pre>
    }
  }

  const fetchAgents = async () => {
    try {
  const res = await fetch('/api/agents?includeSubAgents=1')
      const data = await res.json()
      if (Array.isArray(data.agents)) {
        setAgents(data.agents.map((a: any) => ({ 
          id: a.id, 
          name: a.name, 
          icon: a.icon || '🤖', 
          color: a.color || '#6366f1' 
        })))
      }
    } catch (e) {
      console.error('Failed to load agents', e)
    }
  }

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (includeCompleted) params.append('include_completed', 'true')
      const res = await fetch(`/api/agent-tasks?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setTasks(data.tasks || [])
      } else {
        console.error('❌ Error fetching agent tasks:', data.error)
      }
    } catch (e) {
      console.error('Failed to load tasks', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true)
      const res = await fetch('/api/notifications?limit=50&unread_only=false')
      const data = await res.json()
      if (data.success) {
        setNotifications(data.notifications || [])
      } else {
        console.error('❌ Error fetching notifications:', data.error)
      }
    } catch (e) {
      console.error('Failed to load notifications', e)
    } finally {
      setNotificationsLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    fetchTasks()
    if (activeTab === 'inbox') {
      fetchNotifications()
    }
  }, [statusFilter, includeCompleted, activeTab])

  // Auto-refresh active tasks every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      const hasActive = tasks.some((t: AgentTask) => ['pending', 'scheduled', 'running'].includes(t.status))
      if (hasActive) fetchTasks()
      if (activeTab === 'inbox') fetchNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [tasks, activeTab])

  // Deep link handling: ?tab=inbox&open=<notificationId>
  useEffect(() => {
    const tab = searchParams.get('tab')
    const openId = searchParams.get('open')
    if (tab === 'inbox') setActiveTab('inbox')

    if (tab === 'inbox' && openId) {
      // Ensure notifications are loaded then open
      const ensure = async () => {
        await fetchNotifications()
        const target = notifications.find(n => n.id === openId)
        if (target) {
          openDetails(target)
        }
      }
      ensure()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return tasks
    return tasks.filter(t =>
      t.title.toLowerCase().includes(term) ||
      t.description.toLowerCase().includes(term) ||
      t.agent_name.toLowerCase().includes(term)
    )
  }, [tasks, searchTerm])

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = window.confirm('Delete this task? This cannot be undone.')
    if (!confirmed) return
    try {
      const res = await fetch(`/api/agent-tasks?task_id=${encodeURIComponent(taskId)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) {
        console.error('Failed to delete task:', data.error)
        return
      }
      setTasks(prev => prev.filter(t => t.task_id !== taskId))
    } catch (e) {
      console.error('Error deleting task:', e)
    }
  }

  const handleRetryTask = async (taskId: string) => {
    try {
      const res = await fetch('/api/agent-tasks/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId })
      })
      const data = await res.json()
      if (data.success) {
        // Refresh tasks to show updated status
        await fetchTasks()
      } else {
        console.error('Failed to retry task:', data.error)
        alert('Failed to retry task: ' + (data.error || 'Unknown error'))
      }
    } catch (e) {
      console.error('Error retrying task:', e)
      alert('Error retrying task')
    }
  }

  const submitCreate = async () => {
    if (!formAgentId || !formTitle || !formDescription) return
    setCreating(true)
    try {
      const agent = agents.find(a => a.id === formAgentId)
      const body: any = {
        agent_id: formAgentId,
        agent_name: agent?.name || 'Agent',
        // Use proper avatar URL instead of icon text
        agent_avatar: getAgentAvatarUrl(agent?.name, agent?.icon),
        title: formTitle,
        description: formDescription,
        task_type: formTaskType,
        priority: formPriority,
        timezone: formTimezone,
        notify_on_completion: notifyOnCompletion,
        notify_on_failure: notifyOnFailure,
        tags: formTags ? formTags.split(',').map(t => t.trim()).filter(Boolean) : []
      }
      
      // Convert datetime-local to ISO string with proper timezone handling
      if (formTaskType === 'scheduled' && formScheduledAt) {
        // Interpret the input as time in the SELECTED timezone, not the browser's
        const zoned = DateTime.fromISO(formScheduledAt, { zone: formTimezone || 'UTC' })
        const utcIso = zoned.toUTC().toISO()
        body.scheduled_at = utcIso

        console.log('📅 Scheduled task:', {
          inputTime: formScheduledAt,
          interpretedZone: formTimezone,
          zonedISO: zoned.toISO(),
          utcTime: utcIso,
        })
      }
      if (formTaskType === 'recurring' && formCron) body.cron_expression = formCron

      const res = await fetch('/api/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!data.success) {
        console.error('Failed to create task:', data.error)
        return
      }
      // Reset and refresh
      setFormOpen(false)
      setFormTitle('')
      setFormDescription('')
      setFormTaskType('manual')
      setFormPriority(5)
      setFormScheduledAt('')
      setFormCron('')
      setFormTimezone(userTimezone) // Usar timezone del usuario
      setFormTags('')
      await fetchTasks()
    } catch (e) {
      console.error('Create task error', e)
    } finally {
      setCreating(false)
    }
  }

  // Funciones para edición de tasks
  const openEditDialog = (task: AgentTask) => {
    setEditingTask(task)
    setFormTitle(task.title)
    setFormDescription(task.description)
    setFormTaskType(task.task_type as 'manual' | 'scheduled' | 'recurring')
    setFormPriority(task.priority || 5)
    setFormScheduledAt(task.scheduled_at ? new Date(task.scheduled_at).toISOString().slice(0, 16) : '')
    setFormCron(task.task_config?.cron || '')
    setFormTimezone((task as any).timezone || userTimezone)
    setFormTags(task.tags?.join(', ') || '')
    setEditOpen(true)
  }

  const saveEditedTask = async () => {
    if (!editingTask) return
    
    setCreating(true)
    try {
      let scheduledAtISO = null
      if (formTaskType === 'scheduled' && formScheduledAt) {
        const zoned = DateTime.fromISO(formScheduledAt, { zone: formTimezone || userTimezone })
        scheduledAtISO = zoned.toUTC().toISO()
      }

      const res = await fetch(`/api/agents/tasks/${editingTask.task_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          task_type: formTaskType,
          priority: formPriority,
          scheduled_at: scheduledAtISO,
          task_config: {
            cron: formTaskType === 'recurring' ? formCron : undefined,
            notify_on_completion: notifyOnCompletion,
            notify_on_failure: notifyOnFailure,
          },
          timezone: formTimezone,
          tags: formTags.split(',').map(t => t.trim()).filter(Boolean)
        })
      })
      
      const data = await res.json()
      if (!data.success) {
        console.error('Failed to update task:', data.error)
        return
      }
      
      // Reset and refresh
      setEditOpen(false)
      setEditingTask(null)
      setFormTitle('')
      setFormDescription('')
      setFormTaskType('manual')
      setFormPriority(5)
      setFormScheduledAt('')
      setFormCron('')
      setFormTimezone(userTimezone)
      setFormTags('')
      await fetchTasks()
    } catch (e) {
      console.error('Update task error', e)
    } finally {
      setCreating(false)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/mark-read`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setNotifications(prev => prev.map(n => 
          n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
        ))
      }
    } catch (e) {
      console.error('Error marking notification as read:', e)
    }
  }

  const markAllNotificationsAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })))
      }
    } catch (e) {
      console.error('Error marking all notifications as read:', e)
    }
  }

  const unreadNotificationsCount = notifications.filter(n => !n.read).length

  // Build prefill handoff to chat using sessionStorage (avoids long URLs)
  const continueChatWithTask = (task: AgentTask) => {
    try {
      const key = `prefill:task:${task.task_id}`
      const preview = (() => {
        const header = `Follow-up on task: ${task.title}\nAgent: ${task.agent_name}\nStatus: ${task.status}${task.completed_at ? ` (completed at ${formatDate(task.completed_at)})` : ''}`
        const body = (() => {
          const r = task.result_data
          if (r == null) return ''
          if (typeof r === 'string') return `\n\nResult:\n${r.slice(0, 2000)}`
          try {
            const json = JSON.stringify(r, null, 2)
            return `\n\nResult (JSON):\n${json.slice(0, 2000)}`
          } catch {
            return `\n\nResult:\n${String(r).slice(0, 2000)}`
          }
        })()
        return `${header}${body}\n\nPlease help me refine or act on this result.`
      })()
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, preview)
      }
      const params = new URLSearchParams({ agentId: task.agent_id, prefillKey: key })
      window.location.href = `/agents/chat?${params.toString()}`
    } catch (e) {
      console.warn('Failed to open chat with prefill:', e)
    }
  }

  const continueChatFromNotification = (n: TaskNotification) => {
    try {
  // Mark as read optimistically
  setNotifications(prev => prev.map(nn => nn.id === n.id ? { ...nn, read: true, read_at: new Date().toISOString() } : nn))
  fetch(`/api/notifications/${n.id}/mark-read`, { method: 'POST' }).catch(() => {})
      const key = `prefill:notification:${n.id}`
      const preview = (() => {
        const header = `Follow-up on completed task notification: ${n.title}\nAgent: ${n.agent_name}`
        const body = (() => {
          const r: any = (n as any).task_result
          if (!r) return ''
          if (typeof r === 'string') return `\n\nResult:\n${r.slice(0, 2000)}`
          try {
            const json = JSON.stringify(r, null, 2)
            return `\n\nResult (JSON):\n${json.slice(0, 2000)}`
          } catch {
            return `\n\nResult:\n${String(r).slice(0, 2000)}`
          }
        })()
        return `${header}${body}\n\nPlease help me refine or act on this result.`
      })()
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, preview)
      }
      const params = new URLSearchParams({ agentId: n.agent_id, prefillKey: key })
      window.location.href = `/agents/chat?${params.toString()}`
    } catch (e) {
      console.warn('Failed to open chat from notification:', e)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-muted/60 rounded-xl border border-border">
                <ListChecksIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Agent Task Center</h1>
                <p className="text-muted-foreground mt-1">Manage and monitor your intelligent agents</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchTasks()
                  if (activeTab === 'inbox') fetchNotifications()
                }}
                className="gap-2 border-border hover:bg-muted"
              >
                <ArrowClockwiseIcon className="w-4 h-4" />
                Refresh
              </Button>
              <Badge variant="secondary" className="gap-2 bg-muted text-foreground/90">
                <ListChecksIcon className="w-4 h-4" />
                {filtered.length} tasks
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted border border-border">
              <TabsTrigger 
                value="tasks" 
                className="flex items-center gap-2 text-muted-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground"
              >
                <ListChecksIcon className="w-4 h-4" />
                Tasks
              </TabsTrigger>
              <TabsTrigger 
                value="inbox" 
                className="flex items-center gap-2 text-muted-foreground data-[state=active]:bg-muted/70 data-[state=active]:text-foreground"
              >
                <Inbox className="w-4 h-4" />
                Inbox
                {unreadNotificationsCount > 0 && (
                  <Badge className="ml-1 bg-foreground text-background text-xs px-1 min-w-5 h-5">
                    {unreadNotificationsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="mt-6">
              {/* Timezone Info */}
              {!timezoneLoading && userTimezone && userTimezone !== 'UTC' && (
                <div className="mb-4 p-3 bg-muted/30 border border-border rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>🌍</span>
                    <span>
                      Times are shown in your timezone: <strong className="text-foreground">{getTimezoneDisplayName()}</strong>
                    </span>
                  </div>
                </div>
              )}
              
              {/* Task Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
                <div className="flex gap-3 flex-wrap">
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-72 bg-background border-border placeholder:text-muted-foreground"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48 bg-background border-border">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => setFormOpen(true)}
                    className="bg-foreground text-background hover:bg-foreground/90"
                  >
                    Create Task
                  </Button>
                </div>
              </div>

              {/* Tasks Grid */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-muted-foreground mx-auto"></div>
                  <p className="text-muted-foreground mt-4">Loading tasks...</p>
                </div>
              ) : filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <ListChecksIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No tasks found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Create your first agent task to get started'
                    }
                  </p>
                </motion.div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((task, index) => (
                    <motion.div
                      key={task.task_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="h-full bg-background border-border hover:bg-muted/40 transition-colors duration-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg font-semibold mb-2 truncate text-foreground">
                                {task.title}
                              </CardTitle>
                              <Badge className={`gap-1 ${getStatusColor(task.status)}`}>
                                {getStatusIcon(task.status)}
                                {task.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Botón de editar - solo para tasks que no están completed */}
                              {task.status !== 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(task)}
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                                  title="Edit task"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </Button>
                              )}
                              {(task.status === 'failed' || task.status === 'cancelled') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRetryTask(task.task_id)}
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                                  title="Retry task"
                                >
                                  <ArrowClockwiseIcon className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTask(task.task_id)}
                                className="text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Delete task"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {task.description}
                            </p>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <img
                                src={getAgentAvatarUrl(task.agent_name, task.agent_avatar)}
                                alt={task.agent_name}
                                className="w-5 h-5 rounded-full border border-border object-cover"
                              />
                              <span className="truncate">{task.agent_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CalendarIcon className="w-4 h-4" />
                              <span>{formatDate(task.created_at)}</span>
                            </div>
                            {task.completed_at && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <CheckCircleIcon className="w-4 h-4" />
                                <span>Completed: {formatDate(task.completed_at)}</span>
                              </div>
                            )}
                            {task.scheduled_at && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <ClockIcon className="w-4 h-4" />
                                <span>Scheduled: {formatDate(task.scheduled_at, (task as any).timezone || 'UTC')}</span>
                              </div>
                            )}
                          </div>

                          {task.error_message && (
                            <div className="p-2 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                              {task.error_message}
                            </div>
                          )}

                          {task.status === 'completed' && task.result_data !== undefined && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-foreground">Result</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 py-1 text-xs border-border hover:bg-muted"
                                  onClick={() => setOpenResults(prev => ({ ...prev, [task.task_id]: !prev[task.task_id] }))}
                                >
                                  {openResults[task.task_id] ? 'Hide' : 'View'}
                                </Button>
                              </div>
                              {openResults[task.task_id] && (
                                <div className="max-h-60 overflow-auto">
                                  {renderResultPreview(task.result_data)}
                                </div>
                              )}
                              {typeof task.execution_time_ms === 'number' && (
                                <div className="mt-2 text-xs text-muted-foreground">Duration: {task.execution_time_ms} ms</div>
                              )}
                              <div className="mt-3 flex items-center gap-2">
                                <Button
                                  onClick={() => continueChatWithTask(task)}
                                  className="bg-foreground text-background hover:bg-foreground/90 gap-2"
                                  size="sm"
                                >
                                  <ChatCircleIcon className="w-4 h-4" />
                                  Continue in Chat
                                </Button>
                              </div>
                            </div>
                          )}

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {task.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs border-border text-muted-foreground">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="inbox" className="mt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Notification Inbox</h2>
                {unreadNotificationsCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllNotificationsAsRead}
                    className="border-border hover:bg-muted"
                  >
                    Mark All Read
                  </Button>
                )}
              </div>

              {notificationsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-muted-foreground mx-auto"></div>
                  <p className="text-muted-foreground mt-4">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No notifications</h3>
                  <p className="text-muted-foreground">You're all caught up!</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all duration-200 ${
                          notification.read 
                            ? 'bg-background border-border' 
                            : 'bg-muted/70 border-border shadow-lg'
                        }`}
                        onClick={() => openDetails(notification)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <img
                              src={getAgentAvatarUrl(notification.agent_name, notification.agent_avatar)}
                              alt={notification.agent_name}
                              className="w-10 h-10 rounded-full border border-border object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-foreground truncate">
                                  {notification.title}
                                </h4>
                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1 prose prose-invert prose-sm max-w-none line-clamp-3">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {notification.message}
                                </ReactMarkdown>
                              </div>
                              {notification.notification_type === 'task_scheduled' && (notification as any).metadata?.scheduled_for && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Scheduled: {formatDate((notification as any).metadata.scheduled_for, (notification as any).metadata.timezone || 'UTC')}
                                </div>
                              )}
                              {notification.notification_type === 'task_completed' && (notification as any).task_result && (
                                <div className="mt-2 text-xs text-foreground">
                                  {(() => {
                                    const tr = (notification as any).task_result
                                    const summary = typeof tr === 'object' && tr?.summary ? tr.summary : null
                                    return (
                                      <div>
                                        <span className="text-muted-foreground block mb-1">Summary:</span>
                                        <div className="prose prose-invert prose-sm max-w-none line-clamp-4">
                                          {summary ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                              {String(summary)}
                                            </ReactMarkdown>
                                          ) : (
                                            <div className="mt-1">{renderResultPreview(tr)}</div>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })()}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs bg-muted text-muted-foreground"
                                >
                                  {notification.agent_name}
                                </Badge>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-foreground rounded-full"></div>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="ml-auto h-7 text-xs"
                                  onClick={(e) => { e.stopPropagation(); openDetails(notification) }}
                                >
                                  View details
                                </Button>
                                {notification.notification_type === 'task_completed' && (
                                  <Button
                                    size="sm"
                                    className="ml-2 bg-foreground text-background hover:bg-foreground/90 gap-2"
                                    onClick={(e) => { e.stopPropagation(); continueChatFromNotification(notification) }}
                                  >
                                    <ChatCircleIcon className="w-4 h-4" />
                                    Open Chat
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Notification Details Modal */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 overflow-hidden">
            {selectedNotification && (
              <div className="flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-border bg-background/60 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <img
                      src={getAgentAvatarUrl(selectedNotification.agent_name, selectedNotification.agent_avatar)}
                      alt={selectedNotification.agent_name}
                      className="w-10 h-10 rounded-full border border-border object-cover"
                    />
                    <div className="min-w-0">
                      <DialogTitle className="truncate">{selectedNotification.title}</DialogTitle>
                      <DialogDescription asChild>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{formatTimeAgo(selectedNotification.created_at)}</span>
                          <span>•</span>
                          <span>{selectedNotification.agent_name}</span>
                          <span>•</span>
                          <Badge variant="outline" className="h-5 px-2 text-[10px]">
                            {selectedNotification.priority}
                          </Badge>
                        </div>
                      </DialogDescription>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 overflow-auto">
                  <div className="prose prose-invert max-w-none prose-sm md:prose-base">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedNotification.message}
                    </ReactMarkdown>
                  </div>

                  {(selectedNotification as any).task_result && (
                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground">Task Result</h4>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={async () => {
                              const tr: any = (selectedNotification as any).task_result
                              const summary = typeof tr === 'object' && tr?.summary ? String(tr.summary) : null
                              const text = showRawResult || !summary ?
                                (typeof tr === 'string' ? tr : (() => { try { return JSON.stringify(tr, null, 2) } catch { return String(tr) } })())
                                : summary
                              try {
                                await navigator.clipboard.writeText(text)
                              } catch {}
                            }}
                          >
                            Copy
                          </Button>
                          {(() => {
                            const tr: any = (selectedNotification as any).task_result
                            const hasSummary = typeof tr === 'object' && !!tr?.summary
                            return hasSummary ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setShowRawResult(prev => !prev)}
                              >
                                {showRawResult ? 'Show summary' : 'Show raw'}
                              </Button>
                            ) : null
                          })()}
                        </div>
                      </div>
                      {(() => {
                        const tr: any = (selectedNotification as any).task_result
                        const summary = typeof tr === 'object' && tr?.summary ? tr.summary : null
                        if (summary && !showRawResult) {
                          return (
                            <div className="prose prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {String(summary)}
                              </ReactMarkdown>
                            </div>
                          )
                        }
                        return (
                          <div className="max-h-[50vh] overflow-auto rounded border border-border bg-background/50 p-3">
                            {renderResultPreview(tr)}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border bg-background/60 backdrop-blur-sm sticky bottom-0">
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                    <Button variant="outline" onClick={() => setDetailsOpen(false)} className="sm:min-w-[110px]">Close</Button>
                    {selectedNotification.notification_type === 'task_completed' && (
                      <Button className="bg-foreground text-background hover:bg-foreground/90 gap-2 sm:min-w-[140px]" onClick={() => { continueChatFromNotification(selectedNotification); setDetailsOpen(false) }}>
                        <ChatCircleIcon className="w-4 h-4" /> Open Chat
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Task Modal */}
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-background border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-semibold text-foreground mb-4">Create Agent Task</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Agent</label>
                  <Select value={formAgentId} onValueChange={setFormAgentId}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Title</label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Task title"
                    className="bg-background border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Description</label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Detailed task description"
                    rows={3}
                    className="bg-background border-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Task Type</label>
                    <Select value={formTaskType} onValueChange={(value: any) => setFormTaskType(value)}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Priority (1-10)</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={formPriority}
                      onChange={(e) => setFormPriority(parseInt(e.target.value) || 5)}
                      className="bg-background border-border"
                    />
                  </div>
                </div>

                {formTaskType === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Scheduled At</label>
                      <Input
                        type="datetime-local"
                        value={formScheduledAt}
                        onChange={(e) => setFormScheduledAt(e.target.value)}
                        className="bg-background border-border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Timezone {!timezoneLoading && (
                          <span className="text-xs text-green-400 ml-1">
                            (Auto: {getTimezoneDisplayName().split('(')[0].trim()})
                          </span>
                        )}
                      </label>
                      <Select value={formTimezone} onValueChange={setFormTimezone}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          {!timezoneLoading && userTimezone !== 'UTC' && (
                            <SelectItem value={userTimezone}>
                              🌍 {getTimezoneDisplayName()} (Auto)
                            </SelectItem>
                          )}
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          <SelectItem value="Europe/London">London</SelectItem>
                          <SelectItem value="Europe/Madrid">Madrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {formTaskType === 'recurring' && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Cron Expression</label>
                    <Input
                      value={formCron}
                      onChange={(e) => setFormCron(e.target.value)}
                      placeholder="0 9 * * *"
                      className="bg-background border-border"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Tags (comma-separated)</label>
                  <Input
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="automation, web-scraping, daily"
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                  className="border-border hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitCreate}
                  disabled={creating || !formAgentId || !formTitle || !formDescription}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Task Modal */}
        {editOpen && editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-background border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-semibold text-foreground mb-4">Edit Task: {editingTask.title}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Title</label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Task title"
                    className="bg-background border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Description</label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Detailed task description"
                    rows={3}
                    className="bg-background border-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Task Type</label>
                    <Select value={formTaskType} onValueChange={(value: 'manual' | 'scheduled' | 'recurring') => setFormTaskType(value)}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Priority (1-10)</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={formPriority}
                      onChange={(e) => setFormPriority(parseInt(e.target.value) || 5)}
                      className="bg-background border-border"
                    />
                  </div>
                </div>

                {formTaskType === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Scheduled At</label>
                      <Input
                        type="datetime-local"
                        value={formScheduledAt}
                        onChange={(e) => setFormScheduledAt(e.target.value)}
                        className="bg-background border-border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Timezone {!timezoneLoading && (
                          <span className="text-xs text-green-400 ml-1">
                            (Auto: {getTimezoneDisplayName().split('(')[0].trim()})
                          </span>
                        )}
                      </label>
                      <Select value={formTimezone} onValueChange={setFormTimezone}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          {!timezoneLoading && userTimezone !== 'UTC' && (
                            <SelectItem value={userTimezone}>
                              🌍 {getTimezoneDisplayName()} (Auto)
                            </SelectItem>
                          )}
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          <SelectItem value="Europe/London">London</SelectItem>
                          <SelectItem value="Europe/Madrid">Madrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {formTaskType === 'recurring' && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Cron Expression</label>
                    <Input
                      value={formCron}
                      onChange={(e) => setFormCron(e.target.value)}
                      placeholder="0 9 * * 1-5 (weekdays at 9 AM)"
                      className="bg-background border-border"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Tags (comma-separated)</label>
                  <Input
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="urgent, backend, api"
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditOpen(false)
                    setEditingTask(null)
                  }}
                  className="border-border text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveEditedTask}
                  disabled={creating || !formTitle || !formDescription}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {creating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

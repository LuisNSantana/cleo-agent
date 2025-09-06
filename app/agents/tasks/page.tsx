'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SkyvernNotifications from '@/components/skyvern/skyvern-notifications'
import {
  ListChecksIcon,
  CalendarIcon,
  ClockIcon,
  RobotIcon,
  CheckCircleIcon,
  CircleIcon,
  PlayIcon,
  PauseIcon,
  ArrowSquareOutIcon,
  VideoIcon,
  MonitorIcon,
  BellIcon,
  ArrowClockwiseIcon,
  TrashIcon
} from '@phosphor-icons/react'

interface SkyvernTask {
  id: string
  task_id: string
  title: string
  url: string
  instructions: string
  task_type: string
  status: string
  max_steps: number
  created_at: string
  updated_at: string
  completed_at?: string
  live_url?: string
  recording_url?: string
  dashboard_url?: string
  steps_count: number
  error_message?: string
  notification_sent: boolean
}

interface SkyvernNotification {
  id: string
  task_id: string
  notification_type: string
  message: string
  sent_at: string
}

export default function AgentsTasksPage() {
  const [skyvernTasks, setSkyvernTasks] = useState<SkyvernTask[]>([])
  const [notifications, setNotifications] = useState<SkyvernNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch Skyvern tasks
  const fetchSkyvernTasks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      params.append('includeCompleted', 'true')
      
      const response = await fetch(`/api/skyvern/tasks?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setSkyvernTasks(data.tasks || [])
        setNotifications(data.notifications || [])
      } else {
        console.error('Failed to fetch Skyvern tasks:', data.error)
      }
    } catch (error) {
      console.error('Error fetching Skyvern tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSkyvernTasks()
  }, [statusFilter])

  // Auto-refresh every 30 seconds for active tasks
  useEffect(() => {
    const interval = setInterval(() => {
      const hasActiveTasks = skyvernTasks.some(task => 
        !['completed', 'failed', 'terminated'].includes(task.status)
      )
      if (hasActiveTasks) {
        fetchSkyvernTasks()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [skyvernTasks])

  // Filter tasks based on search
  const filteredTasks = skyvernTasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.instructions.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.url.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Map delegated agent (scalable: fallback to Wex for Skyvern tasks)
  const getAgentInfo = (task: SkyvernTask) => {
    // Future: if API returns agent_id/agent_name/avatar, prefer that
    const agentId = (task as any).agent_id || 'wex-automation'
    const agentName = agentId.includes('wex') ? 'Wex' : 'Agent'
    const avatar = agentId.includes('wex') ? '/img/agents/wex4.png' : '/img/agents/cleo4.png'
    return { id: agentId, name: agentName, avatar }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/40'
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/40'
      case 'terminated': return 'bg-slate-500/20 text-slate-300 border-slate-500/40'
      case 'running': return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      case 'queued': return 'bg-orange-500/20 text-orange-300 border-orange-500/40'
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/40'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="w-4 h-4" />
      case 'failed': return <CircleIcon className="w-4 h-4" />
      case 'terminated': return <PauseIcon className="w-4 h-4" />
      case 'running': return <PlayIcon className="w-4 h-4" />
      case 'queued': return <ClockIcon className="w-4 h-4" />
      default: return <CircleIcon className="w-4 h-4" />
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const confirmed = window.confirm('Delete this task? This cannot be undone.');
      if (!confirmed) return;
      const res = await fetch(`/api/skyvern/tasks?task_id=${encodeURIComponent(taskId)}&deleteNotifications=true`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Failed to delete task:', data.error);
        return;
      }
      // Optimistic update
      setSkyvernTasks(prev => prev.filter(t => t.task_id !== taskId));
    } catch (e) {
      console.error('Error deleting task:', e);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="w-full max-w-none space-y-0 min-h-screen bg-slate-900">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header Premium */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-6 sm:p-8 mb-6 sm:mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 via-red-600/10 to-orange-600/10" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-xl">
                  <ListChecksIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Skyvern Task Center
                  </h1>
                  <p className="text-lg text-slate-400 mt-2">
                    Monitor and manage your web automation tasks
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  onClick={fetchSkyvernTasks} 
                  disabled={loading}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg"
                >
                  <ArrowClockwiseIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <div className="text-2xl font-bold text-green-400">{skyvernTasks.filter(t => t.status === 'completed').length}</div>
                <div className="text-sm text-slate-400">Completed</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <div className="text-2xl font-bold text-blue-400">{skyvernTasks.filter(t => t.status === 'running').length}</div>
                <div className="text-sm text-slate-400">Running</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <div className="text-2xl font-bold text-orange-400">{skyvernTasks.filter(t => t.status === 'queued').length}</div>
                <div className="text-sm text-slate-400">Queued</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <div className="text-2xl font-bold text-purple-400">{skyvernTasks.length}</div>
                <div className="text-sm text-slate-400">Total Tasks</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="mb-6 bg-slate-800/50 border-orange-500/20 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-orange-300">
                  <BellIcon className="w-5 h-5" />
                  Recent Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {notifications.slice(0, 3).map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-orange-500/20">
                      <span className="text-sm text-slate-300">{notification.message}</span>
                      <span className="text-xs text-orange-400">{formatDate(notification.sent_at)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sm:w-80 bg-slate-800/50 border-slate-600/50 text-slate-200 placeholder:text-slate-400 focus:border-orange-500/50"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48 bg-slate-800/50 border-slate-600/50 text-slate-200">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all" className="text-slate-200">All Tasks</SelectItem>
              <SelectItem value="queued" className="text-slate-200">Queued</SelectItem>
              <SelectItem value="running" className="text-slate-200">Running</SelectItem>
              <SelectItem value="completed" className="text-slate-200">Completed</SelectItem>
              <SelectItem value="failed" className="text-slate-200">Failed</SelectItem>
              <SelectItem value="terminated" className="text-slate-200">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

      {/* Tasks Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowClockwiseIcon className="w-8 h-8 animate-spin text-orange-400" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="text-center py-12 bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent>
            <ListChecksIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No tasks found</h3>
            <p className="text-slate-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters or search term'
                : 'Start creating automation tasks with Wex to see them here'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="h-full bg-slate-800/50 border-slate-700/50 hover:border-orange-500/50 transition-colors backdrop-blur-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-100 mb-2 line-clamp-2">
                        {task.title}
                      </CardTitle>
                      <Badge className={`${getStatusColor(task.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(task.status)}
                        {task.status}
                      </Badge>
                    </div>
                    {/* Delegated Agent + Delete */}
                    <div className="flex items-start gap-2 shrink-0">
                      {(() => { const agent = getAgentInfo(task); return (
                        <div className="flex items-center gap-2 bg-slate-700/40 px-2 py-1 rounded-full border border-slate-600/40">
                          <img src={agent.avatar} alt={agent.name} className="w-6 h-6 rounded-full border border-slate-600/60" />
                          <span className="text-xs text-slate-300 hidden sm:inline">{agent.name}</span>
                        </div>
                      )})()}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-300 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDeleteTask(task.task_id)}
                        title="Delete task"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-300 mb-1">Target URL:</p>
                      <p className="text-sm text-slate-400 truncate">{task.url}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-300 mb-1">Instructions:</p>
                      <p className="text-sm text-slate-400 line-clamp-2">{task.instructions}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {formatDate(task.created_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <PlayIcon className="w-4 h-4" />
                        {task.steps_count} steps
                      </div>
                    </div>

                    {task.error_message && (
                      <div className="p-2 bg-red-900/30 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-300">{task.error_message}</p>
                      </div>
                    )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
                      {task.live_url && (
                        <Button
                          size="sm"
                          variant="outline"
          asChild
          className="flex-1 min-w-[140px] bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-orange-500/20 hover:border-orange-500/50 hover:text-orange-300"
                        >
                          <a href={task.live_url} target="_blank" rel="noopener noreferrer">
                            <MonitorIcon className="w-4 h-4 mr-1" />
                            Live View
                            <ArrowSquareOutIcon className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                      
                      {task.recording_url && (
                        <Button
                          size="sm"
                          variant="outline"
          asChild
          className="flex-1 min-w-[140px] bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-orange-500/20 hover:border-orange-500/50 hover:text-orange-300"
                        >
                          <a href={task.recording_url} target="_blank" rel="noopener noreferrer">
                            <VideoIcon className="w-4 h-4 mr-1" />
                            Recording
                            <ArrowSquareOutIcon className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}

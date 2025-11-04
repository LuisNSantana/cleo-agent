'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  CalendarIcon,
  ClockIcon,
  RobotIcon,
  CheckCircleIcon,
  CircleIcon,
  PlayIcon,
  XCircleIcon,
  PlusIcon,
  TrashIcon,
  GearIcon,
  UserIcon,
  FlaskIcon
} from '@phosphor-icons/react'

interface AgentTask {
  task_id: string
  title: string
  description: string
  agent_id: string
  agent_name: string
  task_type: string
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'paused'
  task_config: Record<string, any>
  context_data: Record<string, any>
  schedule_config: {
    scheduled_for?: string
    recurrence?: {
      type: 'once' | 'interval' | 'daily' | 'weekly' | 'monthly'
      interval_minutes?: number
      time?: string
      days_of_week?: number[]
    }
    max_retries?: number
    timeout_minutes?: number
  }
  created_at: string
  updated_at: string
  scheduled_for?: string
  result_data?: any
  retry_count?: number
  execution_time_ms?: number
  last_run_at?: string
  next_run_at?: string
}

const agentAvatars = {
  'apu-support': { icon: FlaskIcon, color: 'bg-blue-500', name: 'Apu Support' },
  'wex-intelligence': { icon: RobotIcon, color: 'bg-green-500', name: 'Wex Intelligence' },
  'emma-ecommerce': { icon: RobotIcon, color: 'bg-purple-500', name: 'Emma E-commerce' },
  'cleo-supervisor': { icon: UserIcon, color: 'bg-orange-500', name: 'Cleo Supervisor' }
}

export default function ScheduledTasksPage() {
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [filteredTasks, setFilteredTasks] = useState<AgentTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [searchFilter, setSearchFilter] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    agent_id: '',
    task_type: '',
    task_config: '{}',
    schedule_type: 'once',
    scheduled_for: '',
    interval_minutes: 60,
    time: '09:00',
    max_retries: 3,
    timeout_minutes: 30
  })

  useEffect(() => {
    fetchTasks()
  }, [])

  useEffect(() => {
    filterTasks()
  }, [tasks, statusFilter, agentFilter, searchFilter])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/agent-tasks')
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const filterTasks = () => {
    let filtered = tasks

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter)
    }

    if (agentFilter !== 'all') {
      filtered = filtered.filter(task => task.agent_id === agentFilter)
    }

    if (searchFilter) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.description.toLowerCase().includes(searchFilter.toLowerCase())
      )
    }

    setFilteredTasks(filtered)
  }

  const createTask = async () => {
    try {
      let taskConfig
      try {
        taskConfig = JSON.parse(newTask.task_config || '{}')
      } catch {
        alert('Invalid JSON in task configuration')
        return
      }

      const scheduleConfig: any = {
        max_retries: newTask.max_retries,
        timeout_minutes: newTask.timeout_minutes
      }

      if (newTask.schedule_type === 'once') {
        scheduleConfig.scheduled_for = newTask.scheduled_for
      } else {
        scheduleConfig.recurrence = {
          type: newTask.schedule_type,
          ...(newTask.schedule_type === 'interval' && { interval_minutes: newTask.interval_minutes }),
          ...(newTask.schedule_type === 'daily' && { time: newTask.time })
        }
        scheduleConfig.scheduled_for = new Date().toISOString()
      }

      const response = await fetch('/api/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          agent_id: newTask.agent_id,
          task_type: newTask.task_type,
          task_config: taskConfig,
          schedule_config: scheduleConfig
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      await fetchTasks()
      setIsCreateDialogOpen(false)
      
      // Reset form
      setNewTask({
        title: '',
        description: '',
        agent_id: '',
        task_type: '',
        task_config: '{}',
        schedule_type: 'once',
        scheduled_for: '',
        interval_minutes: 60,
        time: '09:00',
        max_retries: 3,
        timeout_minutes: 30
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create task')
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const response = await fetch('/api/agent-tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId })
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      await fetchTasks()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: 'secondary',
      running: 'default',
      completed: 'default',
      failed: 'destructive',
      paused: 'outline'
    } as const

    const icons = {
      scheduled: CircleIcon,
      running: PlayIcon,
      completed: CheckCircleIcon,
      failed: XCircleIcon,
      paused: CircleIcon
    }

    const Icon = icons[status as keyof typeof icons]

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className="flex items-center gap-1">
        <Icon size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getAgentAvatar = (agentId: string) => {
    const agent = agentAvatars[agentId as keyof typeof agentAvatars] || agentAvatars['cleo-supervisor']
    const Icon = agent.icon
    
    return (
      <div className={`w-8 h-8 rounded-full ${agent.color} flex items-center justify-center`}>
        <Icon size={16} className="text-white" />
      </div>
    )
  }

  const formatDateTime = (dateString?: string, timezone?: string) => {
    if (!dateString) return 'Not set'
    const d = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone: timezone || 'UTC'
    }).format(d)
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading scheduled tasks...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Agent Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage automated tasks for research, automation, and e-commerce agents
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusIcon size={16} />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Agent Task</DialogTitle>
              <DialogDescription>
                Schedule a task to be executed by one of your agents
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Research Tesla stock trends"
                  />
                </div>
                <div>
                  <Label htmlFor="agent_id">Agent</Label>
                  <Select value={newTask.agent_id} onValueChange={(value) => setNewTask({ ...newTask, agent_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apu-support">Apu Support</SelectItem>
                      <SelectItem value="wex-intelligence">Wex Intelligence</SelectItem>
                      <SelectItem value="emma-ecommerce">Emma E-commerce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Detailed description of what the agent should do..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task_type">Task Type</Label>
                  <Input
                    id="task_type"
                    value={newTask.task_type}
                    onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                    placeholder="research, automation, analysis"
                  />
                </div>
                <div>
                  <Label htmlFor="schedule_type">Schedule Type</Label>
                  <Select value={newTask.schedule_type} onValueChange={(value) => setNewTask({ ...newTask, schedule_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Run Once</SelectItem>
                      <SelectItem value="interval">Interval</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newTask.schedule_type === 'once' && (
                <div>
                  <Label htmlFor="scheduled_for">Scheduled For</Label>
                  <Input
                    id="scheduled_for"
                    type="datetime-local"
                    value={newTask.scheduled_for}
                    onChange={(e) => setNewTask({ ...newTask, scheduled_for: e.target.value })}
                  />
                </div>
              )}

              {newTask.schedule_type === 'interval' && (
                <div>
                  <Label htmlFor="interval_minutes">Interval (minutes)</Label>
                  <Input
                    id="interval_minutes"
                    type="number"
                    value={newTask.interval_minutes}
                    onChange={(e) => setNewTask({ ...newTask, interval_minutes: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              )}

              {newTask.schedule_type === 'daily' && (
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="task_config">Task Configuration (JSON)</Label>
                <Textarea
                  id="task_config"
                  value={newTask.task_config}
                  onChange={(e) => setNewTask({ ...newTask, task_config: e.target.value })}
                  placeholder='{"query": "latest AI research", "sources": ["news", "scholar"]}'
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_retries">Max Retries</Label>
                  <Input
                    id="max_retries"
                    type="number"
                    value={newTask.max_retries}
                    onChange={(e) => setNewTask({ ...newTask, max_retries: parseInt(e.target.value) })}
                    min="0"
                    max="10"
                  />
                </div>
                <div>
                  <Label htmlFor="timeout_minutes">Timeout (minutes)</Label>
                  <Input
                    id="timeout_minutes"
                    type="number"
                    value={newTask.timeout_minutes}
                    onChange={(e) => setNewTask({ ...newTask, timeout_minutes: parseInt(e.target.value) })}
                    min="1"
                    max="120"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createTask} disabled={!newTask.title || !newTask.agent_id}>
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search tasks..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>

        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            <SelectItem value="apu-support">Apu Support</SelectItem>
            <SelectItem value="wex-intelligence">Wex Intelligence</SelectItem>
            <SelectItem value="emma-ecommerce">Emma E-commerce</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircleIcon size={20} />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <RobotIcon size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-4">
                {tasks.length === 0 
                  ? "Create your first scheduled agent task to get started"
                  : "No tasks match your current filters"
                }
              </p>
              {tasks.length === 0 && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  Create Your First Task
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <motion.div
              key={task.task_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getAgentAvatar(task.agent_id)}
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{task.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">{task.agent_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusBadge(task.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTask(task.task_id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                      >
                        <TrashIcon size={12} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={12} className="text-muted-foreground" />
                      <span>Created: {formatDateTime(task.created_at, (task as any).timezone || 'UTC')}</span>
                    </div>
                    
                    {(task.scheduled_for || (task as any).scheduled_at) && (
                      <div className="flex items-center gap-2">
                        <ClockIcon size={12} className="text-muted-foreground" />
                        <span>
                          Scheduled: {formatDateTime((task.scheduled_for || (task as any).scheduled_at) as string, (task as any).timezone || 'UTC')}
                        </span>
                      </div>
                    )}
                    
                    {task.last_run_at && (
                      <div className="flex items-center gap-2">
                        <PlayIcon size={12} className="text-muted-foreground" />
                        <span>Last run: {formatDateTime(task.last_run_at, (task as any).timezone || 'UTC')}</span>
                      </div>
                    )}
                    
                    {task.execution_time_ms && (
                      <div className="flex items-center gap-2">
                        <ClockIcon size={12} className="text-muted-foreground" />
                        <span>Duration: {formatDuration(task.execution_time_ms)}</span>
                      </div>
                    )}
                  </div>

                  {task.schedule_config?.recurrence && (
                    <div className="pt-2 border-t">
                      <Badge variant="outline" className="text-xs">
                        {task.schedule_config.recurrence.type === 'interval' 
                          ? `Every ${task.schedule_config.recurrence.interval_minutes}m`
                          : task.schedule_config.recurrence.type
                        }
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

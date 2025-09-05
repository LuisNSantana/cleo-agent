'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  ArrowClockwiseIcon
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'failed': return 'bg-red-100 text-red-800 border-red-200'
      case 'terminated': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'queued': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <RobotIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Skyvern Automation Tasks</h1>
            <p className="text-slate-600">Monitor and manage your web automation tasks</p>
          </div>
        </div>
        <Button 
          onClick={fetchSkyvernTasks} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <ArrowClockwiseIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <BellIcon className="w-5 h-5" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                  <span className="text-sm text-orange-800">{notification.message}</span>
                  <span className="text-xs text-orange-600">{formatDate(notification.sent_at)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="sm:w-80"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowClockwiseIcon className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <ListChecksIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">No tasks found</h3>
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
              <Card className="h-full border border-slate-200 hover:border-slate-300 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                        {task.title}
                      </CardTitle>
                      <Badge className={`${getStatusColor(task.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(task.status)}
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Target URL:</p>
                      <p className="text-sm text-slate-600 truncate">{task.url}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Instructions:</p>
                      <p className="text-sm text-slate-600 line-clamp-2">{task.instructions}</p>
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
                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{task.error_message}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {task.live_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="flex-1"
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
                          className="flex-1"
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
  )
}

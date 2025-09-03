'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClientAgentStore } from '@/lib/agents/client-store'
import {
  ListChecksIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  RobotIcon,
  CheckCircleIcon,
  CircleIcon,
  PlayIcon,
  PauseIcon
} from '@phosphor-icons/react'

interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'paused'
  priority: 'low' | 'medium' | 'high'
  assignedTo: string // agent ID
  createdAt: Date
  dueDate?: Date
  estimatedHours?: number
}

export default function AgentsTasksPage() {
  const { agents } = useClientAgentStore()
  
  // Mock tasks data
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
  title: 'Social media sentiment analysis',
  description: 'Process and analyze sentiment from social media comments for client XYZ',
      status: 'in-progress',
      priority: 'high',
      assignedTo: 'agent-1',
      createdAt: new Date('2025-09-01'),
      dueDate: new Date('2025-09-05'),
      estimatedHours: 8
    },
    {
      id: '2',
  title: 'Blog content generation',
  description: 'Create 5 articles about AI for the corporate blog',
      status: 'pending',
      priority: 'medium',
      assignedTo: 'agent-2',
      createdAt: new Date('2025-09-02'),
      dueDate: new Date('2025-09-10'),
      estimatedHours: 12
    },
    {
      id: '3',
  title: 'Python code optimization',
  description: 'Review and optimize the data processing module code',
      status: 'completed',
      priority: 'low',
      assignedTo: 'agent-1',
      createdAt: new Date('2025-08-28'),
      estimatedHours: 6
    }
  ])

  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'paused'>('all')
  const [showCreateTask, setShowCreateTask] = useState(false)

  const filteredTasks = tasks.filter(task => filter === 'all' || task.status === filter)

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'in-progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'paused': return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'bg-green-500/20 text-green-300'
      case 'medium': return 'bg-yellow-500/20 text-yellow-300'
      case 'high': return 'bg-red-500/20 text-red-300'
    }
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending': return <CircleIcon className="w-4 h-4" />
      case 'in-progress': return <PlayIcon className="w-4 h-4" />
      case 'completed': return <CheckCircleIcon className="w-4 h-4" />
      case 'paused': return <PauseIcon className="w-4 h-4" />
    }
  }

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId)
  return agent?.name || 'Agent not found'
  }

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    paused: tasks.filter(t => t.status === 'paused').length
  }

  return (
    <div className="py-6 w-full max-w-none">
      <div className="space-y-8 w-full max-w-none">
        {/* Stats Cards */}
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{taskStats.total}</div>
              <div className="text-sm text-slate-400">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-300">{taskStats.pending}</div>
              <div className="text-sm text-yellow-400">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-300">{taskStats.inProgress}</div>
              <div className="text-sm text-blue-400">In progress</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-300">{taskStats.completed}</div>
              <div className="text-sm text-green-400">Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-500/10 border-gray-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">{taskStats.paused}</div>
              <div className="text-sm text-gray-400">Paused</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800/50 border-slate-700/50 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-violet-600 hover:bg-violet-700' : ''}
              >
                All ({taskStats.total})
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
                className={filter === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
              >
                Pending ({taskStats.pending})
              </Button>
              <Button
                variant={filter === 'in-progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('in-progress')}
                className={filter === 'in-progress' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                In progress ({taskStats.inProgress})
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('completed')}
                className={filter === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Completed ({taskStats.completed})
              </Button>
              <Button
                variant={filter === 'paused' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('paused')}
                className={filter === 'paused' ? 'bg-gray-600 hover:bg-gray-700' : ''}
              >
                Paused ({taskStats.paused})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
  <div className="space-y-4 w-full max-w-none">
          {filteredTasks.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-12 text-center">
                <ListChecksIcon className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">
                  {filter === 'all' ? 'No tasks' : `No tasks ${filter === 'in-progress' ? 'in progress' : filter}`}
                </h3>
                <p className="text-slate-500 mb-6">
                  {filter === 'all' ? 'Create your first task to get started' : 'Change the filter to see other tasks'}
                </p>
                <Button
                  onClick={() => setShowCreateTask(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  New Task
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}>
                            {getStatusIcon(task.status)}
                            {task.status === 'in-progress' ? 'In progress' : 
                             task.status === 'pending' ? 'Pending' :
                             task.status === 'completed' ? 'Completed' : 'Paused'}
                          </div>
                          <Badge className={getPriorityColor(task.priority)}>{task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'} Priority</Badge>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-white mb-2">{task.title}</h3>
                        <p className="text-slate-400 mb-4">{task.description}</p>
                        
                        <div className="flex items-center gap-6 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <RobotIcon className="w-4 h-4" />
                            {getAgentName(task.assignedTo)}
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            {task.createdAt.toLocaleDateString()}
                          </div>
                          {task.dueDate && (
                            <div className="flex items-center gap-2">
                              <ClockIcon className="w-4 h-4" />
                              Due: {task.dueDate.toLocaleDateString()}
                            </div>
                          )}
                          {task.estimatedHours && (
                            <div className="flex items-center gap-2">
                              <ClockIcon className="w-4 h-4" />
                              {task.estimatedHours}h estimated
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {task.status === 'pending' && (
                          <Button size="sm" variant="outline">
                            <PlayIcon className="w-4 h-4" />
                          </Button>
                        )}
                        {task.status === 'in-progress' && (
                          <Button size="sm" variant="outline">
                            <PauseIcon className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Create Task Modal - Placeholder */}
      {showCreateTask && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">New Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Task title" className="bg-slate-700 border-slate-600" />
              <Input placeholder="Description" className="bg-slate-700 border-slate-600" />
              <Select>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Assign to agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowCreateTask(false)}>
                  Cancel
                </Button>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                  Create Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
  </div>
  )
}

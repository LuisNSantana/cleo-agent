'use client'

import React, { useState, useEffect } from 'react'
import { Bell, BellRing, Check, X, User, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
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

interface TaskNotification {
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

interface NotificationStats {
  total: number
  unread: number
  by_type: Record<string, number>
  by_priority: Record<string, number>
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<TaskNotification[]>([])
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    by_type: {},
    by_priority: {}
  })
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch notifications and stats
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const [notificationsRes, statsRes] = await Promise.all([
        fetch('/api/notifications?limit=10&unread_only=false'),
        fetch('/api/notifications?stats=true')
      ])

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json()
        if (notificationsData.success) {
          setNotifications(notificationsData.notifications || [])
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (statsData.success) {
          setStats(statsData.stats || {
            total: 0,
            unread: 0,
            by_type: {},
            by_priority: {}
          })
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read: true, read_at: new Date().toISOString() }
              : notif
          )
        )
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ 
            ...notif, 
            read: true, 
            read_at: new Date().toISOString() 
          }))
        )
        setStats(prev => ({ ...prev, unread: 0 }))
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'task_failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'task_scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'task_reminder':
        return <Bell className="h-4 w-4 text-yellow-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-blue-500'
      case 'low':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Fetch on mount and when dropdown opens
  useEffect(() => {
    fetchNotifications()
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Event-driven refresh: listen to delegation and execution events
  useEffect(() => {
    const onDelegation = () => fetchNotifications()
    const onExecution = () => fetchNotifications()
    if (typeof window !== 'undefined') {
      window.addEventListener('delegation-progress', onDelegation as any)
      window.addEventListener('agent-delegation', onDelegation as any)
      window.addEventListener('agent-execution', onExecution as any)
    }
    // Reduced fallback polling every 90 seconds to keep badge fresh even if events missed
    const interval = setInterval(fetchNotifications, 90_000)
    return () => {
      clearInterval(interval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('delegation-progress', onDelegation as any)
        window.removeEventListener('agent-delegation', onDelegation as any)
        window.removeEventListener('agent-execution', onExecution as any)
      }
    }
  }, [])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9 rounded-full bg-background hover:bg-muted text-muted-foreground">
          {stats.unread > 0 ? (
            <BellRing className="h-5 w-5 text-orange-500" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {stats.unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {stats.unread > 99 ? '99+' : stats.unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-96" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {stats.unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-6"
            >
              Marcar todas como leídas
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No hay notificaciones
          </div>
        ) : (
          <ScrollArea className="h-96">
            <DropdownMenuGroup>
              {notifications.map((notification) => (
                <DropdownMenuGroup key={notification.id}>
                  <div
                    className={`p-3 hover:bg-muted/50 transition-colors cursor-pointer border-l-2 ${
                      notification.read 
                        ? 'border-transparent opacity-70' 
                        : `border-l-2 ${getPriorityColor(notification.priority)}`
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Agent Avatar */}
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage 
                          src={notification.agent_avatar} 
                          alt={notification.agent_name} 
                        />
                        <AvatarFallback>
                          {notification.agent_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getNotificationIcon(notification.notification_type)}
                            <span className="text-sm font-medium">
                              {notification.agent_name}
                            </span>
                          </div>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>

                        {/* Title and Message */}
                        <h4 className="text-sm font-medium mt-1 truncate">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>

                        {/* Timestamp */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          
                          {/* Priority Badge */}
                          <Badge 
                            variant="outline" 
                            className={`text-xs h-5 ${getPriorityColor(notification.priority)} text-white border-none`}
                          >
                            {notification.priority}
                          </Badge>
                        </div>

                        {/* Action Buttons */}
                        {notification.action_buttons && notification.action_buttons.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {notification.action_buttons.map((button, index) => (
                              <Button
                                key={index}
                                variant={button.variant || 'outline'}
                                size="sm"
                                className="text-xs h-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Handle button action
                                  console.log('Action:', button.action)
                                }}
                              >
                                {button.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                </DropdownMenuGroup>
              ))}
            </DropdownMenuGroup>
          </ScrollArea>
        )}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="text-center justify-center"
          onClick={() => window.open('/agents/tasks?tab=inbox', '_blank')}
        >
          Ver todas las notificaciones
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationBell

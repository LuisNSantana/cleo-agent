'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BellIcon,
  CheckIcon,
  XIcon,
  ArrowSquareOutIcon,
  VideoIcon,
  MonitorIcon
} from '@phosphor-icons/react'

interface SkyvernNotification {
  id: string
  task_id: string
  notification_type: string
  message: string
  sent_at: string
  task_title: string | null
  task_url: string | null
  live_url: string | null
  recording_url: string | null
  dashboard_url: string | null
}

interface SkyvernNotificationsProps {
  autoRefresh?: boolean
  limit?: number
  showHeader?: boolean
  onNotificationClick?: (notification: SkyvernNotification) => void
}

export default function SkyvernNotifications({
  autoRefresh = true,
  limit = 10,
  showHeader = true,
  onNotificationClick
}: SkyvernNotificationsProps) {
  const [notifications, setNotifications] = useState<SkyvernNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/skyvern/notifications?limit=${limit}`)
      const data = await response.json()
      
      if (data.success) {
        setNotifications(data.notifications || [])
        // For demo purposes, consider all notifications as unread
        // In production, you'd track read_at timestamp
        setUnreadCount(data.notifications?.length || 0)
      } else {
        console.error('Failed to fetch notifications:', data.error)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh notifications
  useEffect(() => {
    fetchNotifications()
    
    if (autoRefresh) {
      const interval = setInterval(fetchNotifications, 10000) // Every 10 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh, limit])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckIcon className="w-4 h-4 text-green-500" />
      case 'task_failed':
        return <XIcon className="w-4 h-4 text-red-500" />
      default:
        return <BellIcon className="w-4 h-4 text-blue-500" />
    }
  }

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'task_completed':
        return 'bg-green-500/20 text-green-700 border-green-200'
      case 'task_failed':
        return 'bg-red-500/20 text-red-700 border-red-200'
      default:
        return 'bg-blue-500/20 text-blue-700 border-blue-200'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BellIcon className="w-5 h-5" />
              Skyvern Notifications
            </h3>
            <div className="animate-pulse bg-gray-200 h-4 w-8 rounded"></div>
          </div>
        )}
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="bg-gray-200 h-4 w-3/4 rounded"></div>
                  <div className="bg-gray-200 h-3 w-1/2 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BellIcon className="w-5 h-5" />
            Skyvern Notifications
          </h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-red-500 text-white">
              {unreadCount}
            </Badge>
          )}
        </div>
      )}

      <AnimatePresence>
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-gray-500"
          >
            <BellIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No notifications yet</p>
            <p className="text-sm">Skyvern task updates will appear here</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    notification.notification_type === 'task_completed' ? 'border-green-200' :
                    notification.notification_type === 'task_failed' ? 'border-red-200' :
                    'border-blue-200'
                  }`}
                  onClick={() => onNotificationClick?.(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className={getNotificationBadgeColor(notification.notification_type)}
                          >
                            {notification.notification_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.sent_at)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">
                          {notification.message}
                        </p>
                        
                        {notification.task_title && (
                          <p className="text-xs text-gray-500 mb-2">
                            Task: {notification.task_title}
                          </p>
                        )}
                        
                        <div className="flex gap-2 flex-wrap">
                          {notification.live_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(notification.live_url!, '_blank')
                              }}
                            >
                              <MonitorIcon className="w-3 h-3 mr-1" />
                              Live View
                            </Button>
                          )}
                          {notification.recording_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(notification.recording_url!, '_blank')
                              }}
                            >
                              <VideoIcon className="w-3 h-3 mr-1" />
                              Recording
                            </Button>
                          )}
                          {notification.dashboard_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(notification.dashboard_url!, '_blank')
                              }}
                            >
                              <ArrowSquareOutIcon className="w-3 h-3 mr-1" />
                              Dashboard
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
      </AnimatePresence>
    </div>
  )
}

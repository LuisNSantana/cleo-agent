'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import SkyvernNotificationToast from './skyvern-notification-toast'

interface SkyvernNotification {
  id: string
  task_id: string
  notification_type: 'task_completed' | 'task_failed' | 'task_started' | 'task_progress'
  message: string
  sent_at: string
  task?: {
    title?: string
    url?: string
    live_url?: string
    recording_url?: string
    dashboard_url?: string
  }
}

interface NotificationManagerProps {
  onViewAllTasks?: () => void
}

export function SkyvernNotificationManager({ onViewAllTasks }: NotificationManagerProps) {
  const [notifications, setNotifications] = useState<SkyvernNotification[]>([])
  const [displayedNotifications, setDisplayedNotifications] = useState<string[]>([])

  // Polling para nuevas notificaciones
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/skyvern/notifications')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.notifications) {
          // Solo mostrar notificaciones de los últimos 5 minutos
          const recentNotifications = data.notifications.filter((notif: SkyvernNotification) => {
            const sentTime = new Date(notif.sent_at).getTime()
            const now = new Date().getTime()
            const fiveMinutes = 5 * 60 * 1000
            return now - sentTime < fiveMinutes
          })

          // Filtrar notificaciones que ya fueron mostradas
          const newNotifications = recentNotifications.filter(
            (notif: SkyvernNotification) => !displayedNotifications.includes(notif.id)
          )

          if (newNotifications.length > 0) {
            setNotifications(prev => [...newNotifications, ...prev].slice(0, 3)) // Máximo 3 notificaciones
            setDisplayedNotifications(prev => [
              ...prev, 
              ...newNotifications.map((n: SkyvernNotification) => n.id)
            ])
          }
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }, [displayedNotifications])

  // Polling cada 10 segundos
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  // Auto-remove notifications after 10 seconds
  useEffect(() => {
    notifications.forEach(notification => {
      const timer = setTimeout(() => {
        removeNotification(notification.id)
      }, 10000) // 10 segundos

      return () => clearTimeout(timer)
    })
  }, [notifications])

  return (
    <div className="fixed top-0 right-0 z-50 pointer-events-none">
      <div className="p-4 space-y-3 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification, index) => (
            <div
              key={notification.id}
              style={{
                zIndex: 50 - index // Notificaciones más recientes encima
              }}
            >
              <SkyvernNotificationToast
                notification={notification}
                onClose={() => removeNotification(notification.id)}
                onViewTask={onViewAllTasks}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default SkyvernNotificationManager

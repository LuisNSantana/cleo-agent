'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlayIcon,
  RobotIcon,
  VideoIcon,
  MonitorIcon,
  X
} from '@phosphor-icons/react'

interface SkyvernNotificationToastProps {
  notification: {
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
  onClose: () => void
  onViewTask?: () => void
}

export function SkyvernNotificationToast({ 
  notification, 
  onClose, 
  onViewTask 
}: SkyvernNotificationToastProps) {
  const getNotificationConfig = () => {
    switch (notification.notification_type) {
      case 'task_completed':
        return {
          icon: CheckCircleIcon,
          iconColor: 'text-green-400',
          badgeColor: 'bg-green-500/15 border-green-500/30 text-green-300',
          title: '🎉 Tarea Completada',
          subtitle: 'Web automation finalizada exitosamente',
          primaryAction: 'Ver Grabación',
          primaryUrl: notification.task?.recording_url
        }
      case 'task_failed':
        return {
          icon: XCircleIcon,
          iconColor: 'text-red-400',
          badgeColor: 'bg-red-500/15 border-red-500/30 text-red-300',
          title: '⚠️ Tarea Falló',
          subtitle: 'Se encontró un error durante la automatización',
          primaryAction: 'Ver Detalles',
          primaryUrl: notification.task?.dashboard_url
        }
      case 'task_started':
        return {
          icon: PlayIcon,
          iconColor: 'text-blue-400',
          badgeColor: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
          title: '🚀 Tarea Iniciada',
          subtitle: 'Automatización web en progreso',
          primaryAction: 'Ver en Vivo',
          primaryUrl: notification.task?.live_url
        }
      case 'task_progress':
        return {
          icon: ClockIcon,
          iconColor: 'text-orange-400',
          badgeColor: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
          title: '⏳ Progreso de Tarea',
          subtitle: 'Actualización de estado disponible',
          primaryAction: 'Ver Estado',
          primaryUrl: notification.task?.dashboard_url
        }
      default:
        return {
          icon: RobotIcon,
          iconColor: 'text-gray-500',
          badgeColor: 'bg-gray-100 text-gray-800',
          title: '🤖 Notificación',
          subtitle: 'Actualización disponible',
          primaryAction: 'Ver Detalles',
          primaryUrl: notification.task?.dashboard_url
        }
    }
  }

  const config = getNotificationConfig()
  const IconComponent = config.icon

  const formatTime = (timestamp: string) => {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp))
  }

  const getTaskDomain = () => {
    if (notification.task?.url) {
      try {
        return new URL(notification.task.url).hostname
      } catch {
        return 'sitio web'
      }
    }
    return 'sitio web'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: 100 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: 100 }}
      transition={{ type: "spring", duration: 0.5 }}
      className="fixed top-20 right-4 z-50 w-96"
    >
      <Card className="shadow-lg border-l-4 border-l-blue-500/60 bg-gray-900/95 backdrop-blur-sm border-gray-800">
        <CardContent className="p-4">
          {/* Header con Avatar del Agente */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              {/* Avatar del Agente WEX */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <RobotIcon size={20} className="text-white" />
                </div>
                {/* Indicador de estado */}
                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${config.iconColor}`}>
                  <IconComponent size={12} className="text-white" />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-sm text-gray-100">Wex</span>
                  <Badge className={`text-xs border ${config.badgeColor}`}>
                    Automatización
                  </Badge>
                </div>
                <p className="text-xs text-gray-400">
                  {formatTime(notification.sent_at)}
                </p>
              </div>
            </div>
            
            {/* Botón cerrar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </Button>
          </div>

          {/* Contenido Principal */}
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-gray-100 mb-1">
                {config.title}
              </h4>
              <p className="text-xs text-gray-300">
                {config.subtitle} en <span className="font-medium">{getTaskDomain()}</span>
              </p>
            </div>

            {/* Mensaje personalizado si existe */}
            {notification.task?.title && (
              <div className="text-xs text-gray-300 bg-gray-800/60 rounded-md p-2 border border-gray-700">
                <span className="font-medium">Tarea:</span> {notification.task.title}
              </div>
            )}

            {/* Acciones */}
            <div className="flex space-x-2">
              {config.primaryUrl && (
                <Button
                  size="sm"
                  className="flex-1 text-xs h-7"
                  onClick={() => {
                    window.open(config.primaryUrl, '_blank')
                    onClose()
                  }}
                >
                  {notification.notification_type === 'task_completed' && (
                    <VideoIcon size={12} className="mr-1" />
                  )}
                  {notification.notification_type === 'task_started' && (
                    <MonitorIcon size={12} className="mr-1" />
                  )}
                  {config.primaryAction}
                </Button>
              )}
              
              {onViewTask && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    onViewTask()
                    onClose()
                  }}
                >
                  Ver Todo
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default SkyvernNotificationToast

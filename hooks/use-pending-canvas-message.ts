"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface PendingCanvasMessage {
  message: string
  imageFile: string // data URL
  backgroundColor?: string
  timestamp: number
  isForExistingChat: boolean
  chatId: string
}

export function usePendingCanvasMessage() {
  const [pendingMessage, setPendingMessage] = useState<PendingCanvasMessage | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    // Función para procesar mensajes pendientes del canvas
    const processPendingMessage = () => {
      const pendingMessageStr = localStorage.getItem('pendingCanvasMessage')
      if (!pendingMessageStr) return

      try {
        const pendingMessage: PendingCanvasMessage = JSON.parse(pendingMessageStr)
        
        // Verificar si el mensaje no es muy antiguo (máximo 5 minutos)
        const maxAge = 5 * 60 * 1000 // 5 minutos
        if (Date.now() - pendingMessage.timestamp > maxAge) {
          localStorage.removeItem('pendingCanvasMessage')
          return
        }

        // Verificar si estamos en el chat correcto
        const isInCorrectChat = pathname.includes(`/c/${pendingMessage.chatId}`)
        
        if (isInCorrectChat) {
          // Estamos en el chat correcto, establecer el mensaje pendiente
          console.log('Mensaje pendiente del canvas encontrado:', pendingMessage)
          setPendingMessage(pendingMessage)
          
          // Limpiar el mensaje del localStorage
          localStorage.removeItem('pendingCanvasMessage')
        }
      } catch (error) {
        console.error('Error procesando mensaje pendiente del canvas:', error)
        // Limpiar mensaje corrupto
        localStorage.removeItem('pendingCanvasMessage')
      }
    }

    // Procesar mensajes pendientes cuando cambie la ruta
    processPendingMessage()
    
    // También escuchar el evento personalizado del canvas
    const handleCanvasMessageReady = (event: CustomEvent) => {
      console.log('Canvas message ready event:', event.detail)
      // Este evento se dispara cuando el canvas envía algo al chat actual
      processPendingMessage()
    }

    window.addEventListener('canvas-message-ready', handleCanvasMessageReady as EventListener)
    
    return () => {
      window.removeEventListener('canvas-message-ready', handleCanvasMessageReady as EventListener)
    }
  }, [pathname])

  const consumePendingMessage = () => {
    const message = pendingMessage
    setPendingMessage(null)
    return message
  }

  return {
    pendingMessage,
    consumePendingMessage,
    hasPendingMessage: !!pendingMessage,
    // Función para limpiar mensajes pendientes manualmente si es necesario
    clearPendingMessage: () => {
      localStorage.removeItem('pendingCanvasMessage')
      setPendingMessage(null)
    }
  }
}

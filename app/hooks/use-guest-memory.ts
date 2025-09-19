import { useCallback, useEffect, useState } from "react"
import type { MessageAISDK } from "@/lib/chat-store/messages/api"

const GUEST_MEMORY_KEY = "guest-chat-memory"
const MAX_GUEST_MESSAGES = 10 // Límite de mensajes en memoria

interface GuestMemory {
  messages: MessageAISDK[]
  lastUpdated: string
}

/**
 * Hook para manejar la memoria de chat en modo guest usando localStorage
 * Mantiene un historial de los últimos 10 mensajes para proporcionar contexto
 */
export function useGuestMemory() {
  const [guestMessages, setGuestMessages] = useState<MessageAISDK[]>([])

  // Cargar mensajes del localStorage al inicializar
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const stored = localStorage.getItem(GUEST_MEMORY_KEY)
      if (stored) {
        const memory: GuestMemory = JSON.parse(stored)
        // Validar que los mensajes no sean muy antiguos (opcional: 24h límite)
        const isRecent = new Date().getTime() - new Date(memory.lastUpdated).getTime() < 24 * 60 * 60 * 1000
        if (isRecent && Array.isArray(memory.messages)) {
          setGuestMessages(memory.messages)
        } else {
          // Limpiar memoria antigua
          localStorage.removeItem(GUEST_MEMORY_KEY)
        }
      }
    } catch (error) {
      console.warn("Error loading guest memory:", error)
      localStorage.removeItem(GUEST_MEMORY_KEY)
    }
  }, [])

  // Agregar mensaje a la memoria
  const addMessage = useCallback((message: MessageAISDK) => {
    setGuestMessages(prev => {
      // Evitar duplicados
      const exists = prev.some(msg => msg.id === message.id)
      if (exists) return prev

      // Agregar nuevo mensaje y mantener límite
      const updated = [...prev, message].slice(-MAX_GUEST_MESSAGES)
      
      // Guardar en localStorage
      try {
        const memory: GuestMemory = {
          messages: updated,
          lastUpdated: new Date().toISOString()
        }
        localStorage.setItem(GUEST_MEMORY_KEY, JSON.stringify(memory))
      } catch (error) {
        console.warn("Error saving guest memory:", error)
      }

      return updated
    })
  }, [])

  // Agregar múltiples mensajes (para sincronización)
  const addMessages = useCallback((messages: MessageAISDK[]) => {
    setGuestMessages(prev => {
      // Combinar mensajes evitando duplicados
      const combined = [...prev]
      messages.forEach(message => {
        const exists = combined.some(msg => msg.id === message.id)
        if (!exists) {
          combined.push(message)
        }
      })

      // Mantener límite de mensajes más recientes
      const updated = combined.slice(-MAX_GUEST_MESSAGES)
      
      // Guardar en localStorage
      try {
        const memory: GuestMemory = {
          messages: updated,
          lastUpdated: new Date().toISOString()
        }
        localStorage.setItem(GUEST_MEMORY_KEY, JSON.stringify(memory))
      } catch (error) {
        console.warn("Error saving guest memory:", error)
      }

      return updated
    })
  }, [])

  // Limpiar memoria
  const clearMemory = useCallback(() => {
    setGuestMessages([])
    try {
      localStorage.removeItem(GUEST_MEMORY_KEY)
    } catch (error) {
      console.warn("Error clearing guest memory:", error)
    }
  }, [])

  // Obtener mensajes formateados para enviar al API
  const getFormattedMessages = useCallback(() => {
    return guestMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }, [guestMessages])

  return {
    guestMessages,
    addMessage,
    addMessages,
    clearMemory,
    getFormattedMessages,
    hasMemory: guestMessages.length > 0,
    messageCount: guestMessages.length
  }
}
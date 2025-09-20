'use client'

/**
 * 🌐 Tool Confirmation Provider
 * Context provider global para el sistema de confirmación
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { PendingAction, ConfirmationResult } from '@/lib/confirmation/types'
import { confirmationStore } from '@/lib/confirmation/middleware'

interface ToolConfirmationContextType {
  isWaitingForConfirmation: boolean
  pendingAction: PendingAction | null
  resolveConfirmation: (result: ConfirmationResult) => void
}

const ToolConfirmationContext = createContext<ToolConfirmationContextType | undefined>(undefined)

export function useToolConfirmation() {
  const context = useContext(ToolConfirmationContext)
  if (context === undefined) {
    throw new Error('useToolConfirmation must be used within a ToolConfirmationProvider')
  }
  return context
}

interface ToolConfirmationProviderProps {
  children: ReactNode
}

export function ToolConfirmationProvider({ children }: ToolConfirmationProviderProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  useEffect(() => {
    // Polling para detectar acciones pendientes
    const checkPendingActions = () => {
      const pending = confirmationStore.getPendingAction()
      
      if (pending && pending.id !== pendingAction?.id) {
        setPendingAction(pending)
      } else if (!pending && pendingAction) {
        setPendingAction(null)
      }
    }

    // Check inicial
    checkPendingActions()

    // Polling cada 300ms para detectar nuevas acciones pendientes
    const interval = setInterval(checkPendingActions, 300)

    return () => clearInterval(interval)
  }, [pendingAction])

  const resolveConfirmation = (result: ConfirmationResult) => {
    if (pendingAction) {
      confirmationStore.resolveConfirmation(pendingAction.id, result)
      setPendingAction(null)
    }
  }

  const contextValue: ToolConfirmationContextType = {
    isWaitingForConfirmation: !!pendingAction,
    pendingAction,
    resolveConfirmation
  }

  return (
    <ToolConfirmationContext.Provider value={contextValue}>
      {children}
      {/* No incluimos dialog aquí - se renderiza en el chat */}
    </ToolConfirmationContext.Provider>
  )
}
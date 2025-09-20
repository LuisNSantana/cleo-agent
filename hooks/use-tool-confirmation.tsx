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
    // Polling para detectar acciones pendientes desde el backend
    const checkPendingActions = async () => {
      try {
        const response = await fetch('/api/chat/pending-confirmations')
        const data = await response.json()
        
        if (data.success && data.confirmations.length > 0) {
          const latestConfirmation = data.confirmations[0] // Get the most recent one
          
          if (latestConfirmation && latestConfirmation.confirmationId !== pendingAction?.id) {
            console.log('🔍 [CLIENT] New pending confirmation detected:', latestConfirmation)
            
            // Convert to PendingAction format
            const newPendingAction: PendingAction = {
              id: latestConfirmation.confirmationId,
              toolName: latestConfirmation.toolName,
              parameters: latestConfirmation.pendingAction?.parameters || {},
              description: latestConfirmation.preview?.description || '',
              category: latestConfirmation.pendingAction?.category || 'dataModification',
              sensitivity: latestConfirmation.pendingAction?.sensitivity || 'medium',
              undoable: latestConfirmation.pendingAction?.undoable || false,
              preview: latestConfirmation.preview || {
                title: 'Confirmation Required',
                description: 'Please confirm this action',
                parameters: []
              },
              timestamp: latestConfirmation.timestamp || Date.now()
            }
            
            setPendingAction(newPendingAction)
          }
        } else if (data.success && data.confirmations.length === 0 && pendingAction) {
          console.log('🔍 [CLIENT] No pending confirmations, clearing state')
          setPendingAction(null)
        }
      } catch (error) {
        console.error('🔍 [CLIENT] Error checking pending confirmations:', error)
      }
    }

    // Check inicial
    checkPendingActions()

    // Polling cada 500ms para detectar nuevas acciones pendientes
    const interval = setInterval(checkPendingActions, 500)

    return () => clearInterval(interval)
  }, [pendingAction])

  const resolveConfirmation = async (result: ConfirmationResult) => {
    if (pendingAction) {
      console.log(`[CLIENT] Resolving confirmation ${pendingAction.id}:`, result)
      
      try {
        // Call backend endpoint to execute the confirmed tool
        const response = await fetch('/api/chat/confirm-tool', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            confirmationId: pendingAction.id,
            approved: result.action === 'approve',
          }),
        })

        const data = await response.json()
        
        if (data.success) {
          console.log(`[CLIENT] Tool execution result:`, data.result)
        } else {
          console.error(`[CLIENT] Tool execution failed:`, data.error)
        }
      } catch (error) {
        console.error(`[CLIENT] Error calling confirm-tool endpoint:`, error)
      }
      
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
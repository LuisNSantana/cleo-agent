'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PendingConfirmation {
  id: string
  toolName: string
  params: any
  message: string
}

interface InChatConfirmationProps {
  onConfirmationChange?: (hasPending: boolean) => void
}

export default function InChatConfirmation({ onConfirmationChange }: InChatConfirmationProps) {
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  // Poll for pending confirmations
  useEffect(() => {
    const checkPending = async () => {
      try {
        const response = await fetch('/api/pending-confirmations')
        if (response.ok) {
          const data = await response.json()
          const confirmations = data.confirmations || []
          setPendingConfirmations(confirmations)
          onConfirmationChange?.(confirmations.length > 0)
        }
      } catch (error) {
        console.error('Error checking confirmations:', error)
      }
    }

    checkPending()
    const interval = setInterval(checkPending, 500) // Check every 500ms
    return () => clearInterval(interval)
  }, [onConfirmationChange])

  const handleConfirmation = async (confirmationId: string, approved: boolean) => {
    setProcessing(confirmationId)
    
    try {
      console.log(`[UI] Processing confirmation ${confirmationId} with approved=${approved}`)
      
      const response = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationId, approved })
      })

      const result = await response.json()
      console.log(`[UI] Confirmation result:`, result)

      if (response.ok && result.success) {
        // Remove from pending list immediately
        setPendingConfirmations(prev => prev.filter(p => p.id !== confirmationId))
        
        // Show feedback message
        if (approved) {
          console.log(`[UI] Tool executed successfully: ${result.message}`)
        } else {
          console.log(`[UI] Tool cancelled: ${result.message}`)
        }
      } else {
        console.error('[UI] Failed to process confirmation:', result.error || 'Unknown error')
        // Don't remove from list if there was an error
      }
    } catch (error) {
      console.error('[UI] Error processing confirmation:', error)
      // Don't remove from list if there was an error
    } finally {
      setProcessing(null)
    }
  }

  if (pendingConfirmations.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      {pendingConfirmations.map((confirmation) => (
        <motion.div
          key={confirmation.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="group flex w-full max-w-4xl flex-col items-start gap-3 px-6 pb-4"
        >
          <div className="w-full">
            {/* Simular estructura de mensaje del asistente */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-400 text-white text-sm font-medium">
                🔐
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Confirmation Required
                </div>
                
                <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                  <CardContent className="p-4 space-y-4">
                    <div className="whitespace-pre-line text-sm">
                      {confirmation.message}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConfirmation(confirmation.id, true)}
                        disabled={processing === confirmation.id}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        {processing === confirmation.id ? 'Approving...' : 'Approve'}
                      </Button>
                      
                      <Button
                        onClick={() => handleConfirmation(confirmation.id, false)}
                        disabled={processing === confirmation.id}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        {processing === confirmation.id ? 'Canceling...' : 'Cancel'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
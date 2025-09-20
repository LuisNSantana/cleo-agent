'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle } from 'lucide-react'

interface PendingConfirmation {
  id: string
  toolName: string
  params: any
  message: string
}

export default function SimpleConfirmationDialog() {
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  // Poll for pending confirmations
  useEffect(() => {
    const checkPending = async () => {
      try {
        const response = await fetch('/api/pending-confirmations')
        if (response.ok) {
          const data = await response.json()
          setPendingConfirmations(data.confirmations || [])
        }
      } catch (error) {
        console.error('Error checking confirmations:', error)
      }
    }

    checkPending()
    const interval = setInterval(checkPending, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleConfirmation = async (confirmationId: string, approved: boolean) => {
    setProcessing(confirmationId)
    
    try {
      const response = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationId, approved })
      })

      if (response.ok) {
        // Remove from pending list
        setPendingConfirmations(prev => prev.filter(p => p.id !== confirmationId))
      } else {
        console.error('Failed to process confirmation')
      }
    } catch (error) {
      console.error('Error processing confirmation:', error)
    } finally {
      setProcessing(null)
    }
  }

  if (pendingConfirmations.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {pendingConfirmations.map((confirmation) => (
        <Card key={confirmation.id} className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              🔐 Confirmation Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                Approve
              </Button>
              
              <Button
                onClick={() => handleConfirmation(confirmation.id, false)}
                disabled={processing === confirmation.id}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <XCircle className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
/**
 * 🛡️ Unified Confirmation Hook
 * Simple React hook that integrates with the unified confirmation system
 */

import { useState, useEffect, useCallback } from 'react'

export interface PendingConfirmation {
  id: string
  toolName: string
  params: any
  message: string
  timestamp: number
}

export function useUnifiedConfirmation() {
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch pending confirmations
  const refreshConfirmations = useCallback(async () => {
    try {
      const res = await fetch('/api/confirmations', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to fetch confirmations: ${res.status}`)
      const data = await res.json()
      setPendingConfirmations(data.pending || [])
    } catch (e) {
      console.error('[useUnifiedConfirmation] fetch error', e)
    }
  }, [])

  // Poll for updates (simple approach for now)
  useEffect(() => {
    refreshConfirmations()
    
    const interval = setInterval(refreshConfirmations, 1000)
    return () => clearInterval(interval)
  }, [refreshConfirmations])

  // Approve/reject confirmation
  const handleConfirmation = useCallback(async (confirmationId: string, approved: boolean) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmationId, approved })
      })
      const result = await res.json()
      
      if (result.success) {
        // Remove from local state immediately
        setPendingConfirmations(prev => prev.filter(p => p.id !== confirmationId))
      }
      
      return result
    } catch (error) {
      console.error('Failed to resolve confirmation:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Convenience methods
  const approve = useCallback((confirmationId: string) => {
    return handleConfirmation(confirmationId, true)
  }, [handleConfirmation])

  const reject = useCallback((confirmationId: string) => {
    return handleConfirmation(confirmationId, false)
  }, [handleConfirmation])

  return {
    pendingConfirmations,
    isLoading,
    approve,
    reject,
    refresh: refreshConfirmations,
    hasConfirmations: pendingConfirmations.length > 0
  }
}
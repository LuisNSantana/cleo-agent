import { useState, useEffect } from 'react'
import type { CreditBalance } from '@/app/components/credits/credit-display'

/**
 * Custom hook to fetch and auto-refresh credit balance
 * Used by both Header and Account page to ensure consistent data
 */
export function useCreditBalance() {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/credits/balance')
        if (response.ok) {
          const data = await response.json()
          setBalance(data)
          setError(null)
        } else {
          throw new Error('Failed to fetch balance')
        }
      } catch (err) {
        console.error('Failed to fetch credit balance:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [])

  return { balance, loading, error }
}

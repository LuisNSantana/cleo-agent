/**
 * Agent Auto-Sync Initialization Hook
 * 
 * Initializes the auto-sync system on the client side
 */

'use client'

import { useEffect } from 'react'
import { initializeAgentAutoSync } from '@/lib/agents/auto-sync'

/**
 * Hook to initialize agent auto-sync system
 */
export function useAgentAutoSync() {
  useEffect(() => {
    // Initialize auto-sync system once on mount
    initializeAgentAutoSync()
  }, [])
}

/**
 * Component wrapper to initialize auto-sync
 */
export function AgentAutoSyncProvider({ children }: { children: React.ReactNode }) {
  useAgentAutoSync()
  return children
}
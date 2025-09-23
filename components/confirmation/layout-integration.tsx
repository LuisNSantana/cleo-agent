/**
 * 🛡️ Layout Integration Example
 * How to integrate the unified confirmation system in your app
 */

'use client'

import React from 'react'
import { UnifiedConfirmationProvider } from '@/components/confirmation'

export function AppLayoutWithConfirmation({ children }: { children: React.ReactNode }) {
  return (
    <UnifiedConfirmationProvider mode="auto">
      {children}
    </UnifiedConfirmationProvider>
  )
}

/**
 * For chat pages specifically
 */
export function ChatLayoutWithConfirmation({ children }: { children: React.ReactNode }) {
  return (
    <UnifiedConfirmationProvider mode="inline">
      {children}
    </UnifiedConfirmationProvider>
  )
}

/**
 * Usage in pages:
 * 
 * import { AppLayoutWithConfirmation } from '@/components/confirmation/layout-integration'
 * 
 * export default function HomePage() {
 *   return (
 *     <AppLayoutWithConfirmation>
 *       <YourContent />
 *     </AppLayoutWithConfirmation>
 *   )
 * }
 */
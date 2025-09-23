/**
 * 🛡️ Unified Confirmation Provider
 * Automatically integrates confirmation UI throughout the app
 * Responsive - shows modal on desktop, inline on mobile
 */

'use client'

import React, { useEffect } from 'react'
import { useUnifiedConfirmation } from '@/hooks/use-unified-confirmation'
import { UnifiedConfirmationModal } from './unified-confirmation-modal'
import { InChatConfirmation } from './in-chat-confirmation'

// Simple inline media query hook
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

interface UnifiedConfirmationProviderProps {
  children: React.ReactNode
  mode?: 'auto' | 'modal' | 'inline'
  className?: string
}

export function UnifiedConfirmationProvider({ 
  children, 
  mode = 'auto',
  className = ''
}: UnifiedConfirmationProviderProps) {
  const { hasConfirmations } = useUnifiedConfirmation()
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  // Auto-mode: modal on desktop, inline on mobile
  const showModal = mode === 'modal' || (mode === 'auto' && !isMobile)
  const showInline = mode === 'inline' || (mode === 'auto' && isMobile)

  return (
    <>
      {children}
      
      {/* Modal confirmation for desktop */}
      {hasConfirmations && showModal && <UnifiedConfirmationModal />}
      
      {/* Inline confirmation for mobile or inline mode */}
      {hasConfirmations && showInline && (
        <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
          <InChatConfirmation />
        </div>
      )}
    </>
  )
}

/**
 * Hook for chat components to integrate confirmations seamlessly
 */
export function useChatConfirmationIntegration() {
  const { pendingConfirmations, approve, reject, isLoading } = useUnifiedConfirmation()
  
  // Keyboard shortcuts
  useEffect(() => {
    if (pendingConfirmations.length === 0) return
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') return
      
      const confirmation = pendingConfirmations[0]
      if (!confirmation) return
      
      if (event.key === 'Escape') {
        event.preventDefault()
        reject(confirmation.id)
      } else if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault()
        approve(confirmation.id)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pendingConfirmations, approve, reject])
  
  return {
    hasConfirmations: pendingConfirmations.length > 0,
    currentConfirmation: pendingConfirmations[0] || null,
    approve: (id?: string) => approve(id || pendingConfirmations[0]?.id),
    reject: (id?: string) => reject(id || pendingConfirmations[0]?.id),
    isLoading
  }
}

/**
 * Simple inline confirmation for chat messages
 */
export function ChatMessageConfirmation() {
  const { pendingConfirmations } = useUnifiedConfirmation()
  const confirmation = pendingConfirmations[0]
  
  if (!confirmation) return null
  
  return <InChatConfirmation className="mx-4 mb-4" />
}
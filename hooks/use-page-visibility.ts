/**
 * Page Visibility Hook
 * Tracks when the page/screen becomes visible or hidden
 * Essential for handling screen lock/unlock scenarios
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export interface VisibilityState {
  isVisible: boolean
  visibilityState: DocumentVisibilityState
  lastHidden: number | null
  lastVisible: number | null
  hiddenDuration: number // milliseconds the page was hidden
}

export interface UsePageVisibilityOptions {
  /**
   * Callback when page becomes visible
   */
  onVisible?: (state: VisibilityState) => void
  
  /**
   * Callback when page becomes hidden
   */
  onHidden?: (state: VisibilityState) => void
  
  /**
   * Callback on any visibility change
   */
  onChange?: (state: VisibilityState) => void
  
  /**
   * Only fire onVisible if page was hidden for at least this many ms
   * Useful to ignore quick tab switches
   */
  minHiddenDuration?: number
}

export function usePageVisibility(options: UsePageVisibilityOptions = {}) {
  const {
    onVisible,
    onHidden,
    onChange,
    minHiddenDuration = 0
  } = options

  const [state, setState] = useState<VisibilityState>(() => ({
    isVisible: typeof document !== 'undefined' ? !document.hidden : true,
    visibilityState: typeof document !== 'undefined' ? document.visibilityState : 'visible',
    lastHidden: null,
    lastVisible: null,
    hiddenDuration: 0
  }))

  const lastHiddenRef = useRef<number | null>(null)
  const callbacksRef = useRef({ onVisible, onHidden, onChange })

  // Keep callbacks ref up to date
  useEffect(() => {
    callbacksRef.current = { onVisible, onHidden, onChange }
  }, [onVisible, onHidden, onChange])

  const handleVisibilityChange = useCallback(() => {
    const hidden = document.hidden
    const visibilityState = document.visibilityState
    const now = Date.now()

    const newState: VisibilityState = {
      isVisible: !hidden,
      visibilityState,
      lastHidden: hidden ? now : lastHiddenRef.current,
      lastVisible: !hidden ? now : state.lastVisible,
      hiddenDuration: 0
    }

    // Calculate how long the page was hidden
    if (!hidden && lastHiddenRef.current !== null) {
      newState.hiddenDuration = now - lastHiddenRef.current
    }

    // Update ref for next calculation
    if (hidden) {
      lastHiddenRef.current = now
    }

    setState(newState)

    // Fire callbacks
    const { onVisible: cbVisible, onHidden: cbHidden, onChange: cbChange } = callbacksRef.current

    if (cbChange) {
      cbChange(newState)
    }

    if (!hidden && cbVisible) {
      // Only fire if hidden duration meets threshold
      if (newState.hiddenDuration >= minHiddenDuration) {
        cbVisible(newState)
      }
    }

    if (hidden && cbHidden) {
      cbHidden(newState)
    }
  }, [minHiddenDuration, state.lastVisible])

  useEffect(() => {
    // Check if Page Visibility API is supported
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') {
      return
    }

    // Add listener
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [handleVisibilityChange])

  return state
}

/**
 * Simple hook that just returns whether the page is visible
 */
export function useIsPageVisible(): boolean {
  const [isVisible, setIsVisible] = useState(() => 
    typeof document !== 'undefined' ? !document.hidden : true
  )

  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleChange = () => {
      setIsVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleChange)
    return () => document.removeEventListener('visibilitychange', handleChange)
  }, [])

  return isVisible
}

/**
 * DEPRECATED: Legacy confirmation hook
 * Use useUnifiedConfirmation from hooks/use-unified-confirmation instead.
 */

import React from 'react'

export const useToolConfirmation = () => {
  return {
    isWaitingForConfirmation: false,
    pendingAction: null,
    resolveConfirmation: () => {}
  }
}

export const ToolConfirmationProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

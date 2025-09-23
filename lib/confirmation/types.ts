// DEPRECATED: Legacy types for backward compatibility
// Use types from lib/confirmation/unified instead

export interface PendingAction {
  id: string
  toolName: string
  params: any
  message?: string
}

export interface ConfirmationResult {
  approved: boolean
  modifiedParameters?: any
}

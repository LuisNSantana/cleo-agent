// DEPRECATED: Legacy types for backward compatibility
// Use types from lib/confirmation/unified instead

export interface PendingAction {
  id: string
  toolName: string
  params: any
  message?: string
  // Legacy properties for backward compatibility
  category?: string
  sensitivity?: 'low' | 'medium' | 'high' | 'critical'
  preview?: {
    title?: string
    summary?: string
    details?: Array<{ key: string; value: string }>
    warnings?: string[]
  }
  undoable?: boolean
  estimatedDuration?: string
  timestamp?: number
  // Alias for params for backward compatibility
  parameters?: any
}

export interface ConfirmationResult {
  approved: boolean
  modifiedParameters?: any
}

// Legacy constants for backward compatibility
export const TOOL_SENSITIVITY_MAP: Record<string, string> = {
  sendGmailMessage: 'emailActions',
  createCalendarEvent: 'calendarActions',
  postTweet: 'socialActions',
  uploadToDrive: 'fileActions',
  createDriveFile: 'fileActions',
  deleteDriveFile: 'fileActions'
}

export const ALWAYS_CONFIRM_TOOLS = [
  'sendGmailMessage',
  'createCalendarEvent',
  'postTweet',
  'uploadToDrive',
  'createDriveFile',
  'deleteDriveFile'
]

export const SAFE_AUTO_TOOLS = [
  'getCurrentTime',
  'searchWeb',
  'readFile'
]

// Tool execution settings types
export type ToolExecutionMode = 'manual' | 'auto' | 'smart' | 'preventive' | 'hybrid'
export type ActionSensitivity = 'low' | 'medium' | 'high' | 'critical' | 'always_confirm' | 'auto' | 'inherit'

export interface ToolExecutionSettings {
  mode: ToolExecutionMode
  confirmationTimeout: number
  autoConfirm: boolean
  requireConfirmation: boolean
  enableSmartMode: boolean
  enableNotifications: boolean
  silentMode: boolean
  categorySettings: Record<string, ActionSensitivity>
  // Additional properties for legacy compatibility
  defaultMode?: ToolExecutionMode
  allowBulkActions?: boolean
  rememberPreferences?: boolean
  emailActions?: ActionSensitivity
  calendarActions?: ActionSensitivity
  socialActions?: ActionSensitivity
  fileActions?: ActionSensitivity
  dataModification?: ActionSensitivity
  financeActions?: ActionSensitivity
}

export const DEFAULT_TOOL_SETTINGS: ToolExecutionSettings = {
  mode: 'smart',
  confirmationTimeout: 30,
  autoConfirm: false,
  requireConfirmation: true,
  enableSmartMode: true,
  enableNotifications: true,
  silentMode: false,
  categorySettings: {
    emailActions: 'high',
    calendarActions: 'medium',
    socialActions: 'high',
    fileActions: 'medium',
    dataModification: 'high',
    financeActions: 'critical'
  },
  // Default values for additional properties
  defaultMode: 'smart',
  allowBulkActions: false,
  rememberPreferences: true,
  emailActions: 'high',
  calendarActions: 'medium',
  socialActions: 'high',
  fileActions: 'medium',
  dataModification: 'high',
  financeActions: 'critical'
}

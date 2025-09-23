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

// DEPRECATED: Legacy simple confirmation for backward compatibility
// Use lib/confirmation/unified instead

export interface ToolPreview {
  toolName?: string
  parameters?: any
  description?: string
  summary: string
  title?: string
  warnings?: string[]
}

// Legacy function for backward compatibility
export function generateToolPreview(toolName: string, parameters: any): ToolPreview {
  return {
    toolName,
    parameters,
    description: `Execute ${toolName} with provided parameters`,
    summary: `Execute ${toolName} with provided parameters`,
    title: toolName,
    warnings: []
  }
}

// Legacy function for backward compatibility
export function requiresConfirmation(toolName: string): boolean {
  // Basic list of tools that require confirmation
  const confirmationTools = [
    'sendGmailMessage',
    'createCalendarEvent', 
    'postTweet',
    'uploadToDrive',
    'createDriveFile',
    'deleteDriveFile'
  ]
  return confirmationTools.includes(toolName)
}

export interface ConfirmationResponse {
  approved: boolean
  modifiedParameters?: any
  userId?: string // For context propagation in delegation tools
}

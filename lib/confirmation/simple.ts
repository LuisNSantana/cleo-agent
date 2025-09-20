/**
 * 🛡️ Simple Tool Confirmation System
 * Based on ChatGPT and Claude patterns for critical tool confirmation
 */

// Critical tools that require user confirmation before execution
export const CRITICAL_TOOLS = [
  // External communication (sending messages)
  'sendGmailMessage',
  'postTweet', 
  'sendSlackMessage',
  
  // Calendar management (affects other users)
  'createCalendarEvent',
  'updateCalendarEvent', 
  'deleteCalendarEvent',
  
  // Drive operations (file management)
  'uploadToDrive',
  'createDriveFile',
  'createDriveFolder',
  'deleteDriveFile',
  'shareDriveFile',
  'moveDriveFile',
  
  // Destructive operations
  'deleteFile',
  'deleteRecord',
  
  // Financial transactions
  'makeTransaction',
  'createPayment'
]

// Preview structure for confirmation
export interface ToolPreview {
  toolName: string
  title: string
  description: string
  parameters: Record<string, any>
  warnings?: string[]
}

// User confirmation response
export interface ConfirmationResponse {
  approved: boolean
  parameters?: Record<string, any> // User-modified parameters
}

// Check if a tool requires confirmation
export function requiresConfirmation(toolName: string): boolean {
  return CRITICAL_TOOLS.includes(toolName)
}

// Generate preview for critical tools
export function generateToolPreview(toolName: string, parameters: Record<string, any>): ToolPreview {
  switch (toolName) {
    case 'sendGmailMessage':
      // Determine if it's a reply, forward, or new email
      if (parameters.inReplyTo || parameters.threadId) {
        return {
          toolName,
          title: '↩️ Reply to Email',
          description: `Reply to email: "${parameters.subject || 'Re: [Original Subject]'}"`,
          parameters,
          warnings: ['Reply will be sent to all specified recipients']
        }
      } else if (parameters.subject?.toLowerCase().includes('fwd:') || parameters.subject?.toLowerCase().includes('forward')) {
        return {
          toolName,
          title: '➡️ Forward Email',
          description: `Forward email to ${Array.isArray(parameters.to) ? parameters.to.join(', ') : parameters.to}`,
          parameters,
          warnings: ['Original email content will be shared with new recipients']
        }
      } else {
        return {
          toolName,
          title: '📧 Send Email',
          description: `Send email to ${Array.isArray(parameters.to) ? parameters.to.join(', ') : parameters.to}`,
          parameters,
          warnings: parameters.to?.includes('@') ? ['Email will be sent immediately'] : undefined
        }
      }
      
    case 'createCalendarEvent':
      return {
        toolName,
        title: '📅 Create Calendar Event',
        description: `Create "${parameters.summary}" on ${new Date(parameters.startDateTime).toLocaleDateString()}`,
        parameters,
        warnings: parameters.attendees?.length > 0 ? ['Invitations will be sent to attendees'] : undefined
      }
      
    case 'uploadToDrive':
    case 'createDriveFile':
      return {
        toolName,
        title: '📁 Upload to Drive',
        description: `Upload file: ${parameters.fileName || parameters.name || 'New file'}`,
        parameters,
        warnings: ['File will be saved to your Google Drive']
      }
      
    case 'createDriveFolder':
      return {
        toolName,
        title: '📁 Create Drive Folder',
        description: `Create folder: "${parameters.name}" ${parameters.parentFolderId ? 'in specified folder' : 'in root'}`,
        parameters,
        warnings: ['Folder will be created in your Google Drive']
      }
      
    case 'deleteDriveFile':
      return {
        toolName,
        title: '🗑️ Delete Drive File',
        description: `Delete file: ${parameters.fileName || parameters.name || parameters.fileId}`,
        parameters,
        warnings: ['File will be moved to Drive trash', 'This action can be undone from Drive trash']
      }
      
    case 'shareDriveFile':
      return {
        toolName,
        title: '🔗 Share Drive File',
        description: `Share file with ${Array.isArray(parameters.emails) ? parameters.emails.join(', ') : parameters.email || 'specified users'}`,
        parameters,
        warnings: ['Recipients will receive email notification', 'File permissions will be granted immediately']
      }
      
    case 'postTweet':
      return {
        toolName,
        title: '🐦 Post Tweet',
        description: `Post: "${parameters.text?.slice(0, 100)}${parameters.text?.length > 100 ? '...' : ''}"`,
        parameters,
        warnings: ['Tweet will be posted publicly']
      }
      
    case 'deleteFile':
      return {
        toolName,
        title: '🗑️ Delete File',
        description: `Delete file: ${parameters.fileName || parameters.path}`,
        parameters,
        warnings: ['This action cannot be undone']
      }
      
    default:
      return {
        toolName,
        title: `⚠️ ${toolName}`,
        description: `Execute ${toolName}`,
        parameters,
        warnings: ['This is a critical action']
      }
  }
}
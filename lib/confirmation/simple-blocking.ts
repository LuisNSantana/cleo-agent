/**
 * 🛡️ Simple Blocking Confirmation System
 * Proper Promise-based confirmation that integrates with chat flow
 */

// Tools that need confirmation
const NEEDS_CONFIRMATION = [
  'createCalendarEvent',
  'sendGmailMessage', 
  'postTweet',
  'uploadToDrive',
  'createDriveFile',
  'deleteDriveFile'
]

// Global pending confirmations with Promise resolvers
const pendingConfirmations = new Map<string, {
  toolName: string
  params: any
  message: string
  resolve: (result: any) => void
  reject: (error: any) => void
  executeFunction: () => Promise<any>
  createdAt: number
}>()

// Cleanup old confirmations (timeout after 5 minutes)
setInterval(() => {
  const now = Date.now()
  const timeout = 5 * 60 * 1000 // 5 minutes
  
  for (const [id, confirmation] of pendingConfirmations.entries()) {
    if (now - confirmation.createdAt > timeout) {
      confirmation.reject(new Error('Confirmation timeout'))
      pendingConfirmations.delete(id)
    }
  }
}, 60000) // Check every minute

export function needsConfirmation(toolName: string): boolean {
  return NEEDS_CONFIRMATION.includes(toolName)
}

export function generateConfirmationMessage(toolName: string, params: any): string {
  switch (toolName) {
    case 'createCalendarEvent':
      return `🗓️ **Create Calendar Event**

**Title:** ${params.summary}
**When:** ${params.startDateTime} to ${params.endDateTime}
**Location:** ${params.location || 'Not specified'}
**Description:** ${params.description || 'No description'}

Do you want me to create this calendar event?`

    case 'sendGmailMessage':
      return `📧 **Send Email**

**To:** ${params.to}
**Subject:** ${params.subject}
**Message:** ${params.body?.substring(0, 200)}${params.body?.length > 200 ? '...' : ''}

Do you want me to send this email?`

    case 'postTweet':
      return `🐦 **Post Tweet**

**Content:** ${params.text}

Do you want me to post this tweet?`

    case 'uploadToDrive':
    case 'createDriveFile':
      return `📁 **Upload to Google Drive**

**File:** ${params.name || params.filename || 'Unknown file'}
**Parent Folder:** ${params.parentId || 'Root folder'}

Do you want me to upload this file to Google Drive?`

    case 'deleteDriveFile':
      return `�️ **Delete Google Drive File**

**File:** ${params.fileId}

⚠️ **Warning:** This action cannot be undone. Do you want to delete this file?`

    default:
      return `�🔐 **Confirm Action**

**Tool:** ${toolName}
**Parameters:** ${JSON.stringify(params, null, 2)}

Do you want me to execute this action?`
  }
}

/**
 * Block execution until user confirms - returns a Promise that resolves with the actual result
 */
export async function blockForConfirmation<T>(
  toolName: string,
  params: any,
  executeFunction: () => Promise<T>
): Promise<T> {
  
  if (!needsConfirmation(toolName)) {
    // No confirmation needed - execute immediately
    return await executeFunction()
  }

  // Generate confirmation message
  const message = generateConfirmationMessage(toolName, params)
  const confirmationId = `confirm_${toolName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Create a Promise that will be resolved when user responds
  return new Promise<T>((resolve, reject) => {
    // Store the confirmation for the UI to pick up
    pendingConfirmations.set(confirmationId, {
      toolName,
      params,
      message,
      resolve,
      reject,
      executeFunction,
      createdAt: Date.now()
    })

    // The Promise will be resolved when resolveConfirmation is called
    // If user approves, executeFunction will be called and its result returned
    // If user rejects, the Promise will be rejected
  })
}

/**
 * Resolve a pending confirmation
 */
export async function resolveConfirmation(confirmationId: string, approved: boolean): Promise<{ success: boolean; result?: any; message?: string }> {
  const pending = pendingConfirmations.get(confirmationId)
  if (!pending) {
    return { success: false, message: 'Confirmation not found or already processed' }
  }

  // Remove from pending immediately to prevent duplicate processing
  pendingConfirmations.delete(confirmationId)

  try {
    if (approved) {
      console.log(`[CONFIRMATION] Executing ${pending.toolName}...`)
      const result = await pending.executeFunction()
      pending.resolve(result)
      return { 
        success: true, 
        result,
        message: `✅ ${pending.toolName} executed successfully`
      }
    } else {
      console.log(`[CONFIRMATION] User cancelled ${pending.toolName}`)
      const cancelError = new Error(`User cancelled ${pending.toolName}`)
      pending.reject(cancelError)
      return { 
        success: true, 
        message: `❌ ${pending.toolName} cancelled by user`
      }
    }
  } catch (error) {
    console.error(`[CONFIRMATION] Error executing ${pending.toolName}:`, error)
    pending.reject(error)
    return { 
      success: false, 
      message: `Error executing ${pending.toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get all pending confirmations (for UI)
 */
export function getPendingConfirmations() {
  return Array.from(pendingConfirmations.entries()).map(([id, data]) => ({
    id,
    toolName: data.toolName,
    params: data.params,
    message: data.message
  }))
}
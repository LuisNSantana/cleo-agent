/**
 * 🛡️ Simple Blocking Confirmation System
 * No complex polling, no global state - just simple blocking confirmation
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

// Global pending confirmations (simple in-memory)
const pendingConfirmations = new Map<string, {
  toolName: string
  params: any
  resolve: (approved: boolean) => void
}>()

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

    default:
      return `🔐 **Confirm Action**

**Tool:** ${toolName}
**Parameters:** ${JSON.stringify(params, null, 2)}

Do you want me to execute this action?`
  }
}

/**
 * Block execution until user confirms
 * Returns: { needsConfirmation: true, message: string } or proceeds with execution
 */
export async function blockForConfirmation<T>(
  toolName: string,
  params: any,
  executeFunction: () => Promise<T>
): Promise<{ needsConfirmation: true; message: string; confirmationId: string } | T> {
  
  if (!needsConfirmation(toolName)) {
    // No confirmation needed - execute immediately
    return await executeFunction()
  }

  // Generate confirmation message
  const message = generateConfirmationMessage(toolName, params)
  const confirmationId = `confirm_${toolName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Store execution function for later
  return new Promise((resolve) => {
    pendingConfirmations.set(confirmationId, {
      toolName,
      params,
      resolve: async (approved: boolean) => {
        if (approved) {
          try {
            const result = await executeFunction()
            resolve(result)
          } catch (error) {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Execution failed'
            } as T)
          }
        } else {
          resolve({
            success: false,
            message: 'Action cancelled by user',
            cancelled: true
          } as T)
        }
      }
    })

    // Return confirmation request immediately
    resolve({
      needsConfirmation: true,
      message,
      confirmationId
    } as any)
  })
}

/**
 * Resolve a pending confirmation
 */
export function resolveConfirmation(confirmationId: string, approved: boolean): boolean {
  const pending = pendingConfirmations.get(confirmationId)
  if (!pending) {
    return false
  }

  pendingConfirmations.delete(confirmationId)
  pending.resolve(approved)
  return true
}

/**
 * Get all pending confirmations (for UI)
 */
export function getPendingConfirmations() {
  return Array.from(pendingConfirmations.entries()).map(([id, data]) => ({
    id,
    toolName: data.toolName,
    params: data.params,
    message: generateConfirmationMessage(data.toolName, data.params)
  }))
}
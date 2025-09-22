/**
 * 🛡️ Simple Blocking Confirmation System
 * Proper Promise-based confirmation that integrates with chat flow
 * Now emits SSE events via delegation pipeline when controller is active.
 */
import { emitPipelineEventExternal } from '@/lib/tools/delegation'

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

    // Emit SSE event (best effort) so UI can render modal without polling immediately
    try {
      const category = inferCategory(toolName)
      const sensitivity = inferSensitivity(toolName, params)
      const undoable = toolName !== 'deleteDriveFile'
      const preview = buildPreview(toolName, params, message)
      emitPipelineEventExternal?.({
        type: 'pending-confirmation',
        confirmationId,
        toolName,
        message,
        params: sanitizeParams(params),
        category,
        sensitivity,
        undoable,
        preview,
        timestamp: new Date().toISOString()
      })
    } catch {}

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
      try { emitPipelineEventExternal?.({ type: 'confirmation-resolved', confirmationId, approved: true, toolName: pending.toolName, timestamp: new Date().toISOString() }) } catch {}
      return { 
        success: true, 
        result,
        message: `✅ ${pending.toolName} executed successfully`
      }
    } else {
      console.log(`[CONFIRMATION] User cancelled ${pending.toolName}`)
      const cancelError = new Error(`User cancelled ${pending.toolName}`)
      pending.reject(cancelError)
      try { emitPipelineEventExternal?.({ type: 'confirmation-resolved', confirmationId, approved: false, toolName: pending.toolName, timestamp: new Date().toISOString() }) } catch {}
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

function sanitizeParams(obj: any) {
  try {
    const clone: Record<string, any> = {}
    for (const k of Object.keys(obj || {})) {
      const v = obj[k]
      if (typeof v === 'string') {
        clone[k] = v.length > 400 ? v.slice(0, 400) + '…' : v
      } else {
        clone[k] = v
      }
    }
    return clone
  } catch {
    return {}
  }
}

// --- Metadata helpers for enriched confirmation events ---
function inferCategory(toolName: string): string {
  if (toolName.includes('Calendar')) return 'calendarActions'
  if (toolName.includes('Gmail') || toolName.includes('Email')) return 'emailActions'
  if (toolName.toLowerCase().includes('drive') || toolName.toLowerCase().includes('file')) return 'fileActions'
  if (toolName.toLowerCase().includes('tweet')) return 'socialActions'
  return 'dataModification'
}

function inferSensitivity(toolName: string, params: any): 'low'|'medium'|'high'|'critical' {
  if (toolName === 'deleteDriveFile') return 'high'
  if (toolName === 'sendGmailMessage' || toolName === 'postTweet') return 'medium'
  if (toolName === 'createCalendarEvent') return 'low'
  return 'medium'
}

function buildPreview(toolName: string, params: any, message: string) {
  // Simple structured preview used by richer UI component
  const details: Array<{ label: string; value: string; type?: string }> = []
  if (toolName === 'createCalendarEvent') {
    details.push({ label: 'Title', value: String(params.summary || '') })
    details.push({ label: 'Start', value: String(params.startDateTime || '') })
    details.push({ label: 'End', value: String(params.endDateTime || '') })
    if (params.location) details.push({ label: 'Location', value: String(params.location) })
  } else if (toolName === 'sendGmailMessage') {
    details.push({ label: 'To', value: String(params.to || ''), type: 'email' })
    details.push({ label: 'Subject', value: String(params.subject || '') })
  } else if (toolName === 'postTweet') {
    details.push({ label: 'Text', value: String(params.text || '') })
  } else if (toolName === 'uploadToDrive' || toolName === 'createDriveFile') {
    details.push({ label: 'File', value: String(params.name || params.filename || '') })
    if (params.parentId) details.push({ label: 'Folder', value: String(params.parentId) })
  } else if (toolName === 'deleteDriveFile') {
    details.push({ label: 'File ID', value: String(params.fileId || '') })
  }

  return {
    title: `Confirm ${toolName}`,
    summary: message.split('\n')[0] || message,
    description: message,
    details,
    warnings: toolName === 'deleteDriveFile' ? ['This action is irreversible'] : [],
  }
}
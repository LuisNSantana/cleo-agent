// TEST-ONLY: Expose pending confirmation IDs for testing
export function __getLatestPendingConfirmationIdForTest(): string | undefined {
  // Return the most recently added confirmation ID, or undefined
  const keys = Array.from(pendingConfirmations.keys())
  return keys.length ? keys[keys.length - 1] : undefined
}
/**
 * 🛡️ Unified Tool Confirmation System
 * Single source of truth - like ChatGPT, Claude, Perplexity
 * 
 * Flow: Tool → Request Confirmation → Modal → User Decision → Execute/Cancel
 */

// SINGLE list of tools requiring confirmation
export const CONFIRMATION_REQUIRED_TOOLS = [
  'createCalendarEvent',
  'sendGmailMessage', 
  'postTweet',
  'uploadToDrive',
  'createDriveFile',
  'deleteDriveFile'
] as const

// SINGLE type for tool names
export type ConfirmationTool = typeof CONFIRMATION_REQUIRED_TOOLS[number]

// SINGLE confirmation state interface
export interface ConfirmationRequest {
  id: string
  toolName: string
  params: any
  message: string
  timestamp: number
  resolve: (result: any) => void
  reject: (error: any) => void
  executeFunction: () => Promise<any>
}

// SINGLE pending confirmations store — keep in globalThis to survive module reloads and serverless instance nuances
const globalAny = globalThis as any
if (!globalAny.__pendingConfirmations) {
  globalAny.__pendingConfirmations = new Map<string, ConfirmationRequest>()
}
const pendingConfirmations: Map<string, ConfirmationRequest> = globalAny.__pendingConfirmations

// Cleanup old confirmations (2 minute timeout to prevent long running loops)
const confirmationCleanupInterval = setInterval(() => {
  const now = Date.now()
  const timeout = 2 * 60 * 1000 // Reduced from 5 to 2 minutes
  
  for (const [id, confirmation] of pendingConfirmations.entries()) {
    if (now - confirmation.timestamp > timeout) {
      console.log(`⏰ [CONFIRMATION] Timing out confirmation: ${id} (${confirmation.toolName}) after ${Math.round((now - confirmation.timestamp) / 1000)}s`)
      confirmation.reject(new Error('Confirmation timeout'))
      pendingConfirmations.delete(id)
    }
  }
}, 60000)

// TEST-ONLY: Cleanup function to clear the interval in tests
export function __clearConfirmationIntervalForTest() {
  clearInterval(confirmationCleanupInterval)
}

/**
 * Check if tool needs confirmation
 */
export function needsConfirmation(toolName: string): boolean {
  return CONFIRMATION_REQUIRED_TOOLS.includes(toolName as ConfirmationTool)
}

/**
 * Generate confirmation message - like Perplexity style
 */
export function generateConfirmationMessage(toolName: string, params: any): string {
  switch (toolName) {
    case 'createCalendarEvent':
      return `🗓️ **Create Calendar Event**
**Title:** ${params.title}
**Date:** ${params.date || params.startTime}
**Duration:** ${params.duration || 'Not specified'}
**Attendees:** ${params.attendees?.join(', ') || 'None'}`

    case 'sendGmailMessage':
      return `📧 **Send Email**
**To:** ${params.to?.join(', ')}
**Subject:** ${params.subject}
**Preview:** ${(params.text || params.html || '').slice(0, 100)}...`

    case 'postTweet':
      return `🐦 **Post Tweet**
**Content:** ${params.text}
**Characters:** ${params.text?.length || 0}/280`

    case 'uploadToDrive':
      return `📁 **Upload to Google Drive**
**Filename:** ${params.name}
**Location:** ${params.folderId || 'Root folder'}
**Size:** ${params.content?.length || 'Unknown'} characters`

    default:
      return `🔧 **Execute ${toolName}**
Please confirm this action.`
  }
}

/**
 * MAIN FUNCTION: Block execution and request confirmation
 * This is the ONLY entry point for confirmations
 */
export async function requestConfirmation<T>(
  toolName: string,
  params: any,
  executeFunction: () => Promise<T>
): Promise<T> {
  // If tool doesn't need confirmation, execute directly
  if (!needsConfirmation(toolName)) {
    return executeFunction()
  }

  // Generate unique confirmation ID
  const confirmationId = `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Generate user-friendly message
  const message = generateConfirmationMessage(toolName, params)

  console.log(`🛡️ [CONFIRMATION] Requesting confirmation for ${toolName}: ${confirmationId}`)

  // Create Promise that resolves when user confirms/rejects
  return new Promise<T>((resolve, reject) => {
    pendingConfirmations.set(confirmationId, {
      id: confirmationId,
      toolName,
      params,
      message,
      timestamp: Date.now(),
      resolve,
      reject,
      executeFunction
    })

    console.log(`🛡️ [CONFIRMATION] Waiting for user confirmation: ${confirmationId}`)
  })
}

/**
 * Resolve a pending confirmation (for API routes)
 */
export async function resolveConfirmation(
  confirmationId: string, 
  approved: boolean
): Promise<{ 
  success: boolean; 
  result?: any; 
  message?: string; 
  executed?: boolean; 
  approved?: boolean; 
  actionId?: string 
}> {
  const confirmation = pendingConfirmations.get(confirmationId)
  
  if (!confirmation) {
    return { 
      success: false, 
      message: 'Confirmation not found or already processed' 
    }
  }

  // Remove from pending immediately to prevent duplicate processing
  pendingConfirmations.delete(confirmationId)

  try {
    if (approved) {
      console.log(`✅ [CONFIRMATION] User approved ${confirmation.toolName} (${confirmationId})`)
      
      const result = await confirmation.executeFunction()
      confirmation.resolve(result)
      
      return { 
        success: true, 
        result,
        message: `✅ ${confirmation.toolName} executed successfully`,
        executed: true,
        approved: true
      }
    } else {
      console.log(`❌ [CONFIRMATION] User rejected ${confirmation.toolName} (${confirmationId})`)
      
      const rejectionError = new Error(`User rejected ${confirmation.toolName}`)
      confirmation.reject(rejectionError)
      
      return { 
        success: true, 
        message: `❌ ${confirmation.toolName} cancelled by user`,
        executed: false,
        approved: false
      }
    }
  } catch (error) {
    console.error(`❌ [CONFIRMATION] Execution failed for ${confirmation.toolName}:`, error)
    confirmation.reject(error)
    
    return { 
      success: false, 
      message: `Error executing ${confirmation.toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executed: false,
      approved: true
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
    message: data.message,
    timestamp: data.timestamp
  }))
}

// Small helper for other modules needing direct access (SSR/API)
export function __getPendingConfirmationsMap() {
  return pendingConfirmations
}

// Legacy compatibility - will be removed
export const blockForConfirmation = requestConfirmation
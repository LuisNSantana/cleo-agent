/**
 * 🛡️ Simple Tool Confirmation Wrapper
 * Based on ChatGPT pattern: preview → approve/reject → execute
 */

import { requiresConfirmation, generateToolPreview, type ToolPreview, type ConfirmationResponse } from './simple'
import { TOOL_SENSITIVITY_MAP, ALWAYS_CONFIRM_TOOLS, SAFE_AUTO_TOOLS, type PendingAction } from './types'

// Special response type for tools that need confirmation
export interface ToolConfirmationResult {
  needsConfirmation: true
  preview: ToolPreview
  confirmationId: string
  // Full pending action metadata so the client can render rich UI without a separate in-memory store
  pendingAction: PendingAction
  // Optional message for the model to display
  message?: string
}

// Regular tool response
export interface ToolExecutionResult {
  needsConfirmation: false
  [key: string]: any
}

export type ToolResponse = ToolConfirmationResult | ToolExecutionResult

// Storage for pending confirmations (simple in-memory for demo)
const pendingConfirmations = new Map<string, {
  toolName: string
  parameters: Record<string, any>
  executeFunction: () => Promise<any>
}>()

function computeSensitivity(toolName: string): 'low' | 'medium' | 'high' | 'critical' {
  if (ALWAYS_CONFIRM_TOOLS.includes(toolName)) return 'critical'
  if (SAFE_AUTO_TOOLS.includes(toolName)) return 'low'
  const category = TOOL_SENSITIVITY_MAP[toolName]
  switch (category) {
    case 'financeActions': return 'critical'
    case 'fileActions':
    case 'dataModification': return 'high'
    case 'emailActions':
    case 'calendarActions':
    case 'socialActions': return 'medium'
    default: return 'medium'
  }
}

function isUndoable(toolName: string): boolean {
  // TEMPORARILY EMPTY - System being refined for production
  const undoableTools: string[] = [
    // All tools disabled until confirmation system is fully polished
    // 'sendGmailMessage',
    // 'createCalendarEvent',
    // 'postTweet',
    // 'sendSlackMessage'
  ]
  return undoableTools.includes(toolName)
}

function buildPendingAction(toolName: string, parameters: Record<string, any>, preview: ToolPreview, confirmationId: string): PendingAction {
  return {
    id: confirmationId, // reuse confirmation id so client can map 1:1
    toolName,
    params: parameters, // Use 'params' instead of 'parameters'
    category: TOOL_SENSITIVITY_MAP[toolName] || 'dataModification',
    sensitivity: computeSensitivity(toolName),
    undoable: isUndoable(toolName),
    preview: {
      title: preview.title || toolName,
      summary: preview.summary,
      // Derive details from raw parameters since simple preview shape doesn't have structured details
      details: Object.entries(parameters).slice(0, 10).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value).slice(0, 200) : String(value)
      })),
      warnings: preview.warnings || [],
    },
    timestamp: Date.now(),
  }
}

/**
 * Wrap critical tools to show confirmation first
 * Usage: return await withConfirmation('toolName', params, () => actualExecution())
 */
export async function withConfirmation<T>(
  toolName: string,
  parameters: Record<string, any>,
  executeFunction: () => Promise<T>
): Promise<ToolResponse | T> {
  
  // Check if this tool needs confirmation
  if (!requiresConfirmation(toolName)) {
    // Execute immediately for non-critical tools
    return executeFunction()
  }
  
  // Critical tool: return confirmation preview instead of executing
  const confirmationId = `conf_${toolName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const preview = generateToolPreview(toolName, parameters)
  
  // Store the execution function for later
  pendingConfirmations.set(confirmationId, {
    toolName,
    parameters,
    executeFunction
  })

  const pendingAction = buildPendingAction(toolName, parameters, preview, confirmationId)
  
  console.log(`[TOOL CONFIRMATION] Stored pending confirmation ${confirmationId} for ${toolName}`)
  
  // Return a special message that includes the confirmation data
  // This will be displayed by the model and detected by the frontend
  return {
    needsConfirmation: true,
    confirmationId,
    preview,
    pendingAction,
    // Also include a text message for the model to display
    message: `🔒 **Action requires confirmation**

I need your permission to execute: **${preview.title}**

${preview.description}

${preview.warnings && preview.warnings.length > 0 ? 
  `⚠️ **Warnings:**\n${preview.warnings.map(w => `• ${w}`).join('\n')}\n` : ''}

Please review the action details above and choose to approve or cancel this operation.`
  }
}

/**
 * Execute a previously confirmed tool
 */
export async function executeConfirmedTool(confirmationId: string, response: ConfirmationResponse): Promise<any> {
  const pending = pendingConfirmations.get(confirmationId)
  
  if (!pending) {
    throw new Error('Confirmation not found or expired')
  }

  // Remove from pending
  pendingConfirmations.delete(confirmationId)

  if (!response.approved) {
    return {
      success: false,
      message: 'Action cancelled by user',
      cancelled: true
    }
  }

  // If the tool is a delegation tool, inject userId into parameters if available
  if (pending.toolName && pending.toolName.startsWith('delegate_to_') && (response as any).userId) {
    // Patch the parameters object to include userId
    pending.parameters.userId = (response as any).userId
  }

  // Execute the function
  try {
    return await pending.executeFunction()
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Execution failed',
      error: true
    }
  }
}

/**
 * Check if a response is a confirmation request
 */
export function isConfirmationRequest(response: any): response is ToolConfirmationResult {
  return response && response.needsConfirmation === true && response.preview && response.confirmationId
}
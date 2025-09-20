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
  return [
    'sendGmailMessage',
    'createCalendarEvent',
    'postTweet',
    'sendSlackMessage'
  ].includes(toolName)
}

function buildPendingAction(toolName: string, parameters: Record<string, any>, preview: ToolPreview, confirmationId: string): PendingAction {
  return {
    id: confirmationId, // reuse confirmation id so client can map 1:1
    toolName,
    parameters,
  description: preview.description,
    category: TOOL_SENSITIVITY_MAP[toolName] || 'dataModification',
    sensitivity: computeSensitivity(toolName),
    undoable: isUndoable(toolName),
    preview: {
      title: preview.title,
      summary: preview.description,
      // Derive details from raw parameters since simple preview shape doesn't have structured details
      details: Object.entries(parameters).slice(0, 10).map(([key, value]) => ({
        label: key,
        value: typeof value === 'object' ? JSON.stringify(value).slice(0, 200) : String(value),
        type: Array.isArray(value) ? 'list' : 'text'
      })),
      warnings: preview.warnings,
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
  
  // Return confirmation request
  return {
    needsConfirmation: true,
    preview,
    confirmationId,
    pendingAction,
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
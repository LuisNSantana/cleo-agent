/**
 * 🛡️ Simple Tool Confirmation Wrapper
 * Based on ChatGPT pattern: preview → approve/reject → execute
 */

import { requiresConfirmation, generateToolPreview, type ToolPreview, type ConfirmationResponse } from './simple'

// Special response type for tools that need confirmation
export interface ToolConfirmationResult {
  needsConfirmation: true
  preview: ToolPreview
  confirmationId: string
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
  
  // Return confirmation request
  return {
    needsConfirmation: true,
    preview,
    confirmationId
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
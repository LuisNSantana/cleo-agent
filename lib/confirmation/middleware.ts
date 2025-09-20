/**
 * 🔍 Tool Confirmation Middleware
 * Intercepts sensitive tools to show preview before execution
 */

import { 
  ToolExecutionSettings, 
  PendingAction, 
  ConfirmationResult,
  TOOL_SENSITIVITY_MAP, 
  ALWAYS_CONFIRM_TOOLS, 
  SAFE_AUTO_TOOLS,
  DEFAULT_TOOL_SETTINGS
} from './types'

// Global store for confirmation state
class ConfirmationStore {
  private settings: ToolExecutionSettings = DEFAULT_TOOL_SETTINGS
  private pendingAction: PendingAction | null = null
  private sessionPreferences: Record<string, 'approve' | 'reject'> = {}
  private bulkApprovals: Set<string> = new Set()
  private confirmationCallbacks: Map<string, (result: ConfirmationResult) => void> = new Map()

  // Configure user settings
  updateSettings(newSettings: Partial<ToolExecutionSettings>) {
    this.settings = { ...this.settings, ...newSettings }
  }

  getSettings(): ToolExecutionSettings {
    return this.settings
  }

  // Check if a tool needs confirmation
  needsConfirmation(toolName: string): boolean {
    // Always safe tools
    if (SAFE_AUTO_TOOLS.includes(toolName)) {
      return false
    }

    // Tools that always require confirmation
    if (ALWAYS_CONFIRM_TOOLS.includes(toolName)) {
      return true
    }

    // Check if in bulk approval
    if (this.bulkApprovals.has(toolName)) {
      return false
    }

    // Check session preference
    if (this.sessionPreferences[toolName] === 'approve') {
      return false
    }

    // Check category configuration
    const category = TOOL_SENSITIVITY_MAP[toolName]
    if (category) {
      const categoryMode = this.settings[category]
      
      if (categoryMode === 'always_confirm') return true
      if (categoryMode === 'auto') return false
      // 'inherit' usa el modo por defecto
    }

    // Usar modo por defecto
    return this.settings.defaultMode === 'preventive' || this.settings.defaultMode === 'hybrid'
  }

  // Create pending action
  createPendingAction(toolName: string, parameters: Record<string, any>): PendingAction {
    const preview = this.generateToolPreview(toolName, parameters)
    const sensitivity = this.getToolSensitivity(toolName)
    
    const action: PendingAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      toolName,
      parameters,
      description: preview.summary,
      category: TOOL_SENSITIVITY_MAP[toolName] || 'dataModification',
      sensitivity,
      undoable: this.isToolUndoable(toolName),
      preview,
      timestamp: Date.now()
    }

    this.pendingAction = action
    return action
  }

  // Generate specific preview for each tool type
  private generateToolPreview(toolName: string, params: Record<string, any>) {
    switch (toolName) {
      case 'sendGmailMessage':
        return {
          title: '📧 Send Email',
          summary: `Send email to ${Array.isArray(params.to) ? params.to.join(', ') : params.to}`,
          details: [
            { label: 'To', value: Array.isArray(params.to) ? params.to : [params.to], type: 'email' as const },
            { label: 'Subject', value: params.subject || '(No subject)', type: 'text' as const },
            { label: 'Message', value: params.text || params.html || '(Empty)', type: 'text' as const },
            ...(params.cc ? [{ label: 'CC', value: Array.isArray(params.cc) ? params.cc : [params.cc], type: 'email' as const }] : []),
            ...(params.bcc ? [{ label: 'BCC', value: Array.isArray(params.bcc) ? params.bcc : [params.bcc], type: 'email' as const }] : [])
          ],
          warnings: params.bcc?.length > 0 ? ['This email includes hidden copy recipients (BCC)'] : undefined
        }

      case 'createCalendarEvent':
        return {
          title: '📅 Create Event',
          summary: `Create event "${params.summary}" on ${new Date(params.startDateTime).toLocaleDateString()}`,
          details: [
            { label: 'Title', value: params.summary, type: 'text' as const },
            { label: 'Date & Time', value: `${new Date(params.startDateTime).toLocaleString()} - ${new Date(params.endDateTime).toLocaleString()}`, type: 'date' as const },
            ...(params.description ? [{ label: 'Description', value: params.description, type: 'text' as const }] : []),
            ...(params.location ? [{ label: 'Location', value: params.location, type: 'text' as const }] : []),
            ...(params.attendees ? [{ label: 'Attendees', value: params.attendees, type: 'email' as const }] : [])
          ],
          warnings: params.attendees?.length > 0 ? ['Invitations will be sent to all participants'] : undefined
        }

      case 'deleteFile':
        return {
          title: '🗑️ Delete File',
          summary: `Delete file "${params.fileName || params.path}"`,
          details: [
            { label: 'File', value: params.fileName || params.path, type: 'text' as const },
            { label: 'Location', value: params.path || 'Not specified', type: 'text' as const }
          ],
          warnings: ['This action cannot be undone', 'The file will be permanently deleted']
        }

      default:
        // Generic preview for tools not specifically handled
        const paramEntries = Object.entries(params).slice(0, 5) // Limit to 5 parameters
        return {
          title: `🔧 ${toolName}`,
          summary: `Execute tool: ${toolName}`,
          details: paramEntries.map(([key, value]) => ({
            label: key,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            type: 'text' as const
          })),
          warnings: ['Review parameters before continuing']
        }
    }
  }

  private getToolSensitivity(toolName: string): 'low' | 'medium' | 'high' | 'critical' {
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

  private isToolUndoable(toolName: string): boolean {
    const undoableTools = [
      'sendGmailMessage', // Can send correction
      'createCalendarEvent', // Se puede cancelar/editar
      'postTweet', // Can be deleted (if recent)
      'sendSlackMessage' // Can be edited/deleted
    ]
    return undoableTools.includes(toolName)
  }

  // Wait for user confirmation
  async waitForConfirmation(actionId: string): Promise<ConfirmationResult> {
    return new Promise((resolve) => {
      this.confirmationCallbacks.set(actionId, resolve)
      
      // Timeout if configured
      if (this.settings.confirmationTimeout > 0) {
        setTimeout(() => {
          if (this.confirmationCallbacks.has(actionId)) {
            this.confirmationCallbacks.delete(actionId)
            resolve({ action: 'timeout' })
          }
        }, this.settings.confirmationTimeout * 1000)
      }
    })
  }

  // Resolve confirmation
  resolveConfirmation(actionId: string, result: ConfirmationResult) {
    const callback = this.confirmationCallbacks.get(actionId)
    if (callback) {
      this.confirmationCallbacks.delete(actionId)
      
      // Recordar preferencia si se solicita
      if (result.rememberChoice && this.pendingAction) {
        this.sessionPreferences[this.pendingAction.toolName] = result.action === 'approve' ? 'approve' : 'reject'
      }
      
      // Aprobar en bulk si se solicita
      if (result.bulkApproval && this.pendingAction) {
        this.bulkApprovals.add(this.pendingAction.toolName)
      }
      
      callback(result)
    }
    
    this.pendingAction = null
  }

  // Get current pending action
  getPendingAction(): PendingAction | null {
    return this.pendingAction
  }

  // Clear session state
  clearSession() {
    this.sessionPreferences = {}
    this.bulkApprovals.clear()
    this.pendingAction = null
    this.confirmationCallbacks.clear()
  }
}

// Global store instance
export const confirmationStore = new ConfirmationStore()

// Hook to intercept tool calls
export async function interceptToolCall<T>(
  toolName: string, 
  parameters: Record<string, any>, 
  executeFunction: () => Promise<T>
): Promise<T> {
  // Check if needs confirmation
  if (!confirmationStore.needsConfirmation(toolName)) {
    return executeFunction()
  }

  // Create pending action
  const pendingAction = confirmationStore.createPendingAction(toolName, parameters)
  
  console.log(`🔄 Waiting for confirmation: ${toolName}`, pendingAction)
  
  // Wait for user decision
  const result = await confirmationStore.waitForConfirmation(pendingAction.id)
  
  switch (result.action) {
    case 'approve':
      // Use modified parameters if they exist
      if (result.modifiedParameters) {
        return executeFunction()
      }
      return executeFunction()
      
    case 'reject':
      throw new Error(`Action cancelled by user: ${toolName}`)
      
    case 'timeout':
      throw new Error(`Timeout waiting for confirmation: ${toolName}`)
      
    case 'edit':
      // Re-create action with modified parameters and execute
      if (result.modifiedParameters) {
        return executeFunction()
      }
      throw new Error(`Edit cancelled for: ${toolName}`)
      
    default:
      throw new Error(`Unknown confirmation result: ${result.action}`)
  }
}
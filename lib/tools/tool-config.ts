/**
 * Tool Configuration & Approval Settings
 * 
 * Centralizes which tools require human approval before execution.
 * Based on tool sensitivity and potential impact.
 */

import { ToolApprovalConfig } from '@/lib/agents/core/approval-handler'

/**
 * Tool approval configuration by tool name
 * 
 * Risk levels:
 * - low: Read-only operations (search, list, read)
 * - medium: Create/update operations (create event, upload file)
 * - high: Destructive operations (delete, send email with sensitive data)
 */
export const TOOL_APPROVAL_CONFIG: Record<string, ToolApprovalConfig> = {
  // ==========================================
  // HIGH RISK - Always require approval
  // ==========================================
  
  sendGmailMessage: {
    toolName: 'sendGmailMessage',
    requiresApproval: true,
    riskLevel: 'high',
    approvalMessage: '📧 ¿Enviar este correo electrónico?'
  },

  deleteGmailMessage: {
    toolName: 'deleteGmailMessage',
    requiresApproval: true,
    riskLevel: 'high',
    approvalMessage: '🗑️ ¿Eliminar este correo de forma permanente?'
  },

  // ==========================================
  // MEDIUM RISK - Require approval
  // ==========================================
  
  createCalendarEvent: {
    toolName: 'createCalendarEvent',
    requiresApproval: true,
    riskLevel: 'medium',
    approvalMessage: '📅 ¿Crear este evento en el calendario?'
  },

  updateCalendarEvent: {
    toolName: 'updateCalendarEvent',
    requiresApproval: true,
    riskLevel: 'medium',
    approvalMessage: '📅 ¿Modificar este evento del calendario?'
  },

  deleteCalendarEvent: {
    toolName: 'deleteCalendarEvent',
    requiresApproval: true,
    riskLevel: 'high',
    approvalMessage: '🗑️ ¿Eliminar este evento del calendario?'
  },

  uploadFileToDrive: {
    toolName: 'uploadFileToDrive',
    requiresApproval: true,
    riskLevel: 'medium',
    approvalMessage: '📁 ¿Subir este archivo a Google Drive?'
  },

  createDriveFolder: {
    toolName: 'createDriveFolder',
    requiresApproval: true,
    riskLevel: 'medium',
    approvalMessage: '📁 ¿Crear esta carpeta en Google Drive?'
  },

  createNotionPage: {
    toolName: 'createNotionPage',
    requiresApproval: true,
    riskLevel: 'medium',
    approvalMessage: '📝 ¿Crear esta página en Notion?'
  },

  updateNotionPage: {
    toolName: 'updateNotionPage',
    requiresApproval: true,
    riskLevel: 'medium',
    approvalMessage: '📝 ¿Actualizar esta página de Notion?'
  },

  // ==========================================
  // LOW RISK - No approval needed (read-only)
  // ==========================================
  
  searchGmail: {
    toolName: 'searchGmail',
    requiresApproval: false,
    riskLevel: 'low',
    approvalMessage: ''
  },

  readGmailMessage: {
    toolName: 'readGmailMessage',
    requiresApproval: false,
    riskLevel: 'low',
    approvalMessage: ''
  },

  listCalendarEvents: {
    toolName: 'listCalendarEvents',
    requiresApproval: false,
    riskLevel: 'low',
    approvalMessage: ''
  },

  searchDriveFiles: {
    toolName: 'searchDriveFiles',
    requiresApproval: false,
    riskLevel: 'low',
    approvalMessage: ''
  },

  readDriveFile: {
    toolName: 'readDriveFile',
    requiresApproval: false,
    riskLevel: 'low',
    approvalMessage: ''
  },

  queryNotionDatabase: {
    toolName: 'queryNotionDatabase',
    requiresApproval: false,
    riskLevel: 'low',
    approvalMessage: ''
  },

  readNotionPage: {
    toolName: 'readNotionPage',
    requiresApproval: false,
    riskLevel: 'low',
    approvalMessage: ''
  },

  webSearch: {
    toolName: 'webSearch',
    requiresApproval: false,
    riskLevel: 'low',
    approvalMessage: ''
  },

  scrapeWebpage: {
    toolName: 'scrapeWebpage',
    requiresApproval: false,
    riskLevel: 'low',
    approvalMessage: ''
  }
}

/**
 * Get approval config for a specific tool
 */
export function getToolApprovalConfig(toolName: string): ToolApprovalConfig | undefined {
  return TOOL_APPROVAL_CONFIG[toolName]
}

/**
 * Check if a tool requires approval
 */
export function requiresApproval(toolName: string): boolean {
  const config = TOOL_APPROVAL_CONFIG[toolName]
  return config?.requiresApproval ?? false
}

/**
 * Get all tools that require approval
 */
export function getSensitiveTools(): string[] {
  return Object.entries(TOOL_APPROVAL_CONFIG)
    .filter(([_, config]) => config.requiresApproval)
    .map(([toolName]) => toolName)
}

/**
 * Get tools by risk level
 */
export function getToolsByRiskLevel(riskLevel: 'low' | 'medium' | 'high'): string[] {
  return Object.entries(TOOL_APPROVAL_CONFIG)
    .filter(([_, config]) => config.riskLevel === riskLevel)
    .map(([toolName]) => toolName)
}

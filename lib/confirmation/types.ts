/**
 * 🛡️ Tool Confirmation System
 * Sistema de confirmación de herramientas para dar control al usuario
 */

// Modos de ejecución disponibles
export type ToolExecutionMode = 'preventive' | 'auto' | 'hybrid'

// Niveles de sensibilidad por acción
export type ActionSensitivity = 'always_confirm' | 'auto' | 'inherit'

// Configuración específica por tipo de herramienta
export interface ToolExecutionSettings {
  // Modo por defecto para todas las herramientas
  defaultMode: ToolExecutionMode
  
  // Configuraciones específicas por categoría de herramientas
  emailActions: ActionSensitivity      // sendGmailMessage
  calendarActions: ActionSensitivity   // createCalendarEvent
  fileActions: ActionSensitivity       // deleteFile, uploadFile
  dataModification: ActionSensitivity  // updateDatabase, modifyRecord
  socialActions: ActionSensitivity     // postTwitter, sendSlackMessage
  financeActions: ActionSensitivity    // createPayment, makeTransaction
  
  // Configuraciones avanzadas
  confirmationTimeout: number          // Segundos antes de auto-deny (0 = sin timeout)
  allowBulkActions: boolean           // Permitir múltiples acciones sin re-confirmación
  rememberPreferences: boolean        // Recordar decisiones del usuario por sesión
}

// Configuración por defecto (modo preventivo/seguro)
export const DEFAULT_TOOL_SETTINGS: ToolExecutionSettings = {
  defaultMode: 'preventive',
  emailActions: 'always_confirm',
  calendarActions: 'always_confirm', 
  fileActions: 'always_confirm',
  dataModification: 'always_confirm',
  socialActions: 'always_confirm',
  financeActions: 'always_confirm',
  confirmationTimeout: 60, // 1 minuto
  allowBulkActions: false,
  rememberPreferences: true
}

// Mapeo de herramientas a categorías de sensibilidad
export const TOOL_SENSITIVITY_MAP: Record<string, keyof Omit<ToolExecutionSettings, 'defaultMode' | 'confirmationTimeout' | 'allowBulkActions' | 'rememberPreferences'>> = {
  // Email tools
  'sendGmailMessage': 'emailActions',
  'sendOutlookMessage': 'emailActions',
  'replyToEmail': 'emailActions',
  
  // Calendar tools  
  'createCalendarEvent': 'calendarActions',
  'updateCalendarEvent': 'calendarActions',
  'deleteCalendarEvent': 'calendarActions',
  
  // File operations
  'deleteFile': 'fileActions',
  'uploadFile': 'fileActions',
  'shareFile': 'fileActions',
  'moveFile': 'fileActions',
  
  // Data modifications
  'updateDatabase': 'dataModification',
  'deleteRecord': 'dataModification',
  'modifySettings': 'dataModification',
  
  // Social/communication
  'postTweet': 'socialActions',
  'sendSlackMessage': 'socialActions',
  'publishPost': 'socialActions',
  
  // Financial
  'createPayment': 'financeActions',
  'makeTransaction': 'financeActions',
  'createInvoice': 'financeActions'
}

// Herramientas que SIEMPRE requieren confirmación (no se pueden desactivar)
export const ALWAYS_CONFIRM_TOOLS = [
  'deleteFile',
  'deleteRecord', 
  'makeTransaction',
  'createPayment',
  'deleteCalendarEvent',
  'createCalendarEvent',
  'sendGmailMessage',
  'postTweet'
]

// Herramientas que son seguras para auto-ejecución
export const SAFE_AUTO_TOOLS = [
  'searchWeb',
  'getWeather', 
  'readFile',
  'listFiles',
  'getCalendarEvents',
  'listGmailMessages',
  'getGmailMessage',
  'searchDocuments',
  'generateImage'
]

// Datos de preview para una acción pendiente
export interface PendingAction {
  id: string
  toolName: string
  parameters: Record<string, any>
  description: string
  category: string
  sensitivity: 'low' | 'medium' | 'high' | 'critical'
  estimatedDuration?: string
  undoable: boolean
  preview: {
    title: string
    summary: string
    details: Array<{
      label: string
      value: string | string[]
      type?: 'text' | 'email' | 'date' | 'list' | 'code'
    }>
    warnings?: string[]
  }
  timestamp: number
}

// Resultado de la confirmación del usuario
export interface ConfirmationResult {
  action: 'approve' | 'reject' | 'edit' | 'timeout'
  modifiedParameters?: Record<string, any>
  rememberChoice?: boolean
  bulkApproval?: boolean // Para aprobar todas las acciones similares en la sesión
}

// Estado del sistema de confirmación
export interface ConfirmationState {
  isWaitingForConfirmation: boolean
  pendingAction: PendingAction | null
  sessionPreferences: Record<string, 'approve' | 'reject'> // Decisiones recordadas por sesión
  bulkApprovals: Set<string> // Herramientas aprobadas en bulk para esta sesión
}
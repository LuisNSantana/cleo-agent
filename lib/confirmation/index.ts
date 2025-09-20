/**
 * 🛡️ Tool Confirmation System
 * Sistema completo de confirmación y preview para herramientas sensibles
 */

// Types and configuration
export * from './types'

// Core middleware and store
export * from './middleware'

// React components and hooks
export { default as ToolConfirmationDialog } from '@/components/common/tool-confirmation-dialog'
export { default as ToolExecutionSettingsPanel } from '@/components/common/tool-execution-settings'
export { ToolConfirmationProvider, useToolConfirmation } from '@/hooks/use-tool-confirmation'

// Re-export confirmationStore for convenience
export { confirmationStore } from './middleware'
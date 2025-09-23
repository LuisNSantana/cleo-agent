/**
 * 🛡️ Unified Confirmation System Components
 * All-in-one export for clean imports
 */

export { UnifiedConfirmationModal } from './unified-confirmation-modal'
export { InChatConfirmation, InChatConfirmationCompact } from './in-chat-confirmation'
export { 
  UnifiedConfirmationProvider, 
  useChatConfirmationIntegration,
  ChatMessageConfirmation 
} from './unified-confirmation-provider'

// Re-export the hook for convenience
export { useUnifiedConfirmation } from '@/hooks/use-unified-confirmation'

// Main component for easy integration
export { UnifiedConfirmationProvider as ConfirmationSystem } from './unified-confirmation-provider'
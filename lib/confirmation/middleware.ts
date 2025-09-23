// DEPRECATED: Legacy middleware for backward compatibility
// Use lib/confirmation/unified instead

import { DEFAULT_TOOL_SETTINGS, type ToolExecutionSettings } from './types'

export const confirmationStore = {
  subscribe: () => () => {},
  getState: () => ({ pendingAction: null }),
  setState: () => {},
  getSettings: () => DEFAULT_TOOL_SETTINGS,
  updateSettings: (settings: ToolExecutionSettings) => {},
  resolveConfirmation: (id: string, result: any) => {}
}

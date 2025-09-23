// DEPRECATED: Legacy middleware for backward compatibility
// Use lib/confirmation/unified instead

export const confirmationStore = {
  subscribe: () => () => {},
  getState: () => ({ pendingAction: null }),
  setState: () => {}
}

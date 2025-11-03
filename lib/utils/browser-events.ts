// Safe browser event emitter to keep UI in sync from server/client code
export function emitBrowserEvent(eventName: string, detail: any) {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      const event = new CustomEvent(eventName, { detail })
      window.dispatchEvent(event)
    }
  } catch (_) {
    // noop in SSR / non-browser contexts
  }
}

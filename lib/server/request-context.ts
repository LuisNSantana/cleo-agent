// NOTE: This module must be safe to import from client bundles indirectly.
// We therefore avoid a static import of 'async_hooks'; instead we conditionally require it on the server.
// In the browser we provide a minimal no-op shim so code can still call the helpers without crashing.

export type RequestContext = {
  userId?: string
  model?: string
  requestId?: string
}

const isServer = typeof globalThis === 'object' && !('window' in globalThis)

type ALS<T> = {
  run(ctx: T, fn: () => Promise<any> | any): any
  getStore(): T | undefined
}

let storage: ALS<RequestContext> | undefined

if (isServer) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AsyncLocalStorage } = require('async_hooks') as typeof import('async_hooks')
    storage = new AsyncLocalStorage<RequestContext>()
  } catch (e) {
    console.warn('[request-context] Failed to load async_hooks; falling back to in-memory shim', e)
  }
}

if (!storage) {
  // Fallback shim (client or server failure): retains last ctx only.
  let current: RequestContext | undefined
  storage = {
    run(ctx: RequestContext, fn: () => Promise<any> | any) {
      const prev = current
      current = { ...prev, ...ctx }
      try {
        return fn()
      } finally {
        current = prev // restore previous context to avoid leaking across calls
      }
    },
    getStore() { return current }
  }
}

export const __HAS_ALS = isServer && !!(storage as any)?._asyncLocalStorage

export function withRequestContext<T>(ctx: RequestContext, fn: () => Promise<T> | T) {
  return (storage as ALS<RequestContext>).run(ctx, fn)
}

export function getRequestContext(): RequestContext | undefined {
  return (storage as ALS<RequestContext>).getStore()
}

function warnOnce(kind: 'userId' | 'model' | 'requestId') {
  if (!isServer) return // avoid noisy client logs
  const key = `__warned_${kind}`
  const g = globalThis as any
  if (g[key]) return
  g[key] = true
  console.warn(`🚨 [SECURITY] getCurrent${kind[0].toUpperCase()}${kind.slice(1)} called without proper request context`)
}

export function getCurrentUserId(): string | undefined {
  const context = (storage as ALS<RequestContext>).getStore()
  if (!context?.userId) warnOnce('userId')
  return context?.userId
}

export function getCurrentModel(): string | undefined {
  const context = (storage as ALS<RequestContext>).getStore()
  if (!context?.model) warnOnce('model')
  return context?.model
}

export function getCurrentRequestId(): string | undefined {
  const context = (storage as ALS<RequestContext>).getStore()
  if (!context?.requestId) warnOnce('requestId')
  return context?.requestId
}

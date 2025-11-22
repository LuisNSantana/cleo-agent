// NOTE: This module must be safe to import from client bundles indirectly.
// We therefore avoid a static import of 'async_hooks'; instead we conditionally require it on the server.
// In the browser we provide a minimal no-op shim so code can still call the helpers without crashing.

export type RequestContext = {
  userId?: string
  model?: string
  requestId?: string
  locale?: 'en' | 'es' | 'fr' | 'de' // User's preferred language (browser-detected)
}

const isServer = typeof globalThis === 'object' && !('window' in globalThis)

type ALS<T> = {
  run(ctx: T, fn: () => Promise<any> | any): any
  getStore(): T | undefined
}

let storage: ALS<RequestContext> | undefined

if (isServer) {
  try {
    // Use eval to avoid static bundler resolution in client/edge builds
     
    const nodeRequire = eval('require') as NodeRequire
    const { AsyncLocalStorage } = nodeRequire('async_hooks') as typeof import('async_hooks')
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
  // Only warn in development to avoid noise in production logs
  if (process.env.NODE_ENV === 'development') {
    console.warn(`🚨 [SECURITY] getCurrent${kind[0].toUpperCase()}${kind.slice(1)} called without proper request context`)
  }
}

export function getCurrentUserId(): string | undefined {
  const context = (storage as ALS<RequestContext>).getStore()
  let uid = context?.userId
  if (!uid) {
    warnOnce('userId')
    try {
      const g: any = globalThis as any
      uid = g.__currentUserId || g.__cleoLastUserId || uid
    } catch {}
  }
  return uid
}

export function getCurrentModel(): string | undefined {
  const context = (storage as ALS<RequestContext>).getStore()
  let model = context?.model
  if (!model) {
    warnOnce('model')
    try {
      const g: any = globalThis as any
      model = g.__currentModel || model
    } catch {}
  }
  return model
}

export function getCurrentRequestId(): string | undefined {
  const context = (storage as ALS<RequestContext>).getStore()
  let rid = context?.requestId
  if (!rid) {
    warnOnce('requestId')
    try {
      const g: any = globalThis as any
      rid = g.__requestId || rid
    } catch {}
  }
  return rid
}

export function getCurrentUserLocale(): 'en' | 'es' | 'fr' | 'de' | undefined {
  const context = (storage as ALS<RequestContext>).getStore()
  let locale = context?.locale
  if (!locale) {
    try {
      const g: any = globalThis as any
      locale = g.__currentLocale || locale
    } catch {}
  }
  return locale
}



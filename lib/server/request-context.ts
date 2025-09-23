import { AsyncLocalStorage } from "async_hooks"

export type RequestContext = {
  userId?: string
  model?: string
  requestId?: string
}

const storage = new AsyncLocalStorage<RequestContext>()

export function withRequestContext<T>(ctx: RequestContext, fn: () => Promise<T> | T) {
  return storage.run(ctx, fn)
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore()
}

export function getCurrentUserId(): string | undefined {
  const context = storage.getStore()
  if (!context?.userId) {
    console.warn('🚨 [SECURITY] getCurrentUserId called without proper request context')
  }
  return context?.userId
}

export function getCurrentModel(): string | undefined {
  const context = storage.getStore()
  if (!context?.model) {
    console.warn('🚨 [SECURITY] getCurrentModel called without proper request context')
  }
  return context?.model
}

export function getCurrentRequestId(): string | undefined {
  const context = storage.getStore()
  if (!context?.requestId) {
    console.warn('🚨 [SECURITY] getCurrentRequestId called without proper request context')
  }
  return context?.requestId
}

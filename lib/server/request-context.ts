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
  return storage.getStore()?.userId || (globalThis as any).__currentUserId
}

export function getCurrentModel(): string | undefined {
  return storage.getStore()?.model || (globalThis as any).__currentModel
}

export function getCurrentRequestId(): string | undefined {
  return storage.getStore()?.requestId || (globalThis as any).__requestId
}

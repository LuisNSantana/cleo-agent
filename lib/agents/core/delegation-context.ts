/**
 * Delegation Context - Request-scoped state for delegation resolvers
 * 
 * Uses AsyncLocalStorage to ensure each request has isolated state,
 * preventing cross-user contamination in concurrent environments.
 */

import { AsyncLocalStorage } from 'async_hooks'

export interface DelegationResolver {
  resolve: (result: any) => void
  reject: (error: Error) => void
}

interface DelegationContextData {
  userId: string
  requestId: string
  resolvers: Map<string, DelegationResolver>
}

// AsyncLocalStorage for request-scoped delegation state
const delegationContext = new AsyncLocalStorage<DelegationContextData>()

/**
 * Run a function with delegation context (one per request)
 */
export function withDelegationContext<T>(
  userId: string,
  requestId: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const contextData: DelegationContextData = {
    userId,
    requestId,
    resolvers: new Map()
  }
  return delegationContext.run(contextData, fn)
}

/**
 * Get current delegation context (returns undefined if not in context)
 */
export function getDelegationContext(): DelegationContextData | undefined {
  return delegationContext.getStore()
}

/**
 * Register a resolver for a delegation key (scoped to current request)
 */
export function registerResolver(
  delegationKey: string,
  resolver: DelegationResolver
): void {
  const context = getDelegationContext()
  if (!context) {
    throw new Error('Cannot register resolver outside delegation context')
  }
  context.resolvers.set(delegationKey, resolver)
}

/**
 * Get a resolver for a delegation key (scoped to current request)
 */
export function getResolver(delegationKey: string): DelegationResolver | undefined {
  const context = getDelegationContext()
  if (!context) {
    return undefined
  }
  return context.resolvers.get(delegationKey)
}

/**
 * Remove a resolver (cleanup after resolution)
 */
export function deleteResolver(delegationKey: string): void {
  const context = getDelegationContext()
  if (context) {
    context.resolvers.delete(delegationKey)
  }
}

/**
 * Get all resolver keys (for debugging)
 */
export function getAllResolverKeys(): string[] {
  const context = getDelegationContext()
  if (!context) {
    return []
  }
  return Array.from(context.resolvers.keys())
}

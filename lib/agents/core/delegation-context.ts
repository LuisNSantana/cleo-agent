/**
 * Delegation Context - Request-scoped state for delegation resolvers
 * 
 * Uses AsyncLocalStorage to ensure each request has isolated state,
 * preventing cross-user contamination in concurrent environments.
 * 
 * CRITICAL: Also maintains a global Map for cross-async-context resolution.
 * When sub-agents complete in different async contexts, they can't access
 * AsyncLocalStorage from parent request. Global map ensures resolvers are
 * accessible from any execution context.
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

// CRITICAL: Global fallback Map for cross-async-context delegation resolution
// This ensures sub-agents completing in different async contexts can still
// resolve parent delegation promises
const globalResolvers = new Map<string, DelegationResolver>()

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
 * CRITICAL: Also stores in global map for cross-async-context access
 */
export function registerResolver(
  delegationKey: string,
  resolver: DelegationResolver
): void {
  const context = getDelegationContext()
  
  // Store in AsyncLocalStorage context if available
  if (context) {
    context.resolvers.set(delegationKey, resolver)
    console.log('[RESOLVER-DEBUG] ✅ Registered in AsyncLocalStorage:', delegationKey)
  } else {
    console.log('[RESOLVER-DEBUG] ⚠️ No AsyncLocalStorage context, only global map:', delegationKey)
  }
  
  // ALWAYS store in global map for cross-async-context resolution
  globalResolvers.set(delegationKey, resolver)
  console.log('[RESOLVER-DEBUG] ✅ Registered in global map:', delegationKey, 'Total global resolvers:', globalResolvers.size)
}

/**
 * Get a resolver for a delegation key (scoped to current request)
 * CRITICAL: Falls back to global map if not in AsyncLocalStorage context
 */
export function getResolver(delegationKey: string): DelegationResolver | undefined {
  const context = getDelegationContext()
  
  console.log('[RESOLVER-DEBUG] 🔍 Looking for resolver:', delegationKey)
  console.log('[RESOLVER-DEBUG] 🔍 Has AsyncLocalStorage context:', !!context)
  console.log('[RESOLVER-DEBUG] 🔍 Global map size:', globalResolvers.size)
  console.log('[RESOLVER-DEBUG] 🔍 Global map keys:', Array.from(globalResolvers.keys()))
  
  // Try AsyncLocalStorage context first
  if (context) {
    const resolver = context.resolvers.get(delegationKey)
    if (resolver) {
      console.log('[RESOLVER-DEBUG] ✅ Found in AsyncLocalStorage')
      return resolver
    }
    console.log('[RESOLVER-DEBUG] ❌ Not found in AsyncLocalStorage, checking global map')
  }
  
  // Fallback to global map (for cross-async-context resolution)
  const globalResolver = globalResolvers.get(delegationKey)
  if (globalResolver) {
    console.log('[RESOLVER-DEBUG] ✅ Found in global map')
  } else {
    console.log('[RESOLVER-DEBUG] ❌ Not found in global map either')
  }
  return globalResolver
}

/**
 * Remove a resolver (cleanup after resolution)
 * CRITICAL: Removes from both AsyncLocalStorage and global map
 */
export function deleteResolver(delegationKey: string): void {
  const context = getDelegationContext()
  
  // Remove from AsyncLocalStorage context if available
  if (context) {
    context.resolvers.delete(delegationKey)
  }
  
  // ALWAYS remove from global map
  globalResolvers.delete(delegationKey)
}

/**
 * Get all resolver keys (for debugging)
 * Returns keys from both AsyncLocalStorage context and global map
 */
export function getAllResolverKeys(): string[] {
  const context = getDelegationContext()
  const contextKeys = context ? Array.from(context.resolvers.keys()) : []
  const globalKeys = Array.from(globalResolvers.keys())
  
  // Combine and deduplicate
  return Array.from(new Set([...contextKeys, ...globalKeys]))
}

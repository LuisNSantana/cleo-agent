// Types for request context (avoid importing from server-only module)
type RequestContext = {
  userId?: string
  model?: string
  requestId?: string
}

const WRAPPED_FLAG = Symbol.for('cleo.tool.requestContextWrapped')

function generateFallbackRequestId() {
  return `tool_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function buildContextSnapshot(existing?: RequestContext | undefined): RequestContext {
  const globalAny = globalThis as any
  const snapshot: RequestContext = {
    userId: existing?.userId ?? (typeof globalAny.__currentUserId === 'string' ? globalAny.__currentUserId : undefined),
    model: existing?.model ?? (typeof globalAny.__currentModel === 'string' ? globalAny.__currentModel : undefined),
    requestId: existing?.requestId ?? (typeof globalAny.__requestId === 'string' ? globalAny.__requestId : undefined)
  }

  if (!snapshot.requestId) {
    snapshot.requestId = generateFallbackRequestId()
  }

  return snapshot
}

export function wrapToolExecuteWithRequestContext(toolName: string, toolDef: any) {
  if (!toolDef || typeof toolDef.execute !== 'function') {
    return toolDef
  }

  if (toolDef[WRAPPED_FLAG]) {
    return toolDef
  }

  const originalExecute = toolDef.execute.bind(toolDef)

  toolDef.execute = async function wrappedExecute(...args: any[]) {
    try {
      // Dynamic import to avoid build issues
      let existing: RequestContext | undefined
      let withRequestContext: any
      try {
        const serverContext = await import('../server/request-context')
        existing = serverContext.getRequestContext?.()
        withRequestContext = serverContext.withRequestContext
      } catch {}
      
      const snapshot = buildContextSnapshot(existing)
      const hasFullContext = Boolean(snapshot?.userId) && Boolean(snapshot?.model)

      if (hasFullContext || !withRequestContext) {
        // If we have full context or can't use withRequestContext, just execute directly
        return originalExecute(...args)
      }

      // Use snapshot as context for the run
      if (!snapshot?.userId || !snapshot?.model) {
        console.warn(`⚠️ [ContextGuard] Tool '${toolName}' executed with missing request context fields. Applying safeguarded context.`)
      }

      return withRequestContext(snapshot, () => originalExecute(...args))
    } catch (error) {
      console.error(`Error in wrapped tool execution for ${toolName}:`, error)
      // Fallback to direct execution on error
      return originalExecute(...args)
    }
  }

  Object.defineProperty(toolDef, WRAPPED_FLAG, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false
  })

  return toolDef
}

export function ensureToolsHaveRequestContext(toolsRegistry: Record<string, any>) {
  if (!toolsRegistry) return toolsRegistry
  for (const [name, toolDef] of Object.entries(toolsRegistry)) {
    wrapToolExecuteWithRequestContext(name, toolDef)
  }
  return toolsRegistry
}

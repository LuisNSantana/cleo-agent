import { RequestContext, getRequestContext, withRequestContext } from '../server/request-context'

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

  toolDef.execute = async (...args: any[]) => {
    const current = getRequestContext()
    const hasFullContext = Boolean(current?.userId) && Boolean(current?.model)

    if (hasFullContext) {
      return originalExecute(...args)
    }

    const contextForRun = buildContextSnapshot(current)

    if (!contextForRun.userId && !contextForRun.model) {
      if (!current?.requestId) {
        contextForRun.requestId = generateFallbackRequestId()
      }
      return withRequestContext({ ...current, requestId: contextForRun.requestId }, () => originalExecute(...args))
    }

    if (!current?.userId || !current?.model) {
      console.warn(`⚠️ [ContextGuard] Tool '${toolName}' executed with missing request context fields. Applying safeguarded context.`)
    }

    return withRequestContext({ ...contextForRun }, () => originalExecute(...args))
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

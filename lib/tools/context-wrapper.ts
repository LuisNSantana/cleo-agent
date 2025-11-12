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
      // Promote existing context to globals for nested async boundaries
      try {
        const g: any = globalThis as any
        if (existing?.userId) g.__currentUserId = existing.userId
        if (existing?.model) g.__currentModel = existing.model
        if (existing?.requestId) g.__requestId = existing.requestId
      } catch {}

      const snapshot = buildContextSnapshot(existing)
      const hasFullContext = Boolean(snapshot?.userId) && Boolean(snapshot?.model)

      if (hasFullContext || !withRequestContext) {
        // If we have full context or can't use withRequestContext, ensure globals then execute directly
        try {
          const g: any = globalThis as any
          if (snapshot.userId) g.__currentUserId = snapshot.userId
          if (snapshot.model) g.__currentModel = snapshot.model
          if (snapshot.requestId) g.__requestId = snapshot.requestId
        } catch {}
        // Pre-exec parameter normalization for certain tools
        try {
          const g: any = globalThis as any
          const lastUrl: string | undefined = g?.__lastAttachmentUrl
          if (args && args[0]) {
            const params = args[0]
            if (toolName === 'extract_text_from_pdf') {
              const provided = (params.url as string | undefined) || (params.pdfDataUrl as string | undefined)
              const looksTruncated = typeof provided === 'string' && provided.includes('[base64_encoded_pdf_content_from_attachment]')
              console.log('🔧 [PDF Tool] Normalizing parameters:', {
                toolName,
                hasLastUrl: !!lastUrl,
                lastUrlPreview: lastUrl?.slice(0, 100),
                provided: provided?.slice(0, 100),
                looksTruncated
              })
              if (!provided && lastUrl) {
                console.log('✅ [PDF Tool] Injecting lastAttachmentUrl as url parameter')
                params.url = lastUrl
                delete params.pdfDataUrl
              } else if (looksTruncated && lastUrl) {
                console.log('✅ [PDF Tool] Replacing truncated placeholder with lastAttachmentUrl')
                params.url = lastUrl
                delete params.pdfDataUrl
              } else if (provided && provided.startsWith('data:')) {
                console.warn('⚠️ [PDF Tool] data: URL provided - will likely fail. lastUrl available:', !!lastUrl)
                if (lastUrl && (lastUrl.startsWith('http://') || lastUrl.startsWith('https://'))) {
                  console.log('✅ [PDF Tool] Replacing data: URL with HTTP URL from lastAttachmentUrl')
                  params.url = lastUrl
                  delete params.pdfDataUrl
                }
              }
            }
            if (toolName === 'firecrawl_analyze_pdf') {
              const provided = (params.url as string | undefined)
              const looksLikeUrl = typeof provided === 'string' && /^https?:\/\//i.test(provided)
              if (!looksLikeUrl && lastUrl) {
                params.url = lastUrl
              }
            }
          }
        } catch {}
        return originalExecute(...args)
      }

      // Use snapshot as context for the run
      if (!snapshot?.userId || !snapshot?.model) {
        console.warn(`⚠️ [ContextGuard] Tool '${toolName}' executed with missing request context fields. Applying safeguarded context.`)
      }

      return withRequestContext(snapshot, () => {
        try {
          const g: any = globalThis as any
          if (snapshot.userId) g.__currentUserId = snapshot.userId
          if (snapshot.model) g.__currentModel = snapshot.model
          if (snapshot.requestId) g.__requestId = snapshot.requestId
        } catch {}
        // Pre-exec parameter normalization under withRequestContext
        try {
          const g: any = globalThis as any
          const lastUrl: string | undefined = g?.__lastAttachmentUrl
          if (args && args[0]) {
            const params = args[0]
            if (toolName === 'extract_text_from_pdf') {
              const provided = (params.url as string | undefined) || (params.pdfDataUrl as string | undefined)
              const looksTruncated = typeof provided === 'string' && provided.includes('[base64_encoded_pdf_content_from_attachment]')
              console.log('🔧 [PDF Tool] Normalizing parameters (with context):', {
                toolName,
                hasLastUrl: !!lastUrl,
                lastUrlPreview: lastUrl?.slice(0, 100),
                provided: provided?.slice(0, 100),
                looksTruncated
              })
              if (!provided && lastUrl) {
                console.log('✅ [PDF Tool] Injecting lastAttachmentUrl as url parameter')
                params.url = lastUrl
                delete params.pdfDataUrl
              } else if (looksTruncated && lastUrl) {
                console.log('✅ [PDF Tool] Replacing truncated placeholder with lastAttachmentUrl')
                params.url = lastUrl
                delete params.pdfDataUrl
              } else if (provided && provided.startsWith('data:')) {
                console.warn('⚠️ [PDF Tool] data: URL provided - will likely fail. lastUrl available:', !!lastUrl)
                if (lastUrl && (lastUrl.startsWith('http://') || lastUrl.startsWith('https://'))) {
                  console.log('✅ [PDF Tool] Replacing data: URL with HTTP URL from lastAttachmentUrl')
                  params.url = lastUrl
                  delete params.pdfDataUrl
                }
              }
            }
            if (toolName === 'firecrawl_analyze_pdf') {
              const provided = (params.url as string | undefined)
              const looksLikeUrl = typeof provided === 'string' && /^https?:\/\//i.test(provided)
              if (!looksLikeUrl && lastUrl) {
                params.url = lastUrl
              }
            }
          }
        } catch {}
        return originalExecute(...args)
      })
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

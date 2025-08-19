import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
// RAG prompt construction is now centralized in lib/chat/prompt
import { buildFinalSystemPrompt } from '@/lib/chat/prompt'
import { getAllModels } from "@/lib/models"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { tools } from "@/lib/tools"
import { filterImagesForModel, MODEL_IMAGE_LIMITS } from "@/lib/image-management"
import type { ProviderWithoutOllama } from "@/lib/user-keys"
import { stepCountIs, streamText } from "ai"
import type { CoreMessage } from "ai"
import { z } from "zod"
import { withRequestContext } from "@/lib/server/request-context"
import {
  incrementMessageCount,
  logUserMessage,
  storeAssistantMessage,
  validateAndTrackUsage,
} from "./api"
import { createErrorResponse } from "./utils"
import { ChatRequest, ChatRequestSchema } from "./schema"
import { convertUserMultimodalMessages } from "@/lib/chat/convert-messages"
import { filterImagesByModelLimit } from "@/lib/chat/image-filter"
import { makeStreamHandlers } from "@/lib/chat/stream-handlers"

// Ensure Node.js runtime so server env vars (e.g., GROQ_API_KEY) are available
export const runtime = "nodejs"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const parsed = ChatRequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }),
        { status: 400 }
      )
    }

    const {
      messages,
      chatId,
      userId,
      model,
      isAuthenticated,
      systemPrompt,
      enableSearch,
      message_group_id,
      documentId,
      debugRag,
    } = parsed.data as ChatRequest

  // Auto-enable RAG for personalized responses - always try to retrieve user context
  const autoRagEnabled = true
  const retrievalRequested = enableSearch || !!documentId || autoRagEnabled

    if (!messages || !chatId || !userId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    const supabase = await validateAndTrackUsage({
      userId,
      model,
      isAuthenticated,
    })

    // Increment message count for successful validation
    if (supabase) {
      await incrementMessageCount({ supabase, userId })
    }

    const userMessage = messages[messages.length - 1]

  if (supabase && userMessage?.role === "user") {
      // Process the content to create a clean summary for database storage
      let contentForDB = ""

      // Handle AI SDK v5 structure (parts) or legacy structure (content)
      if ((userMessage as any).parts && Array.isArray((userMessage as any).parts)) {
        // AI SDK v5 structure with parts
        const parts = (userMessage as any).parts
          .map((part: any) => {
            if (part.type === "text") {
              return part.text || ""
            } else if (part.type === "file") {
              const fileName = part.name || "archivo"
              const fileType = part.mimeType || part.mediaType || "unknown"

              if (fileType.startsWith("image/")) {
                return `[IMAGEN ADJUNTA: ${fileName}]`
              } else if (fileType === "application/pdf") {
                return `[PDF ADJUNTO: ${fileName}]`
              } else {
                return `[ARCHIVO ADJUNTO: ${fileName} (${fileType})]`
              }
            }
            return ""
          })
          .filter((part: string) => part !== "")
          .join("\n\n")
        
        contentForDB = parts || "Mensaje del usuario"
      } else if ((userMessage as any).content) {
        // Legacy structure with content
        const content = (userMessage as any).content
        
        if (typeof content === "string") {
          contentForDB = content
        } else if (Array.isArray(content)) {
          // Process multimodal content to create a summary without base64 data
          const parts = content
            .map((part: unknown) => {
              const typedPart = part as {
                type: string
                name?: string
                mediaType?: string
                text?: string
                content?: string
              }

              if (typedPart.type === "text") {
                return typedPart.text || typedPart.content || ""
              } else if (typedPart.type === "file") {
                const fileName = typedPart.name || "archivo"
                const fileType = typedPart.mediaType || "unknown"

                if (typedPart.mediaType?.startsWith("image/")) {
                  return `[IMAGEN ADJUNTA: ${fileName}]`
                } else if (typedPart.mediaType === "application/pdf") {
                  return `[PDF ADJUNTO: ${fileName}]`
                } else {
                  return `[ARCHIVO ADJUNTO: ${fileName} (${fileType})]`
                }
              }
              return ""
            })
            .filter((part) => part !== "")
            .join("\n\n")

          contentForDB = parts
        } else {
          contentForDB = JSON.stringify(content)
        }
      } else {
        contentForDB = "Mensaje del usuario"
      }

      await logUserMessage({
        supabase,
        userId,
        chatId,
        content: contentForDB,
        attachments: [],
        model,
        isAuthenticated,
        message_group_id,
      })
    }

    // Resolve model config and establish effective system prompt
    const allModels = await getAllModels()
    const modelConfig = allModels.find((m) => m.id === model)

    if (!modelConfig || !modelConfig.apiSdk) {
      throw new Error(`Model ${model} not found`)
    }

    // Use reasoning-optimized prompt for GPT-5 models when no custom prompt
    let baseSystemPrompt = systemPrompt || SYSTEM_PROMPT_DEFAULT
    if (model.startsWith('gpt-5') && !systemPrompt) {
      const { getCleoPrompt } = await import("@/lib/prompts")
      baseSystemPrompt = getCleoPrompt(model, 'reasoning')
      console.log(`[GPT-5] Using reasoning-optimized prompt for ${model}`)
    }
    const effectiveSystemPrompt = baseSystemPrompt

    // Attempt to parse personality type from system prompt for observability
    try {
      const match = effectiveSystemPrompt.match(/Type:\s*(empathetic|playful|professional|creative|analytical|friendly)/i)
      const inferredPersonality = match?.[1]?.toLowerCase()
      if (inferredPersonality) {
        console.log('[ChatAPI] Active personality', { userId, chatId, personalityType: inferredPersonality })
      } else {
        console.log('[ChatAPI] No personality marker found in system prompt; using default or custom prompt', { userId, chatId })
      }
    } catch (e) {
      console.log('[ChatAPI] Personality parse failed')
    }

    // Convert multimodal messages to correct format for the model
    let convertedMessages = await convertUserMultimodalMessages(
      messages,
      model,
      Boolean(modelConfig.vision)
    )

    // Log conversion summary and count images
    const convertedMultimodal = convertedMessages.filter((msg) =>
      Array.isArray(msg.content)
    )

    // Apply intelligent image filtering to prevent API errors
    const imageLimit = MODEL_IMAGE_LIMITS[model]?.maxImages || MODEL_IMAGE_LIMITS.default.maxImages

    // Intelligent image filtering by model limits
    const totalImages = convertedMessages.reduce(
      (acc, m) => acc + (Array.isArray(m.content) ? m.content.filter((p: any) => p.type === 'image').length : 0),
      0
    )
    console.log(`[IMAGE MGMT] Model ${model}: ${totalImages} images found, limit: ${imageLimit}`)
    if (totalImages > imageLimit) {
      convertedMessages = filterImagesByModelLimit(convertedMessages, model) as any
      console.log(`[IMAGE MGMT] Filtered to ${imageLimit} images with intelligent prioritization`)
    }

    if (convertedMultimodal.length > 0) {
      // reserved for future per-image diagnostics
    }

    // Resolve an API key for the selected provider. For unauthenticated users,
    // fall back to environment keys so models like OpenRouter work in demos.
    let apiKey: string | undefined
    {
      const { getEffectiveApiKey } = await import("@/lib/user-keys")
      const provider = getProviderForModel(model)
      const maybeKey = await getEffectiveApiKey(
        isAuthenticated && userId ? userId : null,
        provider as ProviderWithoutOllama
      )
      apiKey = maybeKey || undefined
      // Lightweight debug (no secrets): confirm whether a key was resolved
      if (provider === 'openrouter') {
        const hasKey = Boolean(apiKey || process.env.OPENROUTER_API_KEY)
        console.log('[ChatAPI] OpenRouter key present?', hasKey)
        if (!hasKey) {
          console.error('[ChatAPI] Missing OpenRouter API key. Set OPENROUTER_API_KEY in env or add a user key.')
        }
      }
    }

  // Inject userId and model into request-scoped context (and legacy globalThis for now)
  // Get the real Supabase user ID instead of the frontend userId
    let realUserId = userId
    if (supabase && isAuthenticated) {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (!userError && userData?.user) {
        realUserId = userData.user.id
        console.log('🔍 Using real Supabase user ID for tools:', realUserId)
      }
    }
  ;(globalThis as any).__currentUserId = realUserId
  ;(globalThis as any).__currentModel = model

      // Build final system prompt using centralized prompt builder (handles RAG, personalization, and search guidance)
      const { finalSystemPrompt, usedContext } = await buildFinalSystemPrompt({
        baseSystemPrompt: effectiveSystemPrompt,
        model,
        messages,
        supabase,
        realUserId,
        enableSearch,
        documentId,
        debugRag,
      })

      console.log('[RAG] Using context?', usedContext, 'Final system prompt length:', finalSystemPrompt.length)
      // Feature analytics: RAG retrieval used
      try {
        if (usedContext && supabase && realUserId) {
          const { trackFeatureUsage } = await import('@/lib/analytics')
          await trackFeatureUsage(realUserId, 'rag.retrieve', { delta: 1 })
        }
      } catch {}

  // Safe env diagnostics (no secrets)
    const hasGroqKey = !!process.env.GROQ_API_KEY
    if (!hasGroqKey) {
      console.warn('[Env] GROQ_API_KEY not found in process.env at /api/chat runtime')
    }

    // Attach a per-request id so tools (like webSearch) can throttle sanely per request
    let reqId: string
    try {
      reqId = crypto.randomUUID?.() ?? `r-${Date.now()}-${Math.random().toString(36).slice(2)}`
    } catch {
      reqId = `r-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }
    ;(globalThis as any).__requestId = reqId

  // Configure tools and provider options per model
    // For xAI (grok-3-mini), drop the generic webSearch tool; prefer native Live Search when user enables it
    let toolsForRun = tools as typeof tools
  let providerOptions: Record<string, any> | undefined
    let activeTools: string[] | undefined
  if (model === 'grok-3-mini') {
      try {
        const { webSearch, ...rest } = tools as any
        toolsForRun = rest
      } catch {
        toolsForRun = tools
      }
      // Restrict active tools to the filtered set, preventing accidental calls to removed tools
      activeTools = Object.keys(toolsForRun)
      // Configure xAI native Live Search based on UI toggle
      // - enableSearch true  -> mode 'auto' (model decides when to search)
      // - enableSearch false -> mode 'off'  (never search)
      providerOptions = {
        xai: {
          searchParameters: {
            mode: enableSearch ? 'auto' : 'off',
            returnCitations: enableSearch ? true : false,
          },
        },
      }
    }

  // Note: For OpenRouter we set headers on the provider itself in its model config
  // (lib/models/data/openrouter.ts). Do not inject them via providerOptions to avoid
  // leaking into the request body.

    // Prepare additional parameters for reasoning models
  const resultStart = Date.now()
  const { onError, onFinish } = makeStreamHandlers({
    supabase,
    chatId,
    message_group_id,
    model,
    realUserId,
    finalSystemPrompt,
    convertedMessages,
    resultStart,
  })

  const additionalParams: any = {
      // Pass only the provider-specific apiKey; let each SDK fall back to its own env var
      model: modelConfig.apiSdk(apiKey, { enableSearch }),
      system: finalSystemPrompt,
      messages: convertedMessages,
      tools: toolsForRun,
  ...(providerOptions ? { providerOptions } : {}),
  ...(activeTools ? { activeTools } : {}),
  // Avoid step cap when using xAI native Live Search to prevent early termination mid-search
  ...(!(model === 'grok-3-mini' && enableSearch) ? { stopWhen: stepCountIs(8) } : {}),
      onError,
      onFinish,
  }

    // Apply model-specific default params when available
    if (modelConfig.defaults) {
      const { temperature, topP, maxTokens } = modelConfig.defaults
      if (typeof temperature === 'number') (additionalParams as any).temperature = temperature
      if (typeof topP === 'number') (additionalParams as any).topP = topP
      if (typeof maxTokens === 'number') (additionalParams as any).maxTokens = maxTokens
    }
    
    // Check if user is asking to open/view a document - reduce reasoning to avoid content in reasoning
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content?.toString() || ''
    const isOpeningDocument = /abrir.*archivo|open.*document|mostrar.*documento|show.*document|ver.*archivo|view.*file|editar.*documento|work on.*doc/i.test(lastUserMessage)

    // Add reasoning effort for GPT-5 models with model-specific tuning
    if (model.startsWith('gpt-5')) {
      if (model === 'gpt-5-nano' || isOpeningDocument) {
        // For nano, or when opening documents, use minimal reasoning to avoid content in reasoning
        additionalParams.reasoning_effort = 'minimal' // Less reasoning overhead, more tool response focus
        console.log(`[GPT-5] Setting reasoning_effort to: minimal for ${model} ${isOpeningDocument ? '(document opening detected)' : '(nano optimization)'}`)
      } else {
        // For other GPT-5 models, keep medium
        additionalParams.reasoning_effort = 'medium' // Can be: minimal, low, medium, high
        console.log(`[GPT-5] Setting reasoning_effort to: medium for model ${model}`)
      }
    }

    if (providerOptions) {
      console.log('[ChatAPI] Provider options applied:', JSON.stringify(providerOptions))
    }

    // Record feature intent when search is enabled (non xAI live search)
    try {
      if (enableSearch && model !== 'grok-3-mini' && realUserId) {
        const { trackFeatureUsage } = await import('@/lib/analytics')
        await trackFeatureUsage(realUserId, 'feature.webSearch', { delta: 1 })
      }
    } catch {}

  const result = await withRequestContext({ userId: realUserId, model, requestId: reqId }, async () => {
    return streamText(additionalParams)
  })

    // For document opening queries, disable sending reasoning to prevent content in expandable
  // Hide reasoning to avoid exposing internal planning; UI can add toggles later if desired
  const sendReasoning = false

    return result.toUIMessageStreamResponse({
      sendReasoning, // Disable reasoning stream for doc opens to avoid content in expandable
  onError: (error: unknown) => {
        // Clean up global context on error
        delete (globalThis as any).__currentUserId
        delete (globalThis as any).__currentModel
        
        if (error instanceof Error) {
          if (
            error.message.includes("Rate limit") ||
            error.message.includes("Request too large")
          ) {
            return "El documento es demasiado grande para procesar completamente. Por favor:\n\n1. Usa un archivo PDF más pequeño (menos de 20 páginas)\n2. Usa un documento más pequeño\n3. O describe qué información específica necesitas del documento\n4. O proporciona capturas de pantalla de las secciones relevantes\n\nLos modelos Faster y Smarter pueden analizar imágenes directamente."
          }
          if (error.message.includes("tokens per minute")) {
            return "Has alcanzado el límite de tokens por minuto. El documento es muy largo. Espera un momento o usa un archivo más pequeño."
          }
        }
        console.error(error)
        return "Ocurrió un error procesando tu solicitud. Si subiste un archivo grande, intenta con uno más pequeño."
      },
  })
  } catch (err: unknown) {
    // Clean up global context on exception
    delete (globalThis as any).__currentUserId
    delete (globalThis as any).__currentModel
    
    console.error("Error in /api/chat:", err)
    const error = err as {
      code?: string
      message?: string
      statusCode?: number
    }

    return createErrorResponse(error)
  }
}
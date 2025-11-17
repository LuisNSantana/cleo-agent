// Core dependencies
import type { CoreMessage } from 'ai'
import { randomUUID } from 'crypto'
import '@/lib/suppress-warnings'

// Configuration and prompts
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/config'
import { buildFinalSystemPrompt } from '@/lib/chat/prompt'

// Models and providers
import { getAllModels, MODELS } from '@/lib/models'
import { resolveModelFromList } from '@/lib/models/resolve'
import { getProviderForModel, normalizeModelId } from '@/lib/openproviders/provider-map'
import type { ProviderWithoutOllama } from '@/lib/user-keys'

// Chat processing utilities
import { convertUserMultimodalMessages } from '@/lib/chat/convert-messages'
import { filterImagesByModelLimit } from '@/lib/chat/image-filter'
import { MODEL_IMAGE_LIMITS } from '@/lib/image-management'
import { sanitizeGeminiTools } from '@/lib/chat/gemini-tools'

// Tools and delegation
import { tools, ensureDelegationToolForAgent } from '@/lib/tools'
import { setPipelineEventController, clearPipelineEventController } from '@/lib/tools/delegation'

// Agent orchestration
import { getAgentOrchestrator } from '@/lib/agents/agent-orchestrator'
import { getGlobalOrchestrator as getCoreOrchestrator } from '@/lib/agents/core/orchestrator'
import { getRuntimeConfig } from '@/lib/agents/runtime-config'
import { getAgentDisplayName } from '@/lib/agents/id-canonicalization'

// Image generation
import { isImageGenerationModel } from '@/lib/image-generation/models'

// Context and storage
import { loadThreadContext } from '@/lib/context/smart-loader'
import type { LoadContextResult } from '@/lib/context/smart-loader'
import { createClient } from '@/lib/supabase/server'
import { dailyLimits } from '@/lib/daily-limits'
import { withRequestContext } from '@/lib/server/request-context'

// API utilities
import {
  incrementMessageCount,
  logUserMessage,
  storeAssistantMessage,
  validateAndTrackUsage,
} from './api'
import { createErrorResponse } from './utils'
import { ChatRequest, ChatRequestSchema } from './schema'

// ✅ Refactored services
import {
  chatLogger,
  imageGenerationService,
  authValidationService,
  delegationDetectionService,
  messageProcessorService,
} from '@/lib/chat/services'

// Ensure Node.js runtime so server env vars (e.g., GROQ_API_KEY) are available
export const runtime = 'nodejs'

// Increase max duration to avoid Vercel 60s timeouts during delegation, RAG, and tool-use
export const maxDuration = 300

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
      projectId,
      debugRag,
    } = parsed.data as ChatRequest

  // Delegation heuristic debug flag (can be toggled via query param in future)
  const debugDelegation = process.env.DEBUG_DELEGATION_INTENT === 'true'

  // Thread ID for RAG isolation - use chatId as the thread identifier
  let effectiveThreadId: string | null = chatId || null

  // Normalize model ID early and also keep original with prefix
  const originalModel = model
  let normalizedModel = normalizeModelId(model)
  
  chatLogger.setContext({ userId, chatId, model: normalizedModel })
  chatLogger.debug('Processing chat request', { 
    originalModel, 
    normalizedModel, 
    isAuthenticated 
  })

    if (!messages || !chatId || !userId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    const supabase = await validateAndTrackUsage({
      userId,
      model: originalModel,
      isAuthenticated,
    })

    // Increment message count for successful validation
    if (supabase) {
      await incrementMessageCount({ supabase, userId })
    }

    // Resolve authenticated user early and enforce authorization (prevents spoofed userId)
    let realUserId: string = userId
    if (supabase && isAuthenticated) {
      const authResult = await authValidationService.validateUser(userId, isAuthenticated, supabase)
      
      if (!authResult.success) {
        return new Response(JSON.stringify({ error: authResult.error || 'Unauthorized' }), { 
          status: 401 
        })
      }
      
      realUserId = authResult.userId
      chatLogger.setContext({ userId: realUserId })
    }

  const userMessage = messages[messages.length - 1]

    // Extract text content from user message for image generation detection
    const userMessageText = userMessage?.role === "user" 
      ? messageProcessorService.extractUserText(userMessage)
      : ""

  // 🎨 IMAGE GENERATION DETECTION
  const isImageModel = isImageGenerationModel(originalModel)

    // Expose last PDF attachment URL globally for tool parameter normalization (avoids giant base64)
    try {
      const anyUser = userMessage as any
      const atts = Array.isArray(anyUser?.experimental_attachments) ? anyUser.experimental_attachments : undefined
      chatLogger.debug('🔍 [PDF] Checking attachments', { 
        hasAtts: !!atts, 
        count: atts?.length,
        types: atts?.map((a: any) => a?.contentType)
      })
      const pdfAtt = atts?.find((a: any) => typeof a?.url === 'string' && (a?.contentType?.includes('pdf') || a?.url?.startsWith('http')))
      if (pdfAtt && typeof pdfAtt.url === 'string') {
        // Only use HTTP(S) URLs, not data URLs
        if (pdfAtt.url.startsWith('http://') || pdfAtt.url.startsWith('https://')) {
          ;(globalThis as any).__lastAttachmentUrl = pdfAtt.url
          chatLogger.info('✅ [PDF] Attachment detected for tool', { 
            url: pdfAtt.url.slice(0, 100),
            contentType: pdfAtt.contentType 
          })
        } else if (pdfAtt.url.startsWith('data:')) {
          chatLogger.warn('⚠️ [PDF] data: URL detected - this will fail extraction. Need http(s) URL')
          // Don't set the global URL for data URLs
        }
      } else {
        // Also scan multimodal parts for data URLs
        if (Array.isArray((anyUser as any)?.parts)) {
          const partPdf = (anyUser as any).parts.find((p: any) => p?.type === 'file' && (p?.mediaType?.includes('pdf') || (typeof p?.url === 'string' && p.url.startsWith('http'))))
          if (partPdf?.url && (partPdf.url.startsWith('http://') || partPdf.url.startsWith('https://'))) {
            ;(globalThis as any).__lastAttachmentUrl = partPdf.url
            chatLogger.info('✅ [PDF] Attachment detected in parts', { url: partPdf.url.slice(0, 100) })
          }
        }
      }
    } catch (e) {
      chatLogger.error('Error extracting PDF attachment', e as Error)
    }
    
    if (userMessageText && isImageModel) {
      chatLogger.info('Image generation model detected', { 
        prompt: userMessageText.slice(0, 50) 
      })

      try {
        // Call image generation service
        const imageResult = await imageGenerationService.generateImage(
          userMessageText, 
          isAuthenticated ? userId : undefined,
          isAuthenticated
        )

        if (imageResult.success && imageResult.result) {
          // Store a successful assistant message with the image result
          const assistantResponse = `Image generated! I created: "${imageResult.result.title}"\n\n![Generated Image](${imageResult.result.imageUrl})\n\n*${imageResult.result.description}*`
          
          if (supabase) {
            await storeAssistantMessage({
              supabase,
              userId,
              chatId,
                messages: [{
                  role: "assistant",
                  content: assistantResponse
                }],
                model: originalModel,
                inputTokens: userMessageText.length / 4, // Rough estimate
                outputTokens: assistantResponse.length / 4, // Rough estimate
                message_group_id,
              })
            }

            /**
             * IMPORTANT: Previously we returned a custom one-off JSON line with { type: 'image_generated' }.
             * The frontend (useChat from @ai-sdk/react) expects either:
             *   - Standard model text streaming chunks, OR
             *   - A final plain text response representing the assistant message.
             * Because we short‑circuit for image models, the UI never received a normal assistant message,
             * so the generated image markdown was never rendered. We now simply return the markdown
             * assistant response body so the hook appends it as a standard assistant message.
             */
            return new Response(assistantResponse, {
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
              }
            })
          } else {
            chatLogger.error('Image generation failed', { 
              error: imageResult.error 
            })
            // Fall through to normal chat processing with error message
            const errorMessage = `I couldn't generate the image: ${imageResult.error || 'Unknown error'}. I'll try to help you in another way.`
            
            if (supabase) {
              await storeAssistantMessage({
                supabase,
                userId,
                chatId,
                messages: [{
                  role: "assistant",
                  content: errorMessage
                }],
                model: originalModel,
                inputTokens: userMessageText.length / 4,
                outputTokens: errorMessage.length / 4,
                message_group_id,
              })
            }

            const stream = new ReadableStream({
              start(controller) {
                const encoder = new TextEncoder()
                controller.enqueue(encoder.encode(errorMessage))
                controller.close()
              }
            })

            return new Response(stream, {
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Accel-Buffering': 'no',
              },
            })
          }
        } catch (error) {
          chatLogger.error('Image generation endpoint call failed', { error })
          // Fall through to normal chat processing
        }
    }

    // ------------------------------------------------------------------
    // GLOBAL REQUEST CONTEXT (AsyncLocalStorage) - must wrap the remainder
    // ------------------------------------------------------------------
    const outerRequestId = randomUUID()
    
    // Detect user locale from middleware-set header (browser Accept-Language)
    const userLocale = (req.headers.get('x-user-locale') as 'en' | 'es' | 'fr' | 'de') || 'es'
    
    // Hoisted variables that will be populated inside globalCtxRun and used later
  let finalSystemPrompt: string = ''
    let convertedMessages: any
    let toolsForRun: any
    let providerOptions: Record<string, any> | undefined
    let activeTools: string[] | undefined
    let modelConfig: any
    let apiKey: string | undefined
    const globalCtxRun = async () => {
      chatLogger.debug('Global request context established', { 
        userId: realUserId, 
        requestId: outerRequestId 
      })

    if (supabase && userMessage?.role === "user") {
      const contentForDB = messageProcessorService.createCleanContentForDB(userMessage)

      await logUserMessage({
        supabase,
        userId,
        chatId,
        content: contentForDB,
        attachments: [],
  model: normalizedModel,
        isAuthenticated,
        message_group_id,
      })
    }

    // Resolve model config and establish effective system prompt
  const allModels = await getAllModels()
  const resolution = resolveModelFromList(originalModel, allModels)
  if (resolution.usedFallback) {
    chatLogger.warn('Model not found in registry, using fallback', {
      requested: originalModel,
      fallback: resolution.normalizedModel
    })
  }
  modelConfig = resolution.modelConfig
  normalizedModel = resolution.normalizedModel
    if (!modelConfig.apiSdk && !originalModel.startsWith('langchain:')) {
      throw new Error(`Model ${modelConfig.id} has no API SDK configured`)
    }

    // Check daily limits for premium models (e.g., GPT-5)
    if (isAuthenticated && userId && modelConfig.dailyLimit) {
      const limitCheck = await dailyLimits.canUseModel(userId, normalizedModel, modelConfig)
      
      if (!limitCheck.canUse) {
        const errorMsg = `Has alcanzado el límite diario de ${limitCheck.limit} mensajes para el modelo ${modelConfig.name}. Intenta mañana o usa el modelo "Faster".`
        chatLogger.warn('Daily limit exceeded', { 
          userId, 
          model: normalizedModel,
          limit: limitCheck.limit 
        })
        
        return createErrorResponse({
          code: 'DAILY_LIMIT_REACHED',
          message: errorMsg,
          statusCode: 429
        })
      }
      
      chatLogger.debug('Daily limit check passed', {
        userId,
        model: normalizedModel,
        remaining: limitCheck.remaining,
        limit: limitCheck.limit
      })
    }

  // --- Delegation Intent Heuristics (Optimized) ---
    // Use delegation detection service
    const delegationIntent = await delegationDetectionService.detectIntent(
      messages,
      realUserId,
      process.env.DEBUG_DELEGATION_INTENT === 'true'
    )
    
    const quickDelegationFlag = delegationIntent.quickCheck

    // Use reasoning-optimized prompt for GPT-5 models when no custom prompt
    let baseSystemPrompt = systemPrompt || SYSTEM_PROMPT_DEFAULT
    if (normalizedModel.startsWith('gpt-5') && !systemPrompt) {
      const { getCleoPrompt } = await import("@/lib/prompts")
      baseSystemPrompt = getCleoPrompt(normalizedModel, 'reasoning')
      chatLogger.debug('Using reasoning-optimized prompt for GPT-5')
    }
    
  // Add delegation hint if strong intent detected
  const delegationHint = delegationDetectionService.createDelegationHint(delegationIntent)
  const effectiveSystemPrompt = baseSystemPrompt + delegationHint

    // Attempt to parse personality type from system prompt for observability
    try {
      const match = effectiveSystemPrompt.match(/Type:\s*(empathetic|playful|professional|creative|analytical|friendly)/i)
      const inferredPersonality = match?.[1]?.toLowerCase()
      if (inferredPersonality) {
        chatLogger.debug('Active personality detected', { 
          personalityType: inferredPersonality 
        })
      }
    } catch (e) {
      // Silent fail for personality detection
    }

  // Decide effective search flag based on quick intent and explicit request
  const effectiveEnableSearch = Boolean(enableSearch || documentId || (quickDelegationFlag && process.env.DEFAULT_SEARCH_ON_DELEGATION === 'true'))

  // Count images BEFORE conversion for diagnostics
  const imagesBeforeConversion = messages.reduce((acc: number, m: any) => {
    if (Array.isArray(m.content)) {
      const imageCount = m.content.filter((p: any) => 
        p.type === 'image' || 
        (p.type === 'file' && p.mediaType?.startsWith('image/'))
      ).length
      return acc + imageCount
    }
    return acc
  }, 0)
  
  chatLogger.debug('Processing multimodal content', {
    totalMessages: messages.length,
    imagesBefore: imagesBeforeConversion
  })

  // Convert multimodal messages to correct format for the model
    convertedMessages = await convertUserMultimodalMessages(
      messages,
  normalizedModel,
      Boolean(modelConfig.vision)
    )

    // Safety: Remove any system-role messages from user payload since we pass `system` separately.
    // Some providers (AI SDK v5) require the system message to be first; duplicating it in messages triggers errors.
    if (Array.isArray(convertedMessages)) {
      const before = convertedMessages.length
      convertedMessages = convertedMessages.filter((m: any) => m?.role !== 'system') as any
      const after = convertedMessages.length
      if (before !== after) {
        chatLogger.debug('Removed system messages from payload', {
          removed: before - after
        })
      }
    }

    // Log conversion summary and count images
    const convertedMultimodal = convertedMessages.filter((msg: any) =>
      Array.isArray(msg.content)
    )

    // Apply intelligent image filtering to prevent API errors
  const imageLimit = MODEL_IMAGE_LIMITS[normalizedModel]?.maxImages || MODEL_IMAGE_LIMITS.default.maxImages

    // Intelligent image filtering by model limits
    const totalImages = convertedMessages.reduce(
      (acc: number, m: any) => acc + (Array.isArray(m.content) ? m.content.filter((p: any) => p.type === 'image').length : 0),
      0
    )
    
  chatLogger.debug('Image limit check', {
    model: normalizedModel,
    totalImages,
    limit: imageLimit
  })
  
    if (totalImages > imageLimit) {
  convertedMessages = filterImagesByModelLimit(convertedMessages, normalizedModel) as any
      chatLogger.info('Applied image limit filter', { 
        limit: imageLimit 
      })
    }

    if (convertedMultimodal.length > 0) {
      // reserved for future per-image diagnostics
    }

  // Resolve an API key for the selected provider. For unauthenticated users,
    // fall back to environment keys so models like OpenRouter work in demos.
    {
      const { getEffectiveApiKey } = await import("@/lib/user-keys")
  const provider = getProviderForModel(normalizedModel as any)
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

  // Inject userId, model, and locale into request-scoped context (already resolved earlier as realUserId)
  ;(globalThis as any).__currentUserId = realUserId
  ;(globalThis as any).__currentModel = normalizedModel
  ;(globalThis as any).__currentLocale = userLocale

  // ✅ DEBUG: Verify thread ID is set before RAG calls
  console.log(`🧵 [ROUTE] effectiveThreadId before buildFinalSystemPrompt: ${effectiveThreadId || 'NULL (will use GLOBAL)'}`)

      // Build final system prompt using centralized prompt builder (handles RAG, personalization, and search guidance)
  const promptBuild = await buildFinalSystemPrompt({
        baseSystemPrompt: effectiveSystemPrompt,
  model: normalizedModel,
        messages,
        supabase,
        realUserId,
        threadId: effectiveThreadId,  // ✅ CRITICAL: Pass thread for RAG isolation
    enableSearch: effectiveEnableSearch,
        documentId,
        projectId,
        debugRag,
      })
  if (!promptBuild) {
    throw new Error('Failed to build final system prompt')
  }
  finalSystemPrompt = promptBuild.finalSystemPrompt
  const usedContext = promptBuild.usedContext

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
  toolsForRun = tools as typeof tools
  // Detect explicit document intent in the last user message
  const lastUserContent = messages.filter(m => m.role === 'user').pop()?.content?.toString() || ''
  const docIntentRegex = /\b(open|abrir|mostrar|ver|view|edit|editar|work on|continuar|colaborar)\b.*\b(doc|document|documento|archivo|file)\b/i
  const explicitDocIntent = docIntentRegex.test(lastUserContent)

  if (normalizedModel === 'grok-3-mini') {
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
            mode: effectiveEnableSearch ? 'auto' : 'off',
            returnCitations: effectiveEnableSearch ? true : false,
          },
        },
      }
    }

    // Reasoning toggle for Grok 4 Fast via OpenRouter (provider-level option simulated here)
    if (normalizedModel === 'grok-4-fast') {
      providerOptions = {
        ...(providerOptions || {}),
        xai: {
          ...(providerOptions?.xai || {}),
          // For simple chats (greetings), keep minimal reasoning; otherwise default to medium
          reasoning: {
            effort: quickDelegationFlag ? 'medium' : 'minimal'
          },
        }
      }
    }

    // Additional safety: prevent openDocument calls unless explicit doc intent detected
    if (!explicitDocIntent) {
      try {
        const { openDocument, ...rest } = toolsForRun as any
  toolsForRun = rest
  activeTools = Object.keys(toolsForRun)
      } catch {}
    }

    // Ensure all delegation tools are present only when delegation is likely
    // This reduces cold start time for simple Q&A
    if (quickDelegationFlag) {
      try {
        const { agentLoader } = await import('@/lib/agents/agent-loader')
        const availableAgents = await agentLoader.loadAgents({ userId: realUserId })
        
        chatLogger.debug('Loading agents for delegation tools', {
          count: availableAgents.length
        })
        
        for (const a of availableAgents) {
          if (a.role !== 'supervisor') {
            ensureDelegationToolForAgent(a.id, a.name)
          }
        }
        // After ensuring, refresh registry reference (tools is mutated inside helper)
    toolsForRun = tools as typeof tools
      } catch (e) {
        chatLogger.error('Failed to ensure delegation tools', { error: e })
      }
    }

    // Provider-specific tool name normalization
    try {
      const provider = getProviderForModel(originalModel as any)
      if (provider === 'google' || originalModel.includes('gemini')) {
  toolsForRun = sanitizeGeminiTools(toolsForRun as any) as any
  activeTools = Object.keys(toolsForRun)
        chatLogger.debug('Gemini tool names sanitized')
      }
    } catch {}

    // Optional delegation-only toolset for general chat
    // When CHAT_DELEGATION_ONLY=true, expose only delegate_to_* tools (+ minimal helpers)
    try {
      if (process.env.CHAT_DELEGATION_ONLY === 'true' && quickDelegationFlag) {
        const { agentLoader } = await import('@/lib/agents/agent-loader')
        const availableAgents = await agentLoader.loadAgents({ userId: realUserId })
        
        // Ensure delegation tools exist for all specialist agents
        const delegateToolNames: string[] = []
        for (const a of availableAgents) {
          if (a.role !== 'supervisor') {
            const toolName = ensureDelegationToolForAgent(a.id, a.name)
            delegateToolNames.push(toolName)
          }
        }
        const allowed = new Set<string>([
          'complete_task',
          'memoryAddNote',
          ...delegateToolNames,
        ])
        // Rebuild toolsForRun to include only allowed keys
        const newRegistry: Record<string, any> = {}
        for (const key of Object.keys(tools as any)) {
          if (allowed.has(key)) {
            newRegistry[key] = (tools as any)[key]
          }
        }
  toolsForRun = newRegistry as any
  activeTools = Object.keys(toolsForRun)
      }
    } catch (e) {
      chatLogger.error('Delegation-only tools setup failed', { error: e })
    }

    // If the selected model is not tool-capable, disable tools to avoid provider errors
    try {
      if (modelConfig && modelConfig.tools === false) {
  const hadTools = Object.keys(toolsForRun || {}).length > 0
        if (hadTools) {
          chatLogger.warn('Model does not support tools, disabling', {
            model: normalizedModel
          })
        }
  toolsForRun = {} as any
        activeTools = []
      }
    } catch {}

  // Note: For OpenRouter we set headers on the provider itself in its model config
  // (lib/models/data/openrouter.ts). Do not inject them via providerOptions to avoid
  // leaking into the request body.

  // Check for orchestrator-backed mode FIRST (before LangChain forwarding)
  // Triggered when model id starts with 'agents:' or when env flag is set
  // Also enable orchestrator-backed mode when the user message clearly implies delegation/sub-agents
  let impliesDelegation = false
  let intelligentDelegation: { agentId: string; toolName: string; confidence: number } | null = null
  
  try {
    // Be robust to AI SDK v5: prefer parts[].text over content
    const lastUserAny: any = [...messages].reverse().find((m) => m.role === 'user') as any
    let lastUserText = ''
    if (lastUserAny) {
      if (Array.isArray(lastUserAny.parts)) {
        lastUserText = (lastUserAny.parts.find((p: any) => p?.type === 'text')?.text || '')
      }
      if (!lastUserText && typeof lastUserAny.content === 'string') {
        lastUserText = lastUserAny.content
      }
    }
    
    // Use intelligent delegation analyzer for better detection
    const { analyzeDelegationIntent } = await import('@/lib/agents/delegation')
    intelligentDelegation = analyzeDelegationIntent(lastUserText || '')
    
    // Basic regex fallback + intelligent analysis
    const lm = String(lastUserText || '').toLowerCase()
    const basicDelegation = /\bami\b|\bdeleg(a|ar|ate)\b|sub[- ]?agente|notion|workspace/.test(lm)
  const intelligentFlag = !!intelligentDelegation && intelligentDelegation.confidence >= 0.6
  impliesDelegation = basicDelegation || intelligentFlag
    
    if (intelligentDelegation && intelligentDelegation.confidence > 0.5) {
      console.log('🎯 Intelligent delegation detected:', {
        agent: intelligentDelegation.agentId,
        tool: intelligentDelegation.toolName,
        confidence: Math.round(intelligentDelegation.confidence * 100) + '%',
        userMessage: lastUserText?.substring(0, 100) + '...'
      })
    }
  } catch {}
  
  // ✅ MIGRATION: Always use CoreOrchestrator (unified flow via LangGraph)
  // Removed dual-flow branching - HITL works consistently across all models
  const orchestratorBacked = true

  // If the last message includes file attachments, hint the supervisor to prefer Iris for insights over web search
  try {
    const lastMsg = messages[messages.length - 1] as any
    const hasFiles = Array.isArray(lastMsg?.content) && lastMsg.content.some((p: any) => p?.type === 'file')
    if (hasFiles) {
      // Strengthen the system prompt with a targeted hint
      finalSystemPrompt = `${finalSystemPrompt}\n\n[Supervisor Hint] The user provided attached documents. Prioritize analyzing attachments. Avoid web search unless explicitly requested. Prefer delegating to Iris for insight synthesis.`
      console.log('[Delegation] Attachment-present hint added for Iris preference')
    }
  } catch {}

  // If using LangChain orchestration models BUT no delegation implied, forward to multi-model endpoint and pipe SSE
  if (originalModel && originalModel.startsWith('langchain:') && !orchestratorBacked) {
      try {
        // Build message payload for /api/multi-model-chat
        const lastMsg: any = messages[messages.length - 1] || {}
        let lcMessage: any = ''
        let isMultimodal = false
        if (Array.isArray(lastMsg.content)) {
          lcMessage = lastMsg.content
          isMultimodal = lcMessage.some((p: any) => p?.type === 'file')
        } else if (Array.isArray(lastMsg.parts)) {
          lcMessage = lastMsg.parts.map((p: any) =>
            p?.type === 'file'
              ? { type: 'file', name: p.name, mediaType: p.mimeType || p.mediaType || p.contentType, url: p.url }
              : { type: 'text', text: p.text || p.content || '' }
          )
          isMultimodal = lcMessage.some((p: any) => p?.type === 'file')
        } else if (typeof lastMsg.content === 'string') {
          lcMessage = lastMsg.content
        } else {
          lcMessage = typeof lastMsg?.content === 'string' ? lastMsg.content : ''
        }

        // Determine explicit document open intent to restrict openDocument by default
        const lastUserContent = (typeof lastMsg.content === 'string')
          ? lastMsg.content
          : (Array.isArray(lastMsg.parts)
            ? (lastMsg.parts.find((p: any) => p.type === 'text')?.text || '')
            : '')
        const docIntentRegex = /\b(open|abrir|mostrar|ver|view|edit|editar|work on|continuar|colaborar)\b.*\b(doc|document|documento|archivo|file)\b/i
        const explicitDocIntent = docIntentRegex.test(lastUserContent || '')

        // Compute allowed tools (remove openDocument unless explicit intent)
        let allowedTools: string[] | undefined = undefined
        try {
          const allToolNames = Object.keys(tools)
          allowedTools = explicitDocIntent ? allToolNames : allToolNames.filter(n => n !== 'openDocument')
        } catch {}

        const baseUrl = new URL('/api/multi-model-chat', req.url)
        // If running under a dev tunnel (ngrok) or mismatched protocol, prefer http for localhost
        try {
          const host = baseUrl.hostname
          if (host === 'localhost' || host === '127.0.0.1') {
            baseUrl.protocol = 'http:'
          }
        } catch {}
        const forwardBody = {
          message: lcMessage,
          type: isMultimodal ? 'multimodal' : 'text',
          options: { enableSearch },
          metadata: {
            chatId,
            userId: realUserId,
            isAuthenticated,
            systemPrompt: effectiveSystemPrompt,
            originalModel: originalModel,
            message_group_id,
            documentId,
            projectId,
            debugRag,
            // Ensure RAG toggle is respected by multi-model endpoint
            useRAG: enableSearch,
            // Allowlist tools for safety
            allowedTools,
            // Extract router type from langchain model ID for proper routing
            routerType: originalModel?.replace('langchain:', '').replace('-router', ''),
          },
        }

        // Forward auth context (cookies, authorization) so Supabase in the downstream
        // endpoint can read the session and satisfy RLS during tool execution
        const originalCookie = req.headers.get('cookie') || ''
        const originalAuth = req.headers.get('authorization') || undefined
        const fRes = await fetch(baseUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(originalCookie ? { cookie: originalCookie } : {}),
            ...(originalAuth ? { authorization: originalAuth } : {}),
          },
          body: JSON.stringify(forwardBody),
        })

        // Pipe SSE back to client
        const contentType = fRes.headers.get('Content-Type') || 'text/event-stream; charset=utf-8'
        return new Response(fRes.body, {
          status: fRes.status,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': fRes.headers.get('Cache-Control') || 'no-cache, no-transform',
            'Connection': fRes.headers.get('Connection') || 'keep-alive',
          },
        })
      } catch (e) {
        console.error('[ChatAPI] Forward to /api/multi-model-chat failed:', e)
        return new Response(JSON.stringify({ error: 'Failed to route LangChain model' }), { status: 500 })
      }
    }

  // Orchestrator-backed Cleo-supervised mode for global chat
    if (orchestratorBacked) {
        try {
          const orchestrator = await getAgentOrchestrator() as any
        const lastMsg = messages[messages.length - 1]
        // Prefer AI SDK v5 parts text for base prompt
        const baseUserText = Array.isArray((lastMsg as any)?.parts)
          ? ((lastMsg as any).parts.find((p: any) => p.type === 'text')?.text || '')
          : (typeof (lastMsg as any)?.content === 'string' ? (lastMsg as any).content : '')

        // Detect attached files from the original payload
        let hasFileAttachments = false
        let attachedFilenames: string[] = []
        try {
          if (Array.isArray((lastMsg as any)?.content)) {
            const fileParts = (lastMsg as any).content.filter((p: any) => p && p.type === 'file')
            hasFileAttachments = fileParts.length > 0
            attachedFilenames = fileParts.map((p: any) => p?.name).filter(Boolean)
          }
        } catch {}

        // Reuse previously converted multimodal messages to obtain extracted text from PDFs/DOCX/etc.
        let convertedUserText = ''
        try {
          const lastConvertedUser = [...(convertedMessages || [])].reverse().find((m: any) => m?.role === 'user') as any
          if (lastConvertedUser) {
            if (Array.isArray(lastConvertedUser.content)) {
              convertedUserText = lastConvertedUser.content
                .filter((p: any) => p?.type === 'text')
                .map((p: any) => p.text || '')
                .filter(Boolean)
                .join('\n\n')
            } else if (typeof lastConvertedUser.content === 'string') {
              convertedUserText = lastConvertedUser.content
            }
          }
        } catch {}

        // Compose final user text for orchestrator: include attachment evidence when present
        let userText = baseUserText
        if (hasFileAttachments && convertedUserText) {
          const fileList = attachedFilenames.length ? `Archivos adjuntos: ${attachedFilenames.join(', ')}` : ''
          // Keep it explicit: prioritize attached evidence, avoid premature web search, prefer Iris for insights synthesis
          userText = [
            baseUserText || '',
            fileList ? `[Adjuntos procesados] ${fileList}` : '[Adjuntos procesados] Archivos recibidos',
            convertedUserText,
            'Instrucciones: Analiza exclusivamente la evidencia adjunta para esta solicitud. No hagas búsqueda web salvo que yo lo pida explícitamente. Si corresponde generar un informe de insights, delega en la agente Iris.'
          ].filter(Boolean).join('\n\n')
          console.log('[Orchestrator] Attachments detected for supervised run:', { count: attachedFilenames.length, names: attachedFilenames })
        }

        // CRITICAL FIX: Use chatId as thread_id for proper conversation isolation
        // Each chat = unique thread_id. DO NOT reuse old threads across different chats.
        // 
        // Previous bug: Code was overwriting effectiveThreadId with the most recent
        // agent_threads entry, causing all new chats to merge into one thread.
        //
        // New behavior: chatId (from URL /c/[id]) = thread_id
        // - Ensures each conversation has isolated context
        // - Prevents cross-contamination between different chats
        // - Scales properly (1 chat = 1 thread, not 1 user = 1 global thread)
        
        // effectiveThreadId already set from chatId at line 292
        // DO NOT override it with agent_threads lookup
        
        // CRITICAL: Save the user message to agent_messages BEFORE loading context
        // This ensures the smart loader includes the current message in the context
        if (effectiveThreadId && realUserId && userText && supabase) {
          try {
            console.log(`💾 [CONTEXT] Saving user message to agent_messages for thread ${effectiveThreadId}`)
            
            // Extract multimodal parts for storage (if any)
            let messageContent: string | any = userText;
            try {
              const lastConvertedUser = [...(convertedMessages || [])].reverse().find((m: any) => m?.role === 'user') as any;
              if (lastConvertedUser && Array.isArray(lastConvertedUser.content)) {
                // Store the multimodal parts array for proper reconstruction
                messageContent = lastConvertedUser.content;
                console.log(`📎 [CONTEXT] Storing multimodal message with ${lastConvertedUser.content.length} parts`);
              }
            } catch (e) {
              console.error('⚠️ [CONTEXT] Failed to extract multimodal parts, using text fallback:', e);
            }
            
            // Use .select() to force immediate read and confirm insertion
            const { data: insertedMessage, error: insertError } = await (supabase as any)
              .from('agent_messages')
              .insert({
                thread_id: effectiveThreadId, // Use chatId as thread_id
                user_id: realUserId,
                role: 'user',
                content: typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent),
                metadata: { 
                  conversation_mode: 'chat', 
                  source: 'chat-ui', 
                  chat_id: chatId,
                  has_multimodal_parts: Array.isArray(messageContent)
                }
              })
              .select() // Force immediate SELECT to confirm insertion
              .single();

            if (insertError) {
              console.error('❌ [CONTEXT] Insert error:', insertError);
            } else {
              console.log(`✅ [CONTEXT] User message saved (id: ${insertedMessage?.id})`);
              // Small delay to ensure PostgreSQL transaction commit completes
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          } catch (err) {
            console.error('❌ [CONTEXT] Failed to save user message to agent_messages:', err)
          }
        }

        // Build conversation history from agent_messages to maintain context
        // ✅ USING SMART TOKEN-AWARE LOADING (no hard limits!)
        let prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }> = []
        if (effectiveThreadId && realUserId && supabase) {
          try {
            // 🚀 Load thread context with intelligent token management
            const contextResult: LoadContextResult = await loadThreadContext({
              threadId: effectiveThreadId,
              userId: realUserId,
              model: normalizedModel || originalModel, // Use the normalized model ID
              includeSystemPrompt: true,
            });

            // Map messages to expected format
            prior = contextResult.messages.map((m: any) => ({
              role: m.role,
              content: m.content || '',
              metadata: {
                ...m.metadata,
                tool_calls: m.tool_calls || undefined,
                tool_results: m.tool_results || undefined
              }
            }));

            console.log(`🧵 [CONTEXT] Smart loader results for thread ${effectiveThreadId}:`);
            console.log(`   📊 Total messages in DB: ${contextResult.totalMessages}`);
            console.log(`   ✅ Loaded into context: ${contextResult.includedMessages}`);
            console.log(`   ❌ Dropped (old): ${contextResult.droppedMessages}`);
            console.log(`   🎯 Token usage: ${contextResult.tokenCount.toLocaleString()} / ${contextResult.contextWindow.toLocaleString()}`);
            console.log(`   ⚠️  Truncated: ${contextResult.truncated ? 'YES' : 'NO'}`);
            console.log(`   ⏱️  Load time: ${contextResult.performance.loadTimeMs}ms`);
            
            // Preview last 5 messages for debugging (show full text for better diagnosis)
            if (prior.length > 0) {
              console.log(`🧵 [CONTEXT] Preview (last 5 messages):`);
              prior.slice(-5).forEach((m: any, idx: number) => {
                let contentPreview: string;
                if (typeof m.content === 'string') {
                  contentPreview = m.content.substring(0, 200);
                } else if (Array.isArray(m.content)) {
                  contentPreview = `[${m.content.length} parts: ${m.content.map((p: any) => p.type).join(', ')}]`;
                } else {
                  contentPreview = JSON.stringify(m.content).substring(0, 200);
                }
                console.log(`   [${prior.length - 5 + idx}] ${m.role}: ${contentPreview}${contentPreview.length === 200 ? '...' : ''}`);
              });
            }

            // ⚠️  Alert if we're truncating context (Phase 2 improvement opportunity)
            if (contextResult.truncated) {
              console.warn(`💡 [CONTEXT] Thread has ${contextResult.totalMessages} messages but only ${contextResult.includedMessages} fit in context.`);
              console.warn(`   Consider implementing message summarization or increasing context window.`);
            }
          } catch (err) {
            console.error('❌ [CONTEXT] Error loading smart context:', err);
            // Fallback to empty context rather than failing
            prior = [];
          }
        }

        // Extract multimodal parts (images/text) for the last user message from convertedMessages
        let lastUserParts: any[] | undefined
        try {
          const { ensureImageAnalysisHint } = await import('@/lib/chat/image-hint')
          const { orderTextBeforeImages } = await import('@/lib/chat/parts-order')
          const lastConvertedUser = [...(convertedMessages || [])].reverse().find((m: any) => m?.role === 'user') as any
          if (lastConvertedUser && Array.isArray(lastConvertedUser.content)) {
            // Keep only provider-supported parts (text | image | file)
            // CRITICAL: Include 'file' type for PDF/document attachments
            const parts = lastConvertedUser.content.filter((p: any) => p && (p.type === 'text' || p.type === 'image' || p.type === 'file'))
            // 1) Ensure image-only gets a text hint
            let ensured = ensureImageAnalysisHint(parts)
            // 2) Always prefer text before images to guide models reliably
            lastUserParts = orderTextBeforeImages(ensured)
            if (lastUserParts !== parts) {
              const injected = ensured !== parts
              const reordered = ensured !== lastUserParts
              if (injected) console.log('[IMAGE PROMPT] Injected analysis hint for image-only user message')
              if (reordered) console.log('[IMAGE ORDER] Reordered parts to place text before images')
            }
          }
        } catch {}

        // Ensure the very last message we pass to the orchestrator contains the multimodal parts
        // even if DB ordering or focus trimming would otherwise drop them.
        if (Array.isArray(lastUserParts) && lastUserParts.length > 0) {
          // Check if the last message in prior is already a user message
          const lastPriorMsg = prior[prior.length - 1];
          
          if (lastPriorMsg && lastPriorMsg.role === 'user') {
            // Only update if the content is different (not already multimodal)
            const isAlreadyMultimodal = Array.isArray(lastPriorMsg.content) && 
              lastPriorMsg.content.some((p: any) => p.type === 'image' || p.type === 'text');
            
            if (!isAlreadyMultimodal) {
              // Update the existing last user message with multimodal parts
              lastPriorMsg.content = lastUserParts as any;
              if (!lastPriorMsg.metadata) {
                lastPriorMsg.metadata = {};
              }
              lastPriorMsg.metadata.multimodal_parts_injected = true;
              console.log('[MM OVERRIDE] Updated last user message with multimodal parts (avoiding duplicate)');
            } else {
              console.log('[MM OVERRIDE] Skipped update - last message already has multimodal parts');
            }
          } else {
            // No user message at the end, append a synthetic one
            prior = [...prior, { role: 'user', content: lastUserParts as any, metadata: { synthetic: true, reason: 'ensure_multimodal_delivery' } }]
            console.log('[MM OVERRIDE] Appended synthetic user message with parts to prior')
          }
        }

        const exec = await (orchestrator.startAgentExecutionForUI?.(
          userText,
          'cleo-supervisor',
          effectiveThreadId || undefined,
          realUserId || undefined,
          prior,
          true,
          lastUserParts
        ) || orchestrator.startAgentExecution?.(userText, 'cleo-supervisor'))

  const execId: string | undefined = exec?.id
        const startedAt = Date.now()

        // Bridge execution progress to SSE for the chat UI
        const encoder = new TextEncoder()
  // Persisted parts accumulator (pipeline + tool chips)
  const persistedParts: any[] = []
        
        // Shared state for polling (accessible from both start and cancel)
        let pollInterval: ReturnType<typeof setInterval> | null = null
        let streamClosed = false
        let interruptListener: ((data: any) => void) | null = null
        let reasoningListener: ((data: any) => void) | null = null
        
        const stopPolling = () => {
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          // Clean up interrupt listener
          if (interruptListener) {
            orchestrator.eventEmitter?.off('execution.interrupted', interruptListener)
            interruptListener = null
          }
          // Clean up reasoning listener
          if (reasoningListener) {
            orchestrator.eventEmitter?.off('execution.reasoning', reasoningListener)
            reasoningListener = null
            console.log('🧹 [REASONING] Listener cleaned up')
          }
        }
        
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            // Set up pipeline event controller for delegation events
            setPipelineEventController(controller, encoder)
            
            function send(obj: any) {
              try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)) } catch {}
            }
            
            // CRITICAL: Listen for interrupt events from execution-manager
            // This handles HITL interrupts for both direct and delegated executions
            // IMPORTANT: This listener must fire for ALL interrupts, including delegated sub-executions
            interruptListener = (interruptData: any) => {
              console.log('🛑 [CHAT SSE LISTENER] Interrupt event received:', {
                currentExecId: execId,
                interruptExecId: interruptData.executionId,
                agentId: interruptData.agentId,
                action: interruptData.interrupt?.action_request?.action,
                listenerRegistered: true
              })
              
              // Track this interrupt to avoid duplicate emissions from polling fallback
              const interruptId = interruptData.step?.id || `${interruptData.executionId}-${interruptData.interrupt?.action_request?.action}`
              emittedInterrupts.add(interruptId)
              
              // Send interrupt event to frontend regardless of which execution it came from
              // This handles both: 
              // 1. Direct executions (execId === interruptData.executionId)
              // 2. Delegated executions (Cleo delegates to ASTRA, ASTRA's interrupt comes here)
              send({
                type: 'interrupt',
                interrupt: {
                  executionId: interruptData.executionId,
                  parentExecutionId: execId, // Cleo's execution is parent
                  threadId: interruptData.threadId,
                  interrupt: interruptData.interrupt,
                  step: interruptData.step,
                  source: 'direct_listener' // Mark as primary source
                }
              })
              console.log('✅ [CHAT SSE] Interrupt event emitted IMMEDIATELY via direct listener:', interruptData.executionId)
            }
            
            // Register listener BEFORE starting execution
            // This ensures we catch interrupts from delegated sub-agents (like ASTRA)
            console.log('📡 [CHAT SSE] Registering interrupt listener for execution:', execId)
            orchestrator.eventEmitter?.on('execution.interrupted', interruptListener)
            
            // ✅ REASONING LISTENER: Stream reasoning steps to UI for transparency
            reasoningListener = (reasoningData: any) => {
              console.log('💭 [REASONING LISTENER] Reasoning event received:', {
                executionId: reasoningData.executionId,
                agentId: reasoningData.agentId,
                type: reasoningData.step?.action,
                content: reasoningData.step?.content?.slice(0, 100)
              })
              
              // Send reasoning step to frontend immediately for real-time updates
              send({
                type: 'execution-step',
                step: reasoningData.step
              })
              
              // Persist for historical record
              persistedParts.push({
                type: 'execution-step',
                step: reasoningData.step
              })
              
              console.log('✅ [REASONING] Step emitted to UI:', {
                stepId: reasoningData.step?.id,
                action: reasoningData.step?.action
              })
            }
            
            // Register reasoning listener
            console.log('📡 [CHAT SSE] Registering reasoning listener for execution:', execId)
            orchestrator.eventEmitter?.on('execution.reasoning', reasoningListener)
            
            // Signal start
            send({ type: 'start', executionId: execId })
            // Emit an immediate initial step so the UI shows a pipeline right away
            try {
              const bootstrapStep = {
                id: `bootstrap-${execId || Date.now()}`,
                timestamp: new Date().toISOString(),
                agent: 'cleo-supervisor',
                action: 'routing',
                content: 'Analyzing and deciding delegation strategy…',
                metadata: { bootstrap: true }
              }
              send({ type: 'execution-step', step: bootstrapStep })
              persistedParts.push({ type: 'execution-step', step: bootstrapStep })
            } catch {}

            let lastStepCount = 0
            const openDelegations = new Map<string, { targetAgent?: string; startTime?: number }>()
            const generatedSteps = new Set<string>() // Track synthetic steps to avoid duplicates
            const emittedInterrupts = new Set<string>() // Track emitted interrupts to avoid duplicates
            const runtimeConfig = getRuntimeConfig()
            
            // PHASE 1: Updated timeouts to match scheduled tasks (hierarchical multi-agent support)
            // Based on LangGraph best practices - supports up to 3 complex delegations
            const supervisorLimitMs = Math.max(
              runtimeConfig?.maxExecutionMsSupervisor ?? 600000,  // 10 min (was 5 min)
              runtimeConfig?.delegationTimeoutMs ?? 420000         // 7 min (was 5 min)
            )
            const extensionAllowanceMs = Math.max(
              runtimeConfig?.delegationMaxExtensionMs ?? 180000,   // 3 min extension
              0
            )
            const MAX_POLL_TIME = Math.max(
              120000,  // 2 min minimum
              supervisorLimitMs + extensionAllowanceMs + 30000  // ~13 min total
            )
            
            // PHASE 1: Adaptive polling - adjusts based on elapsed time
            // Fast for quick responses, slower for long delegations
            let pollMs = 500  // Start fast
            const updatePollInterval = (elapsedMs: number): number => {
              if (elapsedMs < 5000) return 500      // 0-5s: very fast (0.5s)
              if (elapsedMs < 15000) return 1000    // 5-15s: fast (1s)
              if (elapsedMs < 45000) return 2000    // 15-45s: normal (2s)
              return 3000                            // 45s+: slow (3s)
            }
            // Progressive warning thresholds for better UX
            const HUNG_WARNING_THRESHOLD = Math.max(
              60000,  // 1 min (was 45s)
              Math.min(MAX_POLL_TIME - 30000, Math.floor(supervisorLimitMs * 0.5))
            )
            const pollStartTime = Date.now()
            let hungWarningSent = false

            const closeStream = () => {
              if (streamClosed) return
              streamClosed = true
              stopPolling()
              clearPipelineEventController()
              try { controller.close() } catch {}
            }

            const computeFinalText = (snapshot: any) => {
              let finalText = ''
              try {
                if (!snapshot) {
                  return 'Task completed successfully'
                }

                if (snapshot.status === 'failed') {
                  finalText = `Could not complete delegation: ${snapshot?.error || 'unknown error'}`
                } else {
                  if (snapshot?.result && typeof snapshot.result === 'string' && snapshot.result.trim()) {
                    finalText = String(snapshot.result).trim()
                    console.log('🔍 [PIPELINE DEBUG] Using snapshot.result:', finalText.slice(0, 100))
                  } else if (snapshot?.messages && Array.isArray(snapshot.messages) && snapshot.messages.length > 0) {
                    const lastAssistantMessage = [...snapshot.messages].reverse().find((msg: any) =>
                      msg?.role === 'assistant' && msg?.content && String(msg.content).trim().length > 50
                    )
                    if (lastAssistantMessage?.content) {
                      finalText = String(lastAssistantMessage.content).trim()
                      console.log('🔍 [PIPELINE DEBUG] Using assistant message:', finalText.slice(0, 100))
                    } else {
                      const lastMessage = snapshot.messages[snapshot.messages.length - 1]
                      if (lastMessage?.content && String(lastMessage.content).trim().length > 10) {
                        finalText = String(lastMessage.content).trim()
                        console.log('🔍 [PIPELINE DEBUG] Using last message:', finalText.slice(0, 100))
                      }
                    }
                  }

                  if (finalText === 'Enhanced unified fallback response' || finalText.length < 50) {
                    console.log('🔍 [PIPELINE DEBUG] Detected generic fallback, looking for actual delegation result')
                    if (snapshot?.messages && Array.isArray(snapshot.messages)) {
                      const allMessages = snapshot.messages
                      const substantialMessage = allMessages.find((msg: any) =>
                        msg?.content &&
                        String(msg.content).length > 100 &&
                        !String(msg.content).includes('Enhanced unified fallback')
                      )
                      if (substantialMessage?.content) {
                        finalText = String(substantialMessage.content).trim()
                        console.log('🔍 [PIPELINE DEBUG] Found substantial content:', finalText.slice(0, 100))
                      }
                    }
                  }
                }

                if (!finalText || finalText.trim().length === 0) {
                  finalText = 'Task completed successfully'
                }

                console.log('🔍 [PIPELINE DEBUG] Final text extraction:', {
                  status: snapshot?.status,
                  messagesCount: snapshot?.messages?.length || 0,
                  hasResult: !!snapshot?.result,
                  resultPreview: snapshot?.result ? String(snapshot.result).slice(0, 50) : 'none',
                  finalTextLength: finalText.length,
                  finalTextPreview: finalText.slice(0, 100) + (finalText.length > 100 ? '...' : '')
                })
              } catch (err) {
                console.error('❌ [PIPELINE DEBUG] Final text extraction failed:', err)
                finalText = 'Response processing completed'
              }
              return finalText
            }

            const finalizeHungExecution = async (snapshot: any) => {
              if (streamClosed) return
              stopPolling()
              const elapsedMs = Date.now() - pollStartTime
              console.warn('⚠️ [POLLING] Delegation exceeded max polling time, finalizing with fallback:', {
                executionId: execId,
                elapsedMs,
                status: snapshot?.status,
                stepsCount: snapshot?.steps?.length || 0
              })

              const extracted = snapshot ? computeFinalText(snapshot) : ''
              const fallbackText = extracted && extracted !== 'Task completed successfully'
                ? `La delegación tardó más de ${Math.round(elapsedMs / 1000)} segundos. Comparto el resultado parcial obtenido:\n\n${extracted}`
                : `La delegación tardó más de ${Math.round(elapsedMs / 1000)} segundos y se canceló automáticamente. Intenta dividir la solicitud o vuelve a ejecutarla.`

              const timeoutStep = {
                id: `timeout-${Date.now()}`,
                timestamp: new Date().toISOString(),
                agent: 'cleo',
                action: 'reviewing' as const,
                content: 'Cleo detuvo la delegación porque superó el tiempo máximo permitido.',
                metadata: {
                  synthetic: true,
                  pipelineStep: true,
                  timeout: true,
                  elapsedMs,
                  maxPollTimeMs: MAX_POLL_TIME
                }
              }
              send({ type: 'execution-step', step: timeoutStep })
              try { persistedParts.push({ type: 'execution-step', step: timeoutStep }) } catch {}

              send({ type: 'text-start' })
              send({ type: 'text-delta', delta: fallbackText })
              send({ type: 'finish', error: 'execution-timeout' })

              if (supabase) {
                try {
                  const fullMessage = [
                    { type: 'text', text: fallbackText },
                    ...persistedParts
                  ]
                  await storeAssistantMessage({
                    supabase,
                    chatId,
                    messages: [{ role: 'assistant', content: fullMessage }] as any,
                    message_group_id,
                    model: 'agents:cleo-supervised',
                    userId: realUserId!,
                    inputTokens: 0,
                    outputTokens: 0,
                    responseTimeMs: Math.max(0, Date.now() - startedAt)
                  })
                } catch {}
              }

              try {
                if (execId && typeof orchestrator.cancelExecution === 'function') {
                  await orchestrator.cancelExecution(execId)
                }
              } catch {}

              closeStream()
            }

            // PHASE 1: Adaptive polling implementation
            const pollLogic = async () => {
              if (streamClosed) {
                stopPolling()
                return
              }

              const elapsedMs = Date.now() - pollStartTime
              
              // Update poll interval based on elapsed time
              const newPollMs = updatePollInterval(elapsedMs)
              if (newPollMs !== pollMs) {
                pollMs = newPollMs
                stopPolling()
                pollInterval = setInterval(pollLogic, pollMs)
                console.log(`🔄 [ADAPTIVE POLL] Adjusted interval to ${pollMs}ms after ${elapsedMs}ms`)
              }

              try {
                // CRITICAL: Read directly from CoreOrchestrator.activeExecutions (single source of truth)
                // This ensures we see interrupt steps that were added to the authoritative execution state
                const coreOrch = await getCoreOrchestrator()
                const snapshot = execId ? coreOrch.getExecutionStatus(execId) : null

                // Only log on status changes or errors (reduce noise)
                if (!snapshot || snapshot.status === 'failed') {
                  console.log('🔍 [SSE] Snapshot:', {
                    execId,
                    found: !!snapshot,
                    status: snapshot?.status,
                    stepsCount: snapshot?.steps?.length || 0
                  })
                }

                if (!snapshot) {
                  if (elapsedMs > MAX_POLL_TIME) {
                    await finalizeHungExecution(null)
                  }
                  return
                }

                if (elapsedMs > MAX_POLL_TIME) {
                  await finalizeHungExecution(snapshot)
                  return
                }

                if (snapshot.status === 'running' && !hungWarningSent && elapsedMs > HUNG_WARNING_THRESHOLD) {
                  hungWarningSent = true
                  const warningStep = {
                    id: `warning-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    agent: 'cleo',
                    action: 'reviewing' as const,
                    content: 'Delegación en curso… está tardando más de lo habitual.',
                    metadata: {
                      synthetic: true,
                      pipelineStep: true,
                      warning: true,
                      elapsedMs
                    }
                  }
                  send({ type: 'execution-step', step: warningStep })
                  try { persistedParts.push({ type: 'execution-step', step: warningStep }) } catch {}
                }

                // Stream new steps as execution-step events
                const steps = Array.isArray(snapshot.steps) ? snapshot.steps : []
                if (steps.length > lastStepCount) {
                  for (let i = lastStepCount; i < steps.length; i++) {
                    const step = steps[i]
                    
                    // ✅ Enrich step with token usage from snapshot metadata
                    const snapshotMetadata = (snapshot as any).metadata
                    if (snapshotMetadata?.lastUsage) {
                      const stepAny = step as any
                      stepAny.metadata = {
                        ...stepAny.metadata,
                        tokens: snapshotMetadata.lastUsage.total_tokens || 0,
                        usage: {
                          prompt_tokens: snapshotMetadata.lastUsage.input_tokens || 0,
                          completion_tokens: snapshotMetadata.lastUsage.output_tokens || 0,
                          total_tokens: snapshotMetadata.lastUsage.total_tokens || 0
                        }
                      }
                    }
                    
                    // Debug: Log step structure to understand what we're getting
                    console.log('🔍 [PIPELINE DEBUG] Step received:', {
                      id: step?.id,
                      action: step?.action,
                      agent: step?.agent,
                      agentName: step?.agentName, // ✅ Log agentName to verify it's present
                      content: step?.content?.slice(0, 100),
                      metadata: step?.metadata,
                      tokens: step?.metadata?.tokens // ✅ Log tokens to verify enrichment
                    })

                    // HUMAN-IN-THE-LOOP: Detect interrupt steps and emit special event
                    // NOTE: This is SECONDARY to the direct event listener (line ~1250)
                    // The direct listener emits immediately when interrupt() is called
                    // This polling-based detection is a FALLBACK for edge cases
                    const isInterruptStep = step?.action === 'interrupt' && step?.metadata?.type === 'interrupt'
                    if (isInterruptStep) {
                      // CRITICAL: Use the child execution ID (the one with the interrupt stored)
                      // NOT the parent snapshot.id
                      const childExecutionId = step.metadata?.executionId || snapshot.id
                      
                      // Track interrupt ID to check if already emitted
                      const interruptStepId = step.id || `${childExecutionId}-${step.metadata?.interrupt?.action_request?.action}`
                      const alreadyEmitted = emittedInterrupts.has(interruptStepId)
                      
                      console.log('⏸️ [INTERRUPT FALLBACK] Detected interrupt step via polling:', {
                        parentExecutionId: snapshot.id,
                        childExecutionId: childExecutionId,
                        tool: step.metadata?.interrupt?.action_request?.action,
                        requiresApproval: step.metadata?.requiresApproval,
                        alreadyEmittedViaListener: alreadyEmitted,
                        note: alreadyEmitted ? 'Skip - already emitted by direct listener' : 'Emitting now (listener missed it)'
                      })
                      
                      // OPTIMIZATION: Only send if we haven't already sent this interrupt via listener
                      if (!alreadyEmitted) {
                        emittedInterrupts.add(interruptStepId)
                        
                        // Send interrupt event (frontend useToolApprovals listens to this)
                        send({ 
                          type: 'interrupt', 
                          interrupt: {
                            executionId: childExecutionId, // ← FIXED: Use child execution ID
                            parentExecutionId: snapshot.id,
                            threadId: step.metadata?.threadId || 'unknown',
                            interrupt: step.metadata?.interrupt,
                            step,
                            source: 'polling_fallback' // Mark as fallback
                          }
                        })
                        
                        console.log('⚠️ [INTERRUPT FALLBACK] Emitted interrupt (direct listener missed it):', childExecutionId)
                      }
                      
                      // Always send as regular step for timeline visualization
                      send({ type: 'execution-step', step })
                      try { persistedParts.push({ type: 'execution-step', step }) } catch {}
                      
                      continue
                    }
                    
                    send({ type: 'execution-step', step })
                    // Accumulate for DB persistence
                    try { persistedParts.push({ type: 'execution-step', step }) } catch {}
                    
                    // Enhanced delegation flow - trigger ONLY ONCE per unique delegation
                    const stepContent = String(step?.content || '').toLowerCase()
                    const isOriginalDelegationStep = (
                      step?.action === 'delegating' && 
                      !step?.metadata?.synthetic && // Don't generate for synthetic steps
                      !step?.id?.startsWith('synthetic-') && // Don't generate for our synthetic steps
                      stepContent.includes('delegat') &&
                      step?.metadata?.delegatedTo
                    )
                    
                    // Create a unique key for this delegation to prevent duplicates
                    const delegationKey = step?.metadata?.delegatedTo ? 
                      `${step.metadata.sourceAgent || 'cleo'}-${step.metadata.delegatedTo}` : 
                      null
                    
                    if (isOriginalDelegationStep && delegationKey && !generatedSteps.has(delegationKey)) {
                      console.log('🎯 [PIPELINE DEBUG] ORIGINAL delegation detected, generating live pipeline for:', delegationKey)
                      generatedSteps.add(delegationKey)
                      
                      const target = step.metadata.delegatedTo
                      const delegatedId = typeof target === 'string' ? target : undefined

                      let targetName: string | undefined = typeof step.agentName === 'string' && step.agentName.trim()
                        ? step.agentName.trim()
                        : undefined
                      
                      // Normalize noisy default names and UUID-like placeholders
                      if (targetName) {
                        const looksLikeUuid = targetName.length >= 20 && targetName.includes('-')
                        if (looksLikeUuid || targetName.toLowerCase() === 'agent' || (delegatedId && targetName === delegatedId)) {
                          targetName = undefined
                        }
                      }
                      
                      if (!targetName && delegatedId) {
                        const friendly = getAgentDisplayName(delegatedId)
                        if (friendly && friendly !== delegatedId) {
                          targetName = friendly
                        }
                      }
                      
                      if (!targetName && step.content) {
                        const contentMatch = step.content.match(/delegating to ([^:]+):/i)
                        if (contentMatch?.[1]) {
                          const extractedName = contentMatch[1].trim()
                          const looksLikeUuid = extractedName.length >= 20 && extractedName.includes('-')
                          if (!looksLikeUuid) {
                            targetName = extractedName
                          }
                        }
                      }
                      
                      if (!targetName && delegatedId) {
                        targetName = delegatedId // final fallback before generic label
                      }
                      
                      if (!targetName) {
                        targetName = 'Agent'
                      }
                      
                      console.log('🔍 [LIVE STEP DEBUG]', { 
                        target, 
                        extractedName: targetName,
                        stepContent: step.content?.substring(0, 100),
                        stepAgent: step.agent,
                        stepAgentName: step.agentName 
                      })
                      
                      // Send a simple live update step that will evolve
                      const liveStep = {
                        id: `live-${delegationKey}-${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        agent: target,
                        agentName: targetName, // ✅ TARGET agent friendly name
                        action: 'analyzing' as const,
                        content: `${targetName} processing delegation...`,
                        metadata: { 
                          synthetic: true, 
                          pipelineStep: true,
                          liveUpdate: true,
                          delegationKey: delegationKey
                        }
                      }
                      send({ type: 'execution-step', step: liveStep })
                      try { persistedParts.push({ type: 'execution-step', step: liveStep }) } catch {}
                      
                      console.log('✅ [PIPELINE DEBUG] Live delegation step sent with agentName:', targetName)
                    }
                  }
                  lastStepCount = steps.length
                }

                // Handle completion
                if (snapshot.status === 'completed' || snapshot.status === 'failed') {
                  // Debug: Log the full snapshot structure
                  console.log('🔍 [PIPELINE DEBUG] Execution snapshot:', {
                    status: snapshot.status,
                    hasMessages: !!snapshot?.messages,
                    messagesLength: snapshot?.messages?.length || 0,
                    hasResult: !!snapshot?.result,
                    hasError: !!snapshot?.error,
                    snapshotKeys: Object.keys(snapshot || {})
                  })

                  stopPolling()
                  const finalText = computeFinalText(snapshot)

                  // Generate Cleo supervision step before final completion
                  const supervisionStep = {
                    id: `supervision-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    agent: 'cleo',
                    action: 'supervising' as const,
                    content: 'Cleo reviewing and supervising final response for quality and accuracy',
                    metadata: { 
                      synthetic: true, 
                      pipelineStep: true,
                      supervision: true
                    }
                  }
                  send({ type: 'execution-step', step: supervisionStep })
                  try { persistedParts.push({ type: 'execution-step', step: supervisionStep }) } catch {}

                  // Then add final synthesis step
                  const synthesisStep = {
                    id: `synthesis-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    agent: 'cleo',
                    action: 'completing' as const,
                    content: 'Cleo synthesizing and finalizing response delivery',
                    metadata: { 
                      synthetic: true, 
                      pipelineStep: true,
                      synthesis: true
                    }
                  }
                  send({ type: 'execution-step', step: synthesisStep })
                  try { persistedParts.push({ type: 'execution-step', step: synthesisStep }) } catch {}

                  // Generate final delegation steps before completion
                  openDelegations.forEach((delegation, stepId) => {
                    const targetName = delegation.targetAgent === 'ami-creative' ? 'Ami' : (delegation.targetAgent || 'Agent')
                    
                    // Close delegation tool chips with detailed results
                    send({
                      type: 'tool-invocation',
                      toolInvocation: {
                        state: 'result',
                        toolName: 'delegate',
                        toolCallId: stepId,
                        result: { 
                          summary: `Delegation to ${targetName} completed`, 
                          text: finalText.slice(0, 400),
                          agent: targetName,
                          status: 'success'
                        }
                      }
                    })
                    // Accumulate tool result for DB
                    try {
                      persistedParts.push({
                        type: 'tool-invocation',
                        toolInvocation: {
                          state: 'result',
                          toolName: 'delegate',
                          toolCallId: stepId,
                          result: { 
                            summary: `Delegation to ${targetName} completed`, 
                            text: finalText.slice(0, 400),
                            agent: targetName,
                            status: 'success'
                          }
                        }
                      })
                    } catch {}
                  })

                  // Send final assistant text
                  send({ type: 'text-start' })
                  if (finalText) {
                    send({ type: 'text-delta', delta: finalText })
                  }
                  send({ type: 'finish' })

                  // Persist assistant message
                  if (supabase && finalText) {
                    try {
                      // Persist full assistant message with parts (pipeline + tools)
                      const fullMessage = [
                        { type: 'text', text: finalText },
                        ...persistedParts
                      ]
                      
                      await storeAssistantMessage({
                        supabase,
                        chatId,
                        messages: [{ role: 'assistant', content: fullMessage }] as any,
                        message_group_id,
                        model: 'agents:cleo-supervised',
                        userId: realUserId!,
                        inputTokens: 0,
                        outputTokens: 0,
                        responseTimeMs: Math.max(0, Date.now() - startedAt)
                      })
                    } catch (err) {
                      console.error('❌ Failed to persist assistant message:', err)
                    }
                  }

                  closeStream()
                  return
                }
              } catch (err) {
                // Emit error and close
                if (!streamClosed) {
                  try { send({ type: 'finish', error: 'execution-bridge-failed' }) } catch {}
                }
                closeStream()
              }
            }
            
            // Start polling with initial fast interval
            pollInterval = setInterval(pollLogic, pollMs)
          },
          cancel() {
            stopPolling()
          }
        })

        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive'
          }
        })
        } catch (e) {
          console.error('[ChatAPI] Orchestrator-backed path failed:', e)
          return createErrorResponse({ message: 'Orchestrator execution failed', statusCode: 500 })
        }
    }
    // ✅ MIGRATION: Removed simple streamText flow - all requests now use CoreOrchestrator
    // This ensures HITL approval works consistently regardless of model selection
    
  } // end globalCtxRun body

  // Execute orchestrator flow within request context
  const result = await withRequestContext({ 
    userId: realUserId, 
    model: normalizedModel, 
    requestId: outerRequestId,
    locale: userLocale 
  }, globalCtxRun)
  return result as any
  } catch (err: unknown) {
    // Clean up global context on exception
    delete (globalThis as any).__currentUserId
    delete (globalThis as any).__currentModel
    delete (globalThis as any).__currentLocale
    
    console.error("Error in /api/chat:", err)
    const error = err as {
      code?: string
      message?: string
      statusCode?: number
    }

    return createErrorResponse(error)
  }
}

// App Router Configuration - increase request body size limit for Grok-4-Fast 2M token support
export const preferredRegion = 'auto'
export const dynamic = 'force-dynamic'

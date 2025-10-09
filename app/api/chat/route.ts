import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
// RAG prompt construction is now centralized in lib/chat/prompt
import { buildFinalSystemPrompt } from '@/lib/chat/prompt'
import { getAllModels } from "@/lib/models"
import { NextRequest, NextResponse } from 'next/server'
import '@/lib/suppress-warnings'
import { resolveModelFromList } from '@/lib/models/resolve'
import { getProviderForModel, normalizeModelId } from "@/lib/openproviders/provider-map"
import { tools, ensureDelegationToolForAgent } from "@/lib/tools"
import { scoreDelegationIntent } from '@/lib/delegation/intent-heuristics'
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
import { randomUUID } from 'crypto'
import { setPipelineEventController, clearPipelineEventController } from '@/lib/tools/delegation'
import { convertUserMultimodalMessages } from "@/lib/chat/convert-messages"
import { filterImagesByModelLimit } from "@/lib/chat/image-filter"
import { makeStreamHandlers } from "@/lib/chat/stream-handlers"
import { clampMaxOutputTokens } from '@/lib/chat/token-limits'
import { sanitizeGeminiTools } from '@/lib/chat/gemini-tools'
import { getAgentOrchestrator } from '@/lib/agents/orchestrator-adapter-enhanced'
import { getRuntimeConfig } from '@/lib/agents/runtime-config'
import { getAllAgents as getAllAgentsUnified } from '@/lib/agents/unified-config'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { detectImageGenerationIntent } from '@/lib/image-generation/intent-detection'
import { isImageGenerationModel } from '@/lib/image-generation/models'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { dailyLimits } from "@/lib/daily-limits"
import { createClient } from '@/lib/supabase/server'
import { MODELS } from '@/lib/models'

// Ensure Node.js runtime so server env vars (e.g., GROQ_API_KEY) are available
export const runtime = "nodejs"

// Increase max duration to avoid Vercel 60s timeouts during delegation, RAG, and tool-use
export const maxDuration = 300

// Direct image generation function using Google AI SDK
async function generateImageDirectWithGoogle(prompt: string, userId?: string) {
  try {
    console.log('🎨 [GOOGLE SDK] Starting image generation with prompt:', prompt)
    
    // Get user from Supabase if userId provided
    let user = null
    if (userId) {
      const supabase = await createClient()
      if (supabase) {
        const { data: userData } = await supabase.auth.getUser()
        user = userData.user
      }
    }

  // Preferimos el ID directo (Google) porque la variante OpenRouter puede filtrarse del listado UI.
  // Aceptamos alias legacy 'openrouter:google/gemini-2.5-flash-image-preview'.
  const preferredId = 'gemini-2.5-flash-image-preview'
  const legacyId = 'openrouter:google/gemini-2.5-flash-image-preview'
  const modelId = MODELS.find(m => m.id === preferredId) ? preferredId : legacyId
    
    // Get the actual model configuration
    const modelConfig = MODELS.find((m) => m.id === modelId)
    if (!modelConfig) {
      throw new Error("Image generation model not found")
    }

    // Check daily limits for authenticated users
    if (user?.id) {
      const limitCheck = await dailyLimits.canUseModel(user.id, modelId, modelConfig)
      
      if (!limitCheck.canUse) {
        throw new Error(`Daily limit reached for image generation. You have used all ${limitCheck.limit} images for today. Try again tomorrow.`)
      }
    }

  console.log('🎨 [IMAGE] Using Gemini 2.5 Flash Image Preview for image generation via', modelId === preferredId ? 'direct Google' : 'OpenRouter proxy')
    
    try {
      // Try OpenRouter FLUX.1 first (best value), then fallback to others
      const openrouterApiKey = process.env.OPENROUTER_API_KEY
      if (!openrouterApiKey) {
        throw new Error("OpenRouter API key not configured")
      }

      // Use OpenRouter API for FLUX.1 image generation
  const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Cleo Agent'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview', // OpenRouter internal model slug
          messages: [{
            role: 'user',
            content: `Generate a high-quality image: ${prompt}`
          }],
          modalities: ['image', 'text'],
          max_tokens: 1000
        })
      })

      if (!openrouterResponse.ok) {
        const errorData = await openrouterResponse.text()
        throw new Error(`OpenRouter API error: ${openrouterResponse.status} - ${errorData}`)
      }

      const openrouterData = await openrouterResponse.json()
      const imageData = openrouterData.choices?.[0]?.message?.images?.[0]

      if (imageData && imageData.image_url?.url) {
        const realResult = {
          imageUrl: imageData.image_url.url,
          title: `Generated Image: ${prompt.slice(0, 50)}`,
          description: `AI-generated image using Gemini 2.5 Flash Image Preview: "${prompt}"`,
          style: "Gemini 2.5 Flash",
          dimensions: {
            width: 1024,
            height: 1024
          }
        }

        console.log('🎨 [OPENROUTER] FLUX.1 image generated successfully')

        // Record usage if user is authenticated
        if (user?.id) {
          try {
            await dailyLimits.recordUsage(user.id, modelId)
            console.log('🎨 [OPENROUTER] Usage recorded for user:', user.id)
          } catch (error) {
            console.error('Failed to record image generation usage:', error)
          }
        }

        return {
          success: true,
          result: realResult,
          model: modelId
        }
      } else {
        // If FLUX fails, try DALL-E 3 fallback
        console.log('🎨 [DALL-E FALLBACK] FLUX failed, trying DALL-E 3...')
        
        const openaiApiKey = process.env.OPENAI_API_KEY
        if (!openaiApiKey) {
          throw new Error("OpenAI API key not configured for fallback")
        }

        const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard'
          })
        })

        if (!openaiResponse.ok) {
          const errorData = await openaiResponse.text()
          throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorData}`)
        }

        const openaiData = await openaiResponse.json()
        const imageUrl = openaiData.data[0]?.url

        if (!imageUrl) {
          throw new Error("No image URL received from OpenAI")
        }

        const realResult = {
          imageUrl,
          title: `Generated Image: ${prompt.slice(0, 50)}`,
          description: `AI-generated image using DALL-E 3: "${prompt}"`,
          style: "DALL-E 3",
          dimensions: {
            width: 1024,
            height: 1024
          }
        }

        console.log('🎨 [DALL-E FALLBACK] DALL-E 3 image generated successfully')

        // Record usage if user is authenticated
        if (user?.id) {
          try {
            await dailyLimits.recordUsage(user.id, modelId)
            console.log('🎨 [DALL-E FALLBACK] Usage recorded for user:', user.id)
          } catch (error) {
            console.error('Failed to record image generation usage:', error)
          }
        }

        return {
          success: true,
          result: realResult,
          model: 'dall-e-3-fallback'
        }
      }
    } catch (sdkError) {
      console.error('🎨 [IMAGE GENERATION] All providers failed:', sdkError)
      
      // Fallback to mock for now
      const mockResult = {
        imageUrl: `https://via.placeholder.com/1024x1024/4F46E5/FFFFFF?text=${encodeURIComponent(prompt.slice(0, 50))}`,
        title: `Generated Image: ${prompt.slice(0, 50)}`,
        description: `AI-generated image based on: "${prompt}"`,
        style: "Digital Art",
        dimensions: {
          width: 1024,
          height: 1024
        }
      }

      console.log('🎨 [MOCK FALLBACK] All providers failed, using placeholder image')

      // Record usage if user is authenticated
      if (user?.id) {
        try {
          await dailyLimits.recordUsage(user.id, modelId)
          console.log('🎨 [MOCK FALLBACK] Usage recorded for user:', user.id)
        } catch (error) {
          console.error('Failed to record image generation usage:', error)
        }
      }

      return {
        success: true,
        result: mockResult,
        model: modelId
      }
    }

  } catch (error) {
    console.error('🎨 [IMAGE GENERATION] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      model: 'openrouter:google/gemini-2.5-flash-image-preview'
    }
  }
}

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

  // Normalize model ID early and also keep original with prefix
  const originalModel = model
  let normalizedModel = normalizeModelId(model)
  console.log('[ChatAPI] Incoming model:', originalModel, 'normalized:', normalizedModel, 'isAuthenticated:', isAuthenticated)

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
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser()
        if (authErr || !authData?.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }
        if (authData.user.id !== userId) {
          console.warn('[ChatAPI] userId mismatch; using authenticated id', { provided: userId, auth: authData.user.id })
        }
        realUserId = authData.user.id
      } catch (e) {
        console.error('[ChatAPI] Failed to resolve authenticated user', e)
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      }
    }

  const userMessage = messages[messages.length - 1]

    // Extract text content from user message for image generation detection
    let userMessageText = ""
    if (userMessage?.role === "user") {
      // Handle AI SDK v5 structure (parts) or legacy structure (content)
      if ((userMessage as any).parts && Array.isArray((userMessage as any).parts)) {
        // AI SDK v5 structure with parts
        const textParts = (userMessage as any).parts
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text || "")
          .join(" ")
        userMessageText = textParts
      } else if ((userMessage as any).content) {
        // Legacy structure with content
        const content = (userMessage as any).content
        if (typeof content === "string") {
          userMessageText = content
        } else if (Array.isArray(content)) {
          // Extract text from multimodal content
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text || part.content || "")
            .join(" ")
          userMessageText = textParts
        }
      }
    }

  // 🎨 IMAGE GENERATION DETECTION
  const isImageModel = isImageGenerationModel(originalModel)
    
    if (userMessageText && isImageModel) {
      console.log('🎨 [IMAGE GENERATION] Image generation model detected, generating image for:', userMessageText)

      try {
        // Call OpenRouter FLUX image generation function
        const imageResult = await generateImageDirectWithGoogle(userMessageText, isAuthenticated ? userId : undefined)

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
            console.error('🎨 [IMAGE GENERATION] Failed:', imageResult.error || 'Unknown error')
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
          console.error('🎨 [IMAGE GENERATION] Error calling endpoint:', error)
          // Fall through to normal chat processing
        }
    }

    // ------------------------------------------------------------------
    // GLOBAL REQUEST CONTEXT (AsyncLocalStorage) - must wrap the remainder
    // ------------------------------------------------------------------
    const outerRequestId = randomUUID()
    // Hoisted variables that will be populated inside globalCtxRun and used later
  let finalSystemPrompt: string = ''
    let convertedMessages: any
    let toolsForRun: any
    let providerOptions: Record<string, any> | undefined
    let activeTools: string[] | undefined
    let modelConfig: any
    let apiKey: string | undefined
    const globalCtxRun = async () => {
      console.log('[ChatAPI] 🔐 Global request context established', { userId: realUserId, requestId: outerRequestId })

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
  model: normalizedModel,
        isAuthenticated,
        message_group_id,
      })
    }

    // Resolve model config and establish effective system prompt
  const allModels = await getAllModels()
  const resolution = resolveModelFromList(originalModel, allModels)
  if (resolution.usedFallback) {
    console.warn(`[ChatAPI] Model ${originalModel} not found in registry; using fallback ${resolution.normalizedModel}`)
  }
  modelConfig = resolution.modelConfig
  normalizedModel = resolution.normalizedModel
    if (!modelConfig.apiSdk && !originalModel.startsWith('langchain:')) {
      throw new Error(`Model ${modelConfig.id} has no API SDK configured`)
    }

    // --- Delegation Intent Heuristics (Lote 1) ---
    // Evaluate user last message intent BEFORE prompt assembly so we can inject a system hint if strong.
    let delegationIntent: ReturnType<typeof scoreDelegationIntent> | null = null
    try {
      const lastUser = [...messages].reverse().find(m => m.role === 'user')
      let lastUserPlain = ''
      if (lastUser) {
        if (typeof (lastUser as any).content === 'string') lastUserPlain = (lastUser as any).content
        else if (Array.isArray((lastUser as any).content)) {
          lastUserPlain = (lastUser as any).content
            .filter((p: any) => p?.type === 'text')
            .map((p: any) => p.text || p.content || '')
            .join('\n')
        } else if (Array.isArray((lastUser as any).parts)) {
          lastUserPlain = (lastUser as any).parts
            .filter((p: any) => p?.type === 'text')
            .map((p: any) => p.text || p.content || '')
            .join('\n')
        }
      }
      if (lastUserPlain.trim()) {
        delegationIntent = scoreDelegationIntent(lastUserPlain, { debug: debugDelegation })
      }
    } catch (e) {
      console.warn('[DelegationIntent] heuristic failed', e)
    }

    // Use reasoning-optimized prompt for GPT-5 models when no custom prompt
    let baseSystemPrompt = systemPrompt || SYSTEM_PROMPT_DEFAULT
    if (normalizedModel.startsWith('gpt-5') && !systemPrompt) {
      const { getCleoPrompt } = await import("@/lib/prompts")
      baseSystemPrompt = getCleoPrompt(normalizedModel, 'reasoning')
      console.log(`[GPT-5] Using reasoning-optimized prompt for ${normalizedModel}`)
    }
  // If strong delegation intent (score >= 0.55) add lightweight internal system hint.
  // Avoid mentioning scores to the model; just nudge tool selection.
  if (delegationIntent?.target && delegationIntent.score >= 0.55) {
    const agentKey = delegationIntent.target
    // Derive tool name from agent key pattern delegate_to_<normalized_name>
    const normalized = agentKey.replace(/[^a-z0-9]+/g, '_')
    const toolName = `delegate_to_${normalized}`
    baseSystemPrompt += `\n\nINTERNAL DELEGATION HINT: The user's request likely maps to specialist agent '${agentKey}'. Consider calling tool ${toolName} if it would provide unique capabilities or faster resolution. If you delegate, briefly explain why.`
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
        console.log(`[ChatAPI] Removed ${before - after} system messages from payload to satisfy provider constraints`)
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
  console.log(`[IMAGE MGMT] Model ${normalizedModel}: ${totalImages} images found, limit: ${imageLimit}`)
    if (totalImages > imageLimit) {
  convertedMessages = filterImagesByModelLimit(convertedMessages, normalizedModel) as any
      console.log(`[IMAGE MGMT] Filtered to ${imageLimit} images with intelligent prioritization`)
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

  // Inject userId and model into request-scoped context (already resolved earlier as realUserId)
  ;(globalThis as any).__currentUserId = realUserId
  ;(globalThis as any).__currentModel = normalizedModel

      // Build final system prompt using centralized prompt builder (handles RAG, personalization, and search guidance)
  const promptBuild = await buildFinalSystemPrompt({
        baseSystemPrompt: effectiveSystemPrompt,
  model: normalizedModel,
        messages,
        supabase,
        realUserId,
        enableSearch,
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
            mode: enableSearch ? 'auto' : 'off',
            returnCitations: enableSearch ? true : false,
          },
        },
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

    // Ensure all delegation tools are present (non-forcing) so model can choose.
    try {
      const agents = await getAllAgentsUnified()
      for (const a of agents) {
        if (a.role !== 'supervisor') {
          ensureDelegationToolForAgent(a.id, a.name)
        }
      }
      // After ensuring, refresh registry reference (tools is mutated inside helper)
  toolsForRun = tools as typeof tools
    } catch (e) {
      console.warn('[ChatAPI] Failed to ensure delegation tools', e)
    }

    // Provider-specific tool name normalization
    try {
      const provider = getProviderForModel(originalModel as any)
      if (provider === 'google' || originalModel.includes('gemini')) {
  toolsForRun = sanitizeGeminiTools(toolsForRun as any) as any
  activeTools = Object.keys(toolsForRun)
        console.log('[ChatAPI] Gemini tool names sanitized for function_declarations')
      }
    } catch {}

    // Optional delegation-only toolset for general chat
    // When CHAT_DELEGATION_ONLY=true, expose only delegate_to_* tools (+ minimal helpers)
    try {
      if (process.env.CHAT_DELEGATION_ONLY === 'true') {
        const agents = await getAllAgentsUnified()
        // Ensure delegation tools exist for all specialist agents
        const delegateToolNames: string[] = []
        for (const a of agents) {
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
      console.warn('[ChatAPI] Delegation-only tools setup failed:', e)
    }

    // If the selected model is not tool-capable, disable tools to avoid provider errors
    try {
      if (modelConfig && modelConfig.tools === false) {
  const hadTools = Object.keys(toolsForRun || {}).length > 0
        if (hadTools) {
          console.warn(`[ChatAPI] Model ${normalizedModel} does not support tools; disabling tools for this run`)
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
  const intelligentFlag = !!intelligentDelegation && intelligentDelegation.confidence > 0.6
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
  const orchestratorBacked = model?.startsWith('agents:') || process.env.GLOBAL_CHAT_SUPERVISED === 'true' || impliesDelegation

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
          const orchestrator = getAgentOrchestrator() as any
        const lastMsg = messages[messages.length - 1]
        const userText = Array.isArray((lastMsg as any)?.parts)
          ? ((lastMsg as any).parts.find((p: any) => p.type === 'text')?.text || '')
          : (typeof (lastMsg as any)?.content === 'string' ? (lastMsg as any).content : '')

        // Ensure a thread for Cleo-supervisor (supervised)
        let effectiveThreadId: string | null = null
        if (supabase && realUserId) {
          try {
            const compositeAgentKey = `cleo-supervisor_supervised`
            const { data } = await (supabase as any)
              .from('agent_threads')
              .select('id')
              .eq('user_id', realUserId)
              .eq('agent_key', compositeAgentKey)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            effectiveThreadId = data?.id || null
            if (!effectiveThreadId) {
              const created = await (supabase as any)
                .from('agent_threads')
                .insert({ user_id: realUserId, agent_key: compositeAgentKey, agent_name: 'Cleo', title: 'Cleo (Supervised Chat)' })
                .select('id')
                .single()
              effectiveThreadId = created?.data?.id || null
            }
            // Save the user message
            if (effectiveThreadId && userText) {
              await (supabase as any).from('agent_messages').insert({
                thread_id: effectiveThreadId,
                user_id: realUserId,
                role: 'user',
                content: userText,
                metadata: { conversation_mode: 'supervised', source: 'global-chat' }
              })
            }
          } catch {}
        }

        // Build minimal prior (we avoid replaying tool messages)
        const prior: Array<{ role: 'user'|'assistant'|'system'; content: string; metadata?: any }> = []
        const exec = await (orchestrator.startAgentExecutionForUI?.(
          userText,
          'cleo-supervisor',
          effectiveThreadId || undefined,
          realUserId || undefined,
          prior,
          true
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
        
        const stopPolling = () => {
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
        }
        
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            // Set up pipeline event controller for delegation events
            setPipelineEventController(controller, encoder)
            
            function send(obj: any) {
              try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)) } catch {}
            }
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
                const snapshot = execId ? orchestrator.getExecution?.(execId) : null

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
                    
                    // Debug: Log step structure to understand what we're getting
                    console.log('🔍 [PIPELINE DEBUG] Step received:', {
                      id: step?.id,
                      action: step?.action,
                      agent: step?.agent,
                      content: step?.content?.slice(0, 100),
                      metadata: step?.metadata
                    })
                    
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
                      const targetName = target === 'ami-creative' ? 'Ami' : (target || 'Agent')
                      
                      // Send a simple live update step that will evolve
                      const liveStep = {
                        id: `live-${delegationKey}-${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        agent: target,
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
                      
                      console.log('✅ [PIPELINE DEBUG] Live delegation step sent')
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
                    action: 'reviewing' as const,
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
                    } catch {}
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
          // Fallback to normal streaming
        }
    }
    // (rest of original logic continues under global context)
    // If execution path not returned earlier, continue with direct model streaming logic below (existing code after this block)
    
  } // end globalCtxRun body

  // Ejecutar la parte superior (hasta orquestatorBacked) dentro del contexto, luego continuar fuera reutilizando variables ya preparadas.
  const earlyResponse = await withRequestContext({ userId: realUserId, model: normalizedModel, requestId: outerRequestId }, globalCtxRun)
  if (earlyResponse) {
    return earlyResponse as any
  }

    // Prepare additional parameters for reasoning models
  const resultStart = Date.now()
  const { onError, onFinish, onToolResult } = makeStreamHandlers({
    supabase,
    chatId,
    message_group_id,
    model,
    realUserId,
    finalSystemPrompt,
    convertedMessages,
    resultStart,
  })

    // If tools are required (either because user enabled search or because tool registry is non-empty)
    // and the selected model doesn't support tools, switch to a tool-capable fallback for this request only.
    // We prefer DeepSeek Chat v3.1 (free via OpenRouter) which we know supports tools.
    let effectiveModelId = originalModel
    try {
      const wantsTools = enableSearch || (toolsForRun && Object.keys(toolsForRun).length > 0)
      if (wantsTools && modelConfig.tools === false) {
        console.warn(`[ChatAPI] Swapping non-tool model ${normalizedModel} to tool-capable fallback 'openrouter:deepseek/deepseek-chat-v3.1:free' for this request`)
        effectiveModelId = 'openrouter:deepseek/deepseek-chat-v3.1:free'
      }
    } catch {}

    const effectiveModelConfig = effectiveModelId === originalModel
      ? modelConfig
      : (await getAllModels()).find((m) => m.id === effectiveModelId)

    const modelInstance = effectiveModelConfig?.apiSdk ? effectiveModelConfig.apiSdk(apiKey, { enableSearch }) : undefined
    const additionalParams: any = {
      // Pass only the provider-specific apiKey; let each SDK fall back to its own env var
  model: modelInstance!,
      system: finalSystemPrompt,
      messages: convertedMessages,
      tools: toolsForRun,
  ...(providerOptions ? { providerOptions } : {}),
  ...(activeTools ? { activeTools } : {}),
  // Avoid step cap when using xAI native Live Search to prevent early termination mid-search
  ...(!(model === 'grok-3-mini' && enableSearch) ? { stopWhen: stepCountIs(8) } : {}),
      onError,
      onFinish,
      onToolResult,
  }

    // Apply model-specific default params when available
    if (modelConfig.defaults) {
      const { temperature, topP, maxTokens } = modelConfig.defaults
      if (typeof temperature === 'number') (additionalParams as any).temperature = temperature
      if (typeof topP === 'number') (additionalParams as any).topP = topP
      if (typeof maxTokens === 'number') (additionalParams as any).maxTokens = maxTokens
    }

    // OpenAI Responses API: some GPT-5 variants (e.g., gpt-5-mini-2025-08-07) reject 'temperature'/'top_p'.
    // When using Smarter (gpt-5-mini-2025-08-07), strip these params to avoid 400 invalid_request_error.
    if (normalizedModel === 'gpt-5-mini-2025-08-07') {
      if ('temperature' in additionalParams) {
        delete (additionalParams as any).temperature
      }
      if ('topP' in additionalParams) {
        delete (additionalParams as any).topP
      }
      console.log('[GPT-5-mini] Stripped temperature/topP for Responses API compatibility')
    }

  // Clamp max output tokens to provider-safe limits using the original model id (includes provider prefixes)
  additionalParams.maxTokens = clampMaxOutputTokens(originalModel, additionalParams.maxTokens)
    
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

  const result = await streamText(additionalParams)

    // Placeholder: High-score missed tracking (will emit after model run if no delegation tool was called)
    // We would inspect tool invocation results in onFinish handler (already wired) — if none match delegate_to_* and delegationIntent.score >= 0.75 emit event.
    // Implementation deferred to dedicated task (todo id 12).

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
        return "An error occurred processing your request. If you uploaded a large file, try with a smaller one."
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

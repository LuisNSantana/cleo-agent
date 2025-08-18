import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { retrieveRelevant, buildContextBlock } from '@/lib/rag/retrieve'
import { indexDocument } from '@/lib/rag/index-document'
import { getAllModels } from "@/lib/models"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { tools } from "@/lib/tools"
import { filterImagesForModel, MODEL_IMAGE_LIMITS } from "@/lib/image-management"
import type { ProviderWithoutOllama } from "@/lib/user-keys"
import { stepCountIs, streamText } from "ai"
import type { CoreMessage } from "ai"
import {
  incrementMessageCount,
  logUserMessage,
  storeAssistantMessage,
  validateAndTrackUsage,
} from "./api"
import { createErrorResponse } from "./utils"

// Ensure Node.js runtime so server env vars (e.g., GROQ_API_KEY) are available
export const runtime = "nodejs"

export const maxDuration = 60

type ChatRequest = {
  messages: CoreMessage[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
  enableSearch: boolean
  message_group_id?: string
  documentId?: string // optional: restrict RAG retrieval to a single document
  debugRag?: boolean // optional: extra logging / echo
}

export async function POST(req: Request) {
  try {
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
    } = (await req.json()) as ChatRequest

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

    const allModels = await getAllModels()
    const modelConfig = allModels.find((m) => m.id === model)

    if (!modelConfig || !modelConfig.apiSdk) {
      throw new Error(`Model ${model} not found`)
    }

    // Use reasoning-optimized prompt for GPT-5 models
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
    const convertedMessages = await Promise.all(
      messages.map(async (msg) => {
        // Only process user messages with multimodal content
        if (msg.role === "user" && Array.isArray(msg.content)) {
          const convertedContent = await Promise.all(
            msg.content
              .filter(
                (part: unknown) =>
                  part &&
                  typeof part === "object" &&
                  "type" in part &&
                  ((part as { type: string }).type === "text" ||
                    (part as { type: string }).type === "file")
              )
              .map(async (part: unknown) => {
                const typedPart = part as {
                  type: string
                  mediaType?: string
                  url?: string
                  name?: string
                  text?: string
                  content?: string
                }
                // Convert image file parts to standard AI SDK v5 image format
                if (
                  typedPart.type === "file" &&
                  typedPart.mediaType?.startsWith("image/") &&
                  typedPart.url
                ) {
                  // Verify model supports vision
                  if (!modelConfig.vision) {
                    return {
                      type: "text" as const,
                      text: `[IMAGEN: ${typedPart.name || "imagen.jpg"}] - El modelo ${model} no soporta análisis de imágenes. Para analizar imágenes, selecciona Faster o Smarter que tienen capacidades de visión avanzadas.`,
                    }
                  }

                  console.log(
                    `Processing image: ${typedPart.name}, model: ${model}, vision support: ${modelConfig.vision}`
                  )

                  return {
                    type: "image" as const,
                    image: typedPart.url, // Data URL from frontend
                  }
                }
                // Convert document file parts to text with actual content
                if (
                  typedPart.type === "file" &&
                  !typedPart.mediaType?.startsWith("image/") &&
                  typedPart.url
                ) {
                  const fileName = typedPart.name || "document"
                  let fileType = typedPart.mediaType || "unknown"

                  // Normalize MIME type based on file extension if generic
                  if (
                    fileType === "application/octet-stream" ||
                    fileType === "unknown"
                  ) {
                    const extension = fileName.toLowerCase().split(".").pop()
                    const extensionToMime: { [key: string]: string } = {
                      md: "text/markdown",
                      txt: "text/plain",
                      csv: "text/csv",
                      json: "application/json",
                      pdf: "application/pdf",
                      doc: "application/msword",
                      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    }
                    if (extension && extensionToMime[extension]) {
                      fileType = extensionToMime[extension]
                    }
                  }

                  // Extract content from data URL
                  let documentContent = ""
                  try {
                    if (typedPart.url.startsWith("data:")) {
                      const base64Data = typedPart.url.split(",")[1]
                      if (base64Data) {
                        // For text-based files, decode as text
                        if (
                          fileType.startsWith("text/") ||
                          fileType.includes("markdown") ||
                          fileType.includes("json") ||
                          fileType.includes("csv")
                        ) {
                          documentContent = atob(base64Data)
                        } else if (fileType === "application/pdf") {
                          // Use the new PDF processing function for better extraction
                          try {
                            const pdfBuffer = Buffer.from(base64Data, "base64")
                            const { extractPdfText } = await import(
                              "@/lib/file-processing"
                            )
                            const extractedText =
                              await extractPdfText(pdfBuffer)
                            documentContent = extractedText
                          } catch (error) {
                            console.error(
                              `Error extracting PDF content from ${fileName}:`,
                              error
                            )
                            // Fallback for PDF processing errors with more specific guidance
                            if (
                              model === "grok-3-mini" ||
                              model === "gpt-5-mini-2025-08-07"
                            ) {
                              documentContent = `[ARCHIVO PDF - ${fileName}]

⚠️ El PDF es demasiado grande para procesar automáticamente.

**Opciones disponibles:**
1. **Pregunta específica:** Describe qué información necesitas del documento
2. **Capturas de pantalla:** Toma fotos de las páginas relevantes - Los modelos Faster y Smarter pueden analizar imágenes
3. **Archivo más pequeño:** Usa un PDF de menos de 20 páginas
4. **Texto directo:** Copia y pega las secciones específicas que necesitas

💡 **Tip:** Las imágenes del documento funcionan muy bien con estos modelos.`
                            } else {
                              documentContent = `[PDF Document: ${fileName}] - Documento muy grande. Usa Faster o Smarter para mejor análisis de documentos, o convierte a texto/imágenes.`
                            }
                          }
                        } else {
                          // For other binary files, indicate that content extraction is needed
                          documentContent = `[Archivo binario: ${fileName}. Tipo: ${fileType}]
                      
Este archivo requiere procesamiento especializado. Para mejor análisis:
1. Para imágenes: usa Faster o Smarter 
2. Para documentos Office: convierte a PDF o texto
3. Para texto específico: copia y pega directamente

¿Puedes proporcionar más contexto sobre qué tipo de análisis necesitas de este archivo?`
                        }
                      }
                    }
                  } catch (error) {
                    console.error(
                      `Error decoding document content for ${fileName}:`,
                      error
                    )
                    documentContent = `[Error leyendo el contenido del documento ${fileName}. Por favor, intenta subir el archivo nuevamente o proporciona el contenido como texto.]`
                  }

                  const finalText = `📄 [${fileName}]

${documentContent}`

                  return {
                    type: "text" as const,
                    text: finalText,
                  }
                }
                // Ensure text parts have the correct structure
                if (
                  typedPart.type === "text" &&
                  (typedPart.text || typedPart.content)
                ) {
                  return {
                    type: "text" as const,
                    text: typedPart.text || typedPart.content || "",
                  }
                }
                // Return a default text part for invalid content
                return {
                  type: "text" as const,
                  text: "",
                }
              })
          )

          const filteredContent = convertedContent.filter(
            (part) =>
              (part.type === "text" && part.text !== "") ||
              part.type === "image"
          ) // Remove empty text parts

          // If no valid content, convert to simple text message
          if (filteredContent.length === 0) {
            return {
              ...msg,
              content: typeof msg.content === "string" ? msg.content : "",
            }
          }

          return { ...msg, content: filteredContent }
        }

        // For non-user messages or simple string content, return as-is
        return msg
      })
    )

    // Log conversion summary and count images
    const convertedMultimodal = convertedMessages.filter((msg) =>
      Array.isArray(msg.content)
    )
    
    // Apply intelligent image filtering to prevent API errors
    const imageLimit = MODEL_IMAGE_LIMITS[model]?.maxImages || MODEL_IMAGE_LIMITS.default.maxImages
    
    // Count total images in the conversation
    let totalImages = 0
    convertedMessages.forEach(msg => {
      if (Array.isArray(msg.content)) {
        totalImages += msg.content.filter(part => part.type === 'image').length
      }
    })
    
    console.log(`[IMAGE MGMT] Model ${model}: ${totalImages} images found, limit: ${imageLimit}`)
    
    // If too many images, apply intelligent filtering
    if (totalImages > imageLimit) {
      console.log(`[IMAGE MGMT] Applying intelligent image filtering`)
      
      // Collect all images with priority scoring
      const imageRefs: Array<{
        msgIdx: number
        partIdx: number
        priority: number
        isCanvas: boolean
      }> = []
      
      convertedMessages.forEach((msg, msgIdx) => {
        if (Array.isArray(msg.content)) {
          msg.content.forEach((part, partIdx) => {
            if (part.type === 'image') {
              const isCanvas = typeof part.image === 'string' && part.image.includes('data:image') && msg.role === 'user'
              const isRecent = msgIdx >= convertedMessages.length - 3
              
              let priority = 0
              if (isCanvas) priority += 100 // Canvas drawings get highest priority
              if (isRecent) priority += 50 // Recent messages
              priority += msgIdx * 10 // More recent = higher priority
              
              imageRefs.push({
                msgIdx,
                partIdx,
                priority,
                isCanvas
              })
            }
          })
        }
      })
      
      // Sort by priority and keep top images
      const keepImages = imageRefs
        .sort((a, b) => b.priority - a.priority)
        .slice(0, imageLimit)
        .map(ref => `${ref.msgIdx}-${ref.partIdx}`)
      
      // Filter messages
      for (let i = 0; i < convertedMessages.length; i++) {
        const msg = convertedMessages[i]
        if (Array.isArray(msg.content)) {
          const filteredContent: any[] = []
          
          msg.content.forEach((part, partIdx) => {
            if (part.type === 'image') {
              const key = `${i}-${partIdx}`
              if (keepImages.includes(key)) {
                filteredContent.push(part)
              } else {
                filteredContent.push({
                  type: 'text' as const,
                  text: '[Image removed due to model limit - Canvas drawings are prioritized]'
                })
              }
            } else {
              filteredContent.push(part)
            }
          })
          
          ;(convertedMessages[i] as any).content = filteredContent
        }
      }
      
      console.log(`[IMAGE MGMT] Filtered to ${imageLimit} images with intelligent prioritization`)
    }
    
    if (convertedMultimodal.length > 0) {
    }

    let apiKey: string | undefined
    if (isAuthenticated && userId) {
      const { getEffectiveApiKey } = await import("@/lib/user-keys")
      const provider = getProviderForModel(model)
      apiKey =
        (await getEffectiveApiKey(userId, provider as ProviderWithoutOllama)) ||
        undefined
    }

    // Inject userId and model into global context for tools that need it
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

    // RAG retrieval when enableSearch flag is true
    // We'll collect context chunks here and later add them as their own system message block
    let ragSystemAddon = ''
    if (retrievalRequested) {
      try {
        const lastUser = messages.slice().reverse().find(m => m.role === 'user')
        let userPlain = ''
        if (lastUser) {
          if (typeof lastUser.content === 'string') userPlain = lastUser.content
          else if (Array.isArray(lastUser.content)) {
            userPlain = lastUser.content
              .filter((p: any) => p?.type === 'text')
              .map((p: any) => p.text || p.content || '')
              .join('\n')
          }
        }
        if (userPlain.trim()) {
          // Essential RAG logging only
          // DEBUG: List user's documents and chunks
          try {
            const { data: userDocs, error: docsError } = await (supabase as any)
              .from('documents')
              .select('id, title, filename, created_at')
              .eq('user_id', realUserId)
              .order('created_at', { ascending: false })
              .limit(5)
            
            if (!docsError && userDocs) {
              console.log('[RAG] DEBUG - User has', userDocs.length, 'documents:')
              userDocs.forEach((doc: any) => console.log(`  - ${doc.title || doc.filename} (${doc.id})`))
            }

            const { data: userChunks, error: chunksError } = await (supabase as any)
              .from('document_chunks')
              .select('document_id, content')
              .eq('user_id', realUserId)
              .limit(3)
            
            if (!chunksError && userChunks) {
              console.log('[RAG] DEBUG - User has', userChunks.length, 'total chunks')
              userChunks.forEach((chunk: any, i: number) => console.log(`  - Chunk ${i + 1}: "${chunk.content.slice(0, 100)}..."`))
            }
          } catch (e: any) {
            console.log('[RAG] DEBUG - Failed to list user documents:', e.message)
          }
          
          let retrieved = await retrieveRelevant({ 
            userId: realUserId, 
            query: userPlain, 
            topK: 6, 
            documentId,
            useHybrid: true,
            useReranking: true
          })
          if (retrieved.length) {
            ragSystemAddon = buildContextBlock(retrieved)
            console.log('[RAG] Retrieved', retrieved.length, 'chunks. Top similarity:', retrieved[0]?.similarity)
            // Feature analytics: RAG retrieval used
            try {
              if (supabase && realUserId) {
                const { trackFeatureUsage } = await import('@/lib/analytics')
                await trackFeatureUsage(realUserId, 'rag.retrieve', { delta: 1 })
              }
            } catch {}
            // DEBUG: Log what documents we're getting
            console.log('[RAG] DEBUG - Retrieved document titles:', retrieved.map(r => r.metadata?.title || r.metadata?.filename || 'No title').slice(0, 3))
            // DEBUG: Show actual context being sent to model
            console.log('[RAG] DEBUG - Context preview being sent to model:')
            console.log('=== RAG CONTEXT START ===')
            console.log(ragSystemAddon.slice(0, 1000))
            console.log('=== RAG CONTEXT END ===')
            if (debugRag) {
              console.log('[RAG] Context preview:\n' + ragSystemAddon.slice(0,400))
            }
          } else {
            console.log('[RAG] No chunks retrieved initially. Attempting auto-index of recent docs...')
            if (!documentId) {
              // fetch last 3 documents and ensure chunks exist; index if missing
              try {
                if (supabase) {
                  const { data: docs } = await (supabase as any).from('documents').select('id, updated_at').eq('user_id', realUserId).order('updated_at', { ascending: false }).limit(3)
                  if (docs?.length) {
                    for (const d of docs) {
                      const { count } = await (supabase as any).from('document_chunks').select('id', { count: 'exact', head: true }).eq('document_id', d.id)
                      if (!count || count === 0) {
                        console.log('[RAG] Auto-indexing doc', d.id)
                        try { await indexDocument(d.id, { force: true }) } catch (e:any){ console.error('[RAG] Auto-index doc failed', d.id, e.message) }
                      }
                    }
                    // retry retrieval once
                    retrieved = await retrieveRelevant({ 
                      userId: realUserId, 
                      query: userPlain, 
                      topK: 6,
                      useHybrid: true,
                      useReranking: true
                    })
                    if (retrieved.length) {
                      ragSystemAddon = buildContextBlock(retrieved)
                      console.log('[RAG] Retrieved after auto-index', retrieved.length)
                    } else {
                      console.log('[RAG] Still no chunks after auto-index.')
                    }
                  }
                }
              } catch (e:any) {
                console.error('[RAG] Auto-index attempt failed', e.message)
              }
            } else {
              console.log('[RAG] No chunks for specified document.')
            }
          }

          // Multi-pass personalization retrieval: if we have <3 chunks, run a synthetic profile query to pull user profile info
          if (ragSystemAddon && ragSystemAddon.trim().length > 0) {
            const currentChunkCount = (ragSystemAddon.match(/\n---\n/g) || []).length
            if (currentChunkCount < 3) {
              try {
                // Try secondary profile retrieval for personalization
                const profileQuery = 'perfil del usuario nombre intereses gustos comida favorita hobbies preferencias biografia datos personales';
                const extra = await retrieveRelevant({ 
                  userId: realUserId, 
                  query: profileQuery, 
                  topK: 6, 
                  documentId,
                  useHybrid: true,
                  useReranking: true
                })
                // Merge unique extra chunks not already present
                const existingIds = new Set((ragSystemAddon.match(/doc:([0-9a-fA-F-]{8})/g) || []))
                const merged = [...extra]
                if (extra.length) {
                  const extraBlock = buildContextBlock(extra)
                  if (extraBlock && extraBlock.length > 0) {
                    ragSystemAddon += '\n' + extraBlock
                  }
                }
              } catch (e:any) {
                // Secondary profile retrieval failed
              }
            }
          }

          // If still nothing, surface hint (only when debug)
          if (!ragSystemAddon && debugRag) {
            console.log('[RAG] Diagnostic: No context. Possible reasons: (1) documentos sin chunks (2) embeddings fallaron (3) user_id mismatch (4) texto muy corto. Recomendado: crear un documento "perfil_usuario.md" con lineas: Nombre:, Comida favorita:, Intereses:, Hobbies:, Objetivos:, Estilo de comunicación:')
          }
        }
      } catch (e) {
        console.error('RAG retrieval failed', e)
      }
    }

  // Build final system prompt. We PREPEND the context so it has higher salience for the model.
    const personalizationInstruction = `IMPORTANT: ALWAYS use information from the CONTEXT to respond. This includes:
- Personal information (name, interests, favorite food, hobbies, communication style)  
- Work documents, stories, projects, notes that the user has uploaded
- Any content the user has shared previously

If the user asks about something that is in the CONTEXT, use it directly to respond. DO NOT say you don't have information if it's available in the context.

SPECIAL RULE FOR DOCUMENTS: If the user wants to "work on", "edit", "collaborate", "expand", "continue", "review" a document found in the context, ALWAYS suggest opening the document in the Canvas Editor. Use phrases like: "Would you like me to open [document name] in the collaborative editor so we can work on it together?"`
    // Model-specific search guidance (avoid generic webSearch tool for xAI native live search)
    const searchGuidance = (model === 'grok-3-mini' && enableSearch)
      ? `\n\nSEARCH MODE: For Faster (grok-3-mini), use native Live Search (built into the model). Do NOT call the webSearch tool. Include citations when available.`
      : ''

    const finalSystemPrompt = ragSystemAddon
      ? `${ragSystemAddon}\n\n${personalizationInstruction}${searchGuidance}\n\n${effectiveSystemPrompt}`
      : `${effectiveSystemPrompt}${searchGuidance}`

    console.log('[RAG] Using context?', !!ragSystemAddon, 'Final system prompt length:', finalSystemPrompt.length)

  // Safe env diagnostics (no secrets)
    const hasGroqKey = !!process.env.GROQ_API_KEY
    if (!hasGroqKey) {
      console.warn('[Env] GROQ_API_KEY not found in process.env at /api/chat runtime')
    }

    // Attach a per-request id so tools (like webSearch) can throttle sanely per request
    try {
      (globalThis as any).__requestId = crypto.randomUUID?.() ?? `r-${Date.now()}-${Math.random().toString(36).slice(2)}`
    } catch {
      (globalThis as any).__requestId = `r-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }

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

    // Prepare additional parameters for reasoning models
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
      onError: (err: unknown) => {
        console.error("Streaming error occurred:", err)
      },
      onFinish: async ({ response, usage }: { response: any, usage?: any }) => {
        // Clean up global context
        delete (globalThis as any).__currentUserId
        delete (globalThis as any).__currentModel
        delete (globalThis as any).__requestId
        
        if (supabase) {
          // Use real tokens from AI SDK if available, fallback to estimation
          let inputTokens: number
          let outputTokens: number
          let cachedInputTokens: number = 0
          
          if (usage?.promptTokens && usage?.completionTokens) {
            // Use real tokens from AI SDK
            inputTokens = usage.promptTokens
            outputTokens = usage.completionTokens
            // Some providers expose cached prompt tokens
            const maybeCached = (usage as any)?.cachedPromptTokens || (usage as any)?.promptTokensDetails?.cached || 0
            if (typeof maybeCached === 'number' && maybeCached > 0) {
              cachedInputTokens = maybeCached
            }
            console.log(`[Chat] Using real tokens - Input: ${inputTokens}, Output: ${outputTokens}${cachedInputTokens ? `, CachedIn: ${cachedInputTokens}` : ''}`)
          } else {
            // Fallback: Estimate tokens using character count
            const est = (s: string) => Math.ceil((s || '').length / 4)
            const inputText = [finalSystemPrompt, ...convertedMessages.map((m) => {
              if (typeof m.content === 'string') return m.content
              if (Array.isArray(m.content)) {
                return m.content
                  .filter((p: any) => p && typeof p === 'object' && p.type === 'text')
                  .map((p: any) => p.text || p.content || '')
                  .join('\n\n')
              }
              return ''
            })].join('\n\n')
            const outputText = (() => {
              try {
                const msgs = response?.messages ?? []
                const last = [...msgs].reverse().find((m: any) => m.role === 'assistant')
                if (!last) return ''
                if (typeof last.content === 'string') return last.content
                if (Array.isArray(last.content)) {
                  return last.content
                    .filter((p: any) => p && typeof p === 'object' && (
                      p.type === 'text' || p.type === 'reasoning'
                    ))
                    .map((p: any) => p.text || p.reasoning || '')
                    .join('\n\n')
                }
                return ''
              } catch { return '' }
            })()
            inputTokens = est(inputText)
            outputTokens = est(outputText)
            console.log(`[Chat] Using estimated tokens - Input: ${inputTokens}, Output: ${outputTokens}`)
          }
          const responseTimeMs = Math.max(0, Date.now() - resultStart)

          await storeAssistantMessage({
            supabase,
            chatId,
            messages:
              response.messages as unknown as import("@/app/types/api.types").Message[],
            message_group_id,
            model,
            userId: realUserId,
            inputTokens,
            outputTokens,
            responseTimeMs,
          })

          // Best-effort: update model usage analytics via RPC, ignore errors
          try {
            const { analytics } = await import('@/lib/supabase/analytics-helpers')
            console.log(`[Analytics] Calling updateModelUsage with userId: ${realUserId}, model: ${model}, tokens: ${inputTokens}/${outputTokens}${cachedInputTokens ? ` (cached_in:${cachedInputTokens})` : ''}`)
            const result = await analytics.updateModelUsage(realUserId, model, inputTokens, outputTokens, responseTimeMs, true, cachedInputTokens)
            if (result.error) {
              console.error('[Analytics] updateModelUsage RPC error:', result.error)
            } else {
              console.log('[Analytics] updateModelUsage successful')
            }
          } catch (e) {
            console.log('[Analytics] updateModelUsage error:', (e as any)?.message)
          }
        }
      },
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

  const resultStart = Date.now()
  const result = streamText(additionalParams)

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
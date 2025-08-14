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

    console.log('[RAG] Incoming chat request flags', { enableSearch, documentId, debugRag })
    
    // Auto-enable RAG for personalized responses - always try to retrieve user context
    const autoRagEnabled = true
    const retrievalRequested = enableSearch || !!documentId || autoRagEnabled
    if (!retrievalRequested) {
      console.log('[RAG] Retrieval skipped: enableSearch is false and no documentId provided.')
    } else if (autoRagEnabled && !enableSearch && !documentId) {
      console.log('[RAG] Auto-RAG enabled: searching user documents for personalization')
    }

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

      if (typeof userMessage.content === "string") {
        contentForDB = userMessage.content
      } else if (Array.isArray(userMessage.content)) {
        // Process multimodal content to create a summary without base64 data
        const parts = userMessage.content
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
        contentForDB = JSON.stringify(userMessage.content)
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

    const effectiveSystemPrompt = systemPrompt || SYSTEM_PROMPT_DEFAULT

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
                      text: `[IMAGEN: ${typedPart.name || "imagen.jpg"}] - El modelo ${model} no soporta análisis de imágenes. Para analizar imágenes, selecciona Grok-4 o Llama 4 Maverick que tienen capacidades de visión avanzadas.`,
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
                              model === "grok-4" ||
                              model === "llama-4-maverick"
                            ) {
                              documentContent = `[ARCHIVO PDF - ${fileName}]

⚠️ El PDF es demasiado grande para procesar automáticamente.

**Opciones disponibles:**
1. **Pregunta específica:** Describe qué información necesitas del documento
2. **Capturas de pantalla:** Toma fotos de las páginas relevantes - Los modelos Grok-4 y Llama 4 Maverick pueden analizar imágenes
3. **Archivo más pequeño:** Usa un PDF de menos de 20 páginas
4. **Texto directo:** Copia y pega las secciones específicas que necesitas analizar

💡 **Tip:** Las imágenes del documento funcionan muy bien con estos modelos.`
                            } else {
                              documentContent = `[PDF Document: ${fileName}] - Documento muy grande. Usa Grok-4 o Llama 4 Maverick para mejor análisis de documentos, o convierte a texto/imágenes.`
                            }
                          }
                        } else {
                          // For other binary files, indicate that content extraction is needed
                          documentContent = `[Archivo binario: ${fileName}. Tipo: ${fileType}]
                      
Este archivo requiere procesamiento especializado. Para mejor análisis:
1. Para imágenes: usa Grok-4 o Llama 4 Maverick 
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
        console.log('[RAG] Extracted user query length', userPlain.length)
        if (userPlain.trim()) {
          // Pre-diagnostics: how many documents & chunks exist?
          try {
            if (supabase) {
              const { count: docCount } = await (supabase as any).from('documents').select('id', { count: 'exact', head: true }).eq('user_id', realUserId)
              const { count: chunkCount } = await (supabase as any).from('document_chunks').select('id', { count: 'exact', head: true }).eq('user_id', realUserId)
              console.log('[RAG] User docs:', docCount, 'chunks:', chunkCount)
            }
          } catch (e:any) {
            console.log('[RAG] Doc/chunk diagnostics failed', e.message)
          }

          console.log('[RAG] Starting hybrid retrieval topK=6 docFilter=', documentId ? documentId : 'NONE')
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
                const profileQuery = 'perfil del usuario nombre intereses gustos comida favorita hobbies preferencias biografia datos personales';
                console.log('[RAG] Running secondary profile retrieval query')
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
                    console.log('[RAG] Added secondary profile retrieval chunks:', extra.length)
                  }
                }
              } catch (e:any) {
                console.log('[RAG] Secondary profile retrieval failed', e.message)
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
    const personalizationInstruction = 'IMPORTANTE: Usa la información personal del CONTEXTO para personalizar tu respuesta (nombre, intereses, comida favorita, hobbies, estilo). Si la pregunta se refiere explícitamente a un dato personal que no está en el contexto, pide confirmación educadamente.'
    const finalSystemPrompt = ragSystemAddon
      ? `${ragSystemAddon}\n\n${personalizationInstruction}\n\n${effectiveSystemPrompt}`
      : effectiveSystemPrompt

    console.log('[RAG] Using context?', !!ragSystemAddon, 'Final system prompt length:', finalSystemPrompt.length)

    const result = streamText({
      model: modelConfig.apiSdk(apiKey, { enableSearch }),
      system: finalSystemPrompt,
      messages: convertedMessages,
      tools: tools,
      stopWhen: stepCountIs(5), // Allow multi-step tool calls
      onError: (err: unknown) => {
        console.error("Streaming error occurred:", err)
      },

      onFinish: async ({ response }) => {
        // Clean up global context
        delete (globalThis as any).__currentUserId
        delete (globalThis as any).__currentModel
        
        if (supabase) {
          await storeAssistantMessage({
            supabase,
            chatId,
            messages:
              response.messages as unknown as import("@/app/types/api.types").Message[],
            message_group_id,
            model,
          })
        }
      },
    })

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        // Clean up global context on error
        delete (globalThis as any).__currentUserId
        delete (globalThis as any).__currentModel
        
        if (error instanceof Error) {
          if (
            error.message.includes("Rate limit") ||
            error.message.includes("Request too large")
          ) {
            return "El documento es demasiado grande para procesar completamente. Por favor:\n\n1. Usa un archivo PDF más pequeño (menos de 20 páginas)\n2. O describe qué información específica necesitas del documento\n3. O proporciona capturas de pantalla de las secciones relevantes\n\nLos modelos Grok-4 y Llama 4 Maverick pueden analizar imágenes directamente."
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

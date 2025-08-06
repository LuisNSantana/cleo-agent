import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { getAllModels } from "@/lib/models"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { tools } from "@/lib/tools"
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
    } = (await req.json()) as ChatRequest

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

    // Log conversion summary
    const convertedMultimodal = convertedMessages.filter((msg) =>
      Array.isArray(msg.content)
    )
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

    const result = streamText({
      model: modelConfig.apiSdk(apiKey, { enableSearch }),
      system: effectiveSystemPrompt,
      messages: convertedMessages,
      tools: tools,
      stopWhen: stepCountIs(5), // Allow multi-step tool calls
      onError: (err: unknown) => {
        console.error("Streaming error occurred:", err)
      },

      onFinish: async ({ response }) => {
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
    console.error("Error in /api/chat:", err)
    const error = err as {
      code?: string
      message?: string
      statusCode?: number
    }

    return createErrorResponse(error)
  }
}

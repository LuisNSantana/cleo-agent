import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { getAllModels } from "@/lib/models"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import type { ProviderWithoutOllama } from "@/lib/user-keys"
import { streamText, stepCountIs } from "ai"
import type { CoreMessage } from "ai"
import { tools } from "@/lib/tools"
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
      await logUserMessage({
        supabase,
        userId,
        chatId,
        content: typeof userMessage.content === 'string' ? userMessage.content : JSON.stringify(userMessage.content),
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
    const convertedMessages = messages.map(msg => {
      // Only process user messages with multimodal content
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        const convertedContent = msg.content
          .filter((part: any) => part && (part.type === 'text' || part.type === 'file')) // Filter out invalid parts
          .map((part: any) => {
            // Convert image file parts to standard AI SDK v5 image format
            if (part.type === 'file' && part.mediaType?.startsWith('image/') && part.url) {
              return {
                type: 'image' as const,
                image: part.url // Already a data URL from frontend
              }
            }
            // Convert document file parts to text with actual content
            if (part.type === 'file' && !part.mediaType?.startsWith('image/') && part.url) {
              const fileName = part.name || 'document'
              let fileType = part.mediaType || 'unknown'
              
              // Normalize MIME type based on file extension if generic
              if (fileType === 'application/octet-stream' || fileType === 'unknown') {
                const extension = fileName.toLowerCase().split('.').pop()
                const extensionToMime: { [key: string]: string } = {
                  'md': 'text/markdown',
                  'txt': 'text/plain',
                  'csv': 'text/csv',
                  'json': 'application/json',
                  'pdf': 'application/pdf',
                  'doc': 'application/msword',
                  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                }
                if (extension && extensionToMime[extension]) {
                  fileType = extensionToMime[extension]
                }
              }
              
              // Extract content from data URL
              let documentContent = ''
              try {
                if (part.url.startsWith('data:')) {
                  const base64Data = part.url.split(',')[1]
                  if (base64Data) {
                    // For text-based files, decode as text
                    if (fileType.startsWith('text/') || fileType.includes('markdown') || fileType.includes('json') || fileType.includes('csv')) {
                      documentContent = atob(base64Data)
                    } else {
                      // For binary files like PDFs, indicate that content extraction is needed
                      documentContent = `[Binary file: ${fileName}. Content extraction would require specialized processing.]`
                    }
                  }
                }
              } catch (error) {
                console.error(`Error decoding document content for ${fileName}:`, error)
                documentContent = `[Error reading document content for ${fileName}]`
              }
              
              const finalText = `[DOCUMENT: ${fileName} (${fileType})]\n\nContent:\n${documentContent}`
              
              return {
                type: 'text' as const,
                text: finalText
              }
            }
            // Ensure text parts have the correct structure
            if (part.type === 'text' && (part.text || part.content)) {
              return {
                type: 'text' as const,
                text: part.text || part.content || ''
              }
            }
            // Return a default text part for invalid content
            return {
              type: 'text' as const,
              text: ''
            }
          })
          .filter((part: any) => part.text !== '' || part.type === 'image') // Remove empty text parts
        
        // If no valid content, convert to simple text message
        if (convertedContent.length === 0) {
          return { ...msg, content: typeof msg.content === 'string' ? msg.content : '' }
        }
        
        return { ...msg, content: convertedContent }
      }
      
      // For non-user messages or simple string content, return as-is
      return msg
    })

    // Log conversion summary
    const convertedMultimodal = convertedMessages.filter(msg => Array.isArray(msg.content))
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
          if (error.message.includes("Rate limit")) {
            return "Rate limit exceeded. Please try again later."
          }
        }
        console.error(error)
        return "An error occurred."
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

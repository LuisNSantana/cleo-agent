import type { ContentPart, Message } from "@/app/types/api.types"
import type { Database, Json } from "@/app/types/database.types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createGuestServerClient } from "@/lib/supabase/server-guest"
import { normalizeModelId } from "@/lib/openproviders/provider-map"

const DEFAULT_STEP = 0

export async function saveFinalAssistantMessage(
  supabase: SupabaseClient<Database>,
  chatId: string,
  messages: Message[],
  message_group_id?: string,
  model?: string,
  userId?: string,
  opts?: { inputTokens?: number; outputTokens?: number; responseTimeMs?: number }
) {
  const parts: ContentPart[] = []
  const toolMap = new Map<string, ContentPart>()
  const textParts: string[] = []

  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text") {
          textParts.push(part.text || "")
          parts.push(part)
        } else if (part.type === "execution-step" && (part as any).step) {
          // Preserve pipeline step for UI persistence
          parts.push(part as any)
        } else if (part.type === "tool-invocation" && part.toolInvocation) {
          const { toolCallId, state } = part.toolInvocation
          if (!toolCallId) continue

          const existing = toolMap.get(toolCallId)
          if (state === "result" || !existing) {
            toolMap.set(toolCallId, {
              ...part,
              toolInvocation: {
                ...part.toolInvocation,
                args: part.toolInvocation?.args || {},
              },
            })
          }
        } else if (part.type === "reasoning") {
          parts.push({
            type: "reasoning",
            reasoning: part.text || "",
            details: [
              {
                type: "text",
                text: part.text || "",
              },
            ],
          })
        } else if (part.type === "step-start") {
          parts.push(part)
        }
      }
    } else if (msg.role === "tool" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "tool-result") {
          const toolCallId = part.toolCallId || ""
          toolMap.set(toolCallId, {
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              step: DEFAULT_STEP,
              toolCallId,
              toolName: part.toolName || "",
              result: part.result,
            },
          })
        }
      }
    }
  }

  // Merge tool parts at the end
  parts.push(...toolMap.values())

  const finalPlainText = textParts.join("\n\n")

  const row = {
    chat_id: chatId,
    role: "assistant",
    content: finalPlainText || "",
    parts: parts as unknown as Json,
    message_group_id,
  model: model ? normalizeModelId(model) : undefined,
  user_id: userId,
    input_tokens: opts?.inputTokens ?? null,
    output_tokens: opts?.outputTokens ?? null,
    response_time_ms: opts?.responseTimeMs ?? null,
  } as const

  const { error } = await supabase.from("messages").insert(row)

  if (error) {
    // Fallback: retry with service-role client to bypass RLS on analytics trigger
    if ((error as any)?.code === '42501' && (error as any)?.message?.includes('model_usage_analytics')) {
      try {
        const admin = await createGuestServerClient()
        if (admin) {
          const { error: adminErr } = await (admin as SupabaseClient<Database>).from('messages').insert(row)
          if (!adminErr) {
            console.log('Assistant message saved via admin client (RLS fallback).')
            return
          }
          console.error('Admin fallback insert failed:', adminErr)
        }
      } catch (e) {
        console.error('Admin fallback exception:', e)
      }
    }
    console.error("Error saving final assistant message:", error)
    throw new Error(`Failed to save assistant message: ${error.message}`)
  } else {
    console.log("Assistant message saved successfully (merged).")
  }
}

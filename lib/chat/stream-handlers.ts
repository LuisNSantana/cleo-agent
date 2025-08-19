import { storeAssistantMessage } from "@/app/api/chat/api"

type AnySupabase = any

export type StreamHandlersParams = {
  supabase: AnySupabase | null
  chatId: string
  message_group_id?: string
  model: string
  realUserId: string | null
  finalSystemPrompt: string
  convertedMessages: Array<{ role: string; content: any }>
  resultStart: number
}

export function makeStreamHandlers(params: StreamHandlersParams) {
  const {
    supabase,
    chatId,
    message_group_id,
    model,
    realUserId,
    finalSystemPrompt,
    convertedMessages,
    resultStart,
  } = params

  const onError = (err: unknown) => {
    // Clean up global context on streaming error
    delete (globalThis as any).__currentUserId
    delete (globalThis as any).__currentModel
    delete (globalThis as any).__requestId
    console.error("Streaming error occurred:", err)
  }

  const onFinish = async ({ response, usage }: { response: any; usage?: any }) => {
    // Clean up global context after stream finishes
    delete (globalThis as any).__currentUserId
    delete (globalThis as any).__currentModel
    delete (globalThis as any).__requestId

    if (!supabase) return

    try {
      // Prefer real token counts when provided by the SDK
      let inputTokens: number
      let outputTokens: number
      let cachedInputTokens = 0

      if (usage?.promptTokens && usage?.completionTokens) {
        inputTokens = usage.promptTokens
        outputTokens = usage.completionTokens
        const maybeCached = (usage as any)?.cachedPromptTokens || (usage as any)?.promptTokensDetails?.cached || 0
        if (typeof maybeCached === "number" && maybeCached > 0) cachedInputTokens = maybeCached
        console.log(
          `[Chat] Using real tokens - Input: ${inputTokens}, Output: ${outputTokens}${cachedInputTokens ? `, CachedIn: ${cachedInputTokens}` : ""}`
        )
      } else {
        // Fallback: estimate tokens by character count
        const est = (s: string) => Math.ceil((s || "").length / 4)
        const inputText = [
          finalSystemPrompt,
          ...convertedMessages.map((m) => {
            if (typeof m.content === "string") return m.content
            if (Array.isArray(m.content)) {
              return m.content
                .filter((p: any) => p && typeof p === "object" && p.type === "text")
                .map((p: any) => p.text || p.content || "")
                .join("\n\n")
            }
            return ""
          }),
        ].join("\n\n")

        const outputText = (() => {
          try {
            const msgs = response?.messages ?? []
            const last = [...msgs].reverse().find((m: any) => m.role === "assistant")
            if (!last) return ""
            if (typeof last.content === "string") return last.content
            if (Array.isArray(last.content)) {
              return last.content
                .filter(
                  (p: any) => p && typeof p === "object" && (p.type === "text" || p.type === "reasoning")
                )
                .map((p: any) => p.text || p.reasoning || "")
                .join("\n\n")
            }
            return ""
          } catch {
            return ""
          }
        })()

        inputTokens = est(inputText)
        outputTokens = est(outputText)
        console.log(`[Chat] Using estimated tokens - Input: ${inputTokens}, Output: ${outputTokens}`)
      }

      const responseTimeMs = Math.max(0, Date.now() - resultStart)

      await storeAssistantMessage({
        supabase,
        chatId,
        messages: response.messages as any,
        message_group_id,
        model,
        userId: realUserId!,
        inputTokens,
        outputTokens,
        responseTimeMs,
      })

      // Best-effort: update model usage analytics via RPC, ignore errors
      try {
        const { analytics } = await import("@/lib/supabase/analytics-helpers")
        console.log(
          `[Analytics] Calling updateModelUsage with userId: ${realUserId}, model: ${model}, tokens: ${inputTokens}/${outputTokens}${
            cachedInputTokens ? ` (cached_in:${cachedInputTokens})` : ""
          }`
        )
        const result = await analytics.updateModelUsage(
          realUserId!,
          model,
          inputTokens,
          outputTokens,
          responseTimeMs,
          true,
          cachedInputTokens
        )
        if (result.error) {
          console.error("[Analytics] updateModelUsage RPC error:", result.error)
        } else {
          console.log("[Analytics] updateModelUsage successful")
        }
      } catch (e) {
        console.log("[Analytics] updateModelUsage error:", (e as any)?.message)
      }
    } catch (err) {
      console.error("Failed finishing stream handling:", err)
    }
  }

  return { onError, onFinish }
}

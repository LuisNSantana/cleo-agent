import { decryptKey } from "./encryption"
import { Provider } from "./openproviders/types"
import { createClient } from "./supabase/server"

export type { Provider } from "./openproviders/types"
export type ProviderWithoutOllama = Exclude<Provider, "ollama">

export async function getUserKey(
  userId: string,
  provider: Provider
): Promise<string | null> {
  try {
    const supabase = await createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from("user_keys")
      .select("encrypted_key, iv")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single()

    if (error || !data) return null

    return decryptKey(data.encrypted_key, data.iv)
  } catch (error: any) {
    // Avoid noisy stack traces if ENCRYPTION_KEY changed; fall back to env key
    console.warn("Error retrieving user key:", error?.message || String(error))
    return null
  }
}

export async function getEffectiveApiKey(
  userId: string | null,
  provider: ProviderWithoutOllama
): Promise<string | null> {
  if (userId) {
    const userKey = await getUserKey(userId, provider)
    if (userKey) return userKey
  }

  // Read env at runtime with dynamic access to avoid build-time inlining
  const getEnv = (name: string) => process.env[name]
  const envKeyMap: Record<ProviderWithoutOllama, string | undefined> = {
    openai: getEnv("OPENAI_API_KEY"),
    mistral: getEnv("MISTRAL_API_KEY"),
    perplexity: getEnv("PERPLEXITY_API_KEY"),
    google: getEnv("GOOGLE_GENERATIVE_AI_API_KEY"),
    anthropic: getEnv("ANTHROPIC_API_KEY"),
    xai: getEnv("XAI_API_KEY"),
    openrouter: getEnv("OPENROUTER_API_KEY"),
    langchain: getEnv("GROQ_API_KEY") || getEnv("OPENAI_API_KEY"), // LangChain uses underlying provider keys
  }

  return envKeyMap[provider] ?? null
}

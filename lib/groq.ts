import { createGroq } from '@ai-sdk/groq'

/**
 * Groq SDK for Llama models
 * Uses the official AI SDK Groq provider
 */

// Mapeo de IDs de modelos internos a nombres de modelos Groq
const MODEL_MAPPING: Record<string, string> = {
  "llama-4-maverick": "meta-llama/llama-4-maverick-17b-128e-instruct", // Modelo con visión
  "llama-3-3-70b-groq": "llama-3.3-70b-versatile", // Solo texto
  "llama-3-1-8b-groq": "llama-3.1-8b-instant", // Solo texto
  "gpt-oss-120b": "openai/gpt-oss-120b",
}

/**
 * Get a Groq model instance for the given model ID
 * @param modelId Internal model ID
 * @returns Groq model instance compatible with AI SDK
 */
export function getGroqModel(modelId: string) {
  const groqModelName = MODEL_MAPPING[modelId] || modelId

  // Load API key explicitly to avoid build/runtime env pitfalls
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    // Safe diagnostic without leaking secrets
    console.error('[Groq] GROQ_API_KEY is missing at runtime. Ensure it is set in .env.local and passed to the container.')
    // Return a provider without key; downstream will throw a clear error when used
    const provider = createGroq({}) as unknown as (model: string) => any
    return provider(groqModelName)
  }

  // Configure provider with explicit apiKey, then select the model
  const provider = createGroq({ apiKey }) as unknown as (model: string) => any
  return provider(groqModelName)
}

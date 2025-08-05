import { groq } from '@ai-sdk/groq'

/**
 * Groq SDK for Llama models
 * Uses the official AI SDK Groq provider
 */

// Mapeo de IDs de modelos internos a nombres de modelos Groq
const MODEL_MAPPING: Record<string, string> = {
  "llama-4-maverick": "llama-3.3-70b-versatile",
  "llama-3-3-70b-groq": "llama-3.3-70b-versatile",
  "llama-3-1-8b-groq": "llama-3.1-8b-instant",
  "gpt-oss-120b": "openai/gpt-oss-120b",
}

/**
 * Get a Groq model instance for the given model ID
 * @param modelId Internal model ID
 * @returns Groq model instance compatible with AI SDK
 */
export function getGroqModel(modelId: string) {
  const groqModelName = MODEL_MAPPING[modelId] || modelId
  return groq(groqModelName)
}

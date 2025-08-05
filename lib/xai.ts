import { createXai } from '@ai-sdk/xai'

/**
 * xAI SDK for Grok models
 * Uses the official AI SDK xAI provider directly
 * Versiones: @ai-sdk/xai@2.0.0-beta.8 + ai@5.0.0-beta.25
 */

// Create xAI provider instance with API key
const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
})

/**
 * Get an xAI model instance for the given model ID
 * @param modelId Internal model ID ("grok-4")
 * @returns xAI model instance
 */
export function getXAIModel(modelId: string) {
  // Mapear grok-4 al modelo correcto
  const modelName = modelId === "grok-4" ? "grok-4-latest" : modelId
  
  // Retornar el modelo directamente
  return xai(modelName)
}

import { createXai } from '@ai-sdk/xai'

/**
 * xAI SDK for Grok models
 * Uses the official AI SDK xAI provider directly
 * Versiones: @ai-sdk/xai@2.0.0-beta.8 + ai@5.0.0-beta.25
 */

// Factory to create an xAI provider instance using provided key or env
function createXaiProvider(apiKeyOverride?: string) {
  return createXai({
    apiKey: apiKeyOverride || process.env.XAI_API_KEY,
  })
}

/**
 * Get an xAI model instance for the given model ID
 * @param modelId Internal model ID ("grok-4", "grok-4-fast-reasoning", "grok-4-1-fast-reasoning", etc.)
 * @returns xAI model instance
 */
export function getXAIModel(modelId: string, apiKeyOverride?: string) {
  // Mapear alias a nombres oficiales de xAI API
  const modelName =
    modelId === "grok-4"
      ? "grok-4-latest"
      : modelId === "grok-3-mini"
      ? "grok-3-mini"
      : modelId === "grok-4-fast"
      ? "grok-4-fast-reasoning"
      : modelId === "grok-4-fast-reasoning"
      ? "grok-4-fast-reasoning"
      : modelId === "grok-4-fast-non-reasoning"
      ? "grok-4-fast-non-reasoning"
      : modelId === "grok-4-1-fast-reasoning"
      ? "grok-4-1-fast-reasoning"
      : modelId

  // Crear proveedor con override cuando sea necesario
  const xai = createXaiProvider(apiKeyOverride)
  return xai(modelName)
}

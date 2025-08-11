import { FREE_MODELS_IDS, NON_AUTH_ALLOWED_MODELS } from "../config"
import { grokModels } from "./data/grok"
import { llamaModels } from "./data/llama"
import { gptOssModels } from "./data/gpt-oss"
import { fireworksModels } from './data/fireworks'
import { ModelConfig } from "./types"

/**
 * Cleo Agent Models
 * 
 * This application offers three powerful AI models for the Cleo agent:
 * - Grok-4: Advanced reasoning, vision, and function calling capabilities
 * - Llama: Open-source alternative with strong performance
 * - GPT-OSS 120B: OpenAI's flagship open source model with MoE architecture
 * 
 * Users can choose between these models to compare responses and
 * select their preferred AI for document analysis, calendar management,
 * live search, and other agent tasks.
 */
const STATIC_MODELS: ModelConfig[] = [
  ...grokModels, // Cleo Agent (Grok-4)
  ...llamaModels, // Llama models for comparison
  ...gptOssModels, // GPT-OSS 120B for advanced reasoning
  ...fireworksModels, // Fireworks Llama 4 Scout
]

// Debug: Log available models
console.log('🔍 Available models:', STATIC_MODELS.map(m => ({ id: m.id, name: m.name, provider: m.provider })))
console.log('🔍 FREE_MODELS_IDS:', FREE_MODELS_IDS)

/**
 * Get all available models for Cleo Agent
 * 
 * Returns Grok, Llama, and GPT-OSS models, allowing users to choose
 * their preferred AI model for the Cleo agent experience.
 */
export async function getAllModels(): Promise<ModelConfig[]> {
  return STATIC_MODELS
}

export async function getModelsWithAccessFlags(): Promise<ModelConfig[]> {
  const models = await getAllModels()

  const freeModels = models
    .filter(
      (model) => {
        const isInFreeList = FREE_MODELS_IDS.includes(model.id)
        const isMetaProvider = model.providerId === "meta"
        const shouldInclude = isInFreeList || isMetaProvider
        console.log(`🔍 Model ${model.id}: inFreeList=${isInFreeList}, isMeta=${isMetaProvider}, shouldInclude=${shouldInclude}`)
        return shouldInclude
      }
    )
    .map((model) => ({
      ...model,
      accessible: true,
    }))

  const proModels = models
    .filter((model) => !freeModels.map((m) => m.id).includes(model.id))
    .map((model) => ({
      ...model,
      accessible: false,
    }))

  return [...freeModels, ...proModels]
}

/**
 * Get models available for non-authenticated users
 * Only returns models from NON_AUTH_ALLOWED_MODELS (Llama models only)
 */
export async function getModelsForNonAuthUsers(): Promise<ModelConfig[]> {
  const models = await getAllModels()
  
  return models
    .filter((model) => NON_AUTH_ALLOWED_MODELS.includes(model.id))
    .map((model) => ({
      ...model,
      accessible: true,
    }))
}

export async function getModelsForProvider(
  provider: string
): Promise<ModelConfig[]> {
  const models = STATIC_MODELS

  const providerModels = models
    .filter((model) => model.providerId === provider)
    .map((model) => ({
      ...model,
      accessible: true,
    }))

  return providerModels
}

// Function to get models based on user's available providers
export async function getModelsForUserProviders(
  providers: string[]
): Promise<ModelConfig[]> {
  const providerModels = await Promise.all(
    providers.map((provider) => getModelsForProvider(provider))
  )

  const flatProviderModels = providerModels.flat()

  return flatProviderModels
}

// Synchronous function to get model info for simple lookups
export function getModelInfo(modelId: string): ModelConfig | undefined {
  return STATIC_MODELS.find((model) => model.id === modelId)
}

// For backward compatibility - static models only
export const MODELS: ModelConfig[] = STATIC_MODELS

// Function to refresh the models cache (no-op since we only use static models)
export function refreshModelsCache(): void {
  // No cache to refresh since we only use static models
}

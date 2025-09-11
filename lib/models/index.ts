import { FREE_MODELS_IDS, NON_AUTH_ALLOWED_MODELS } from "../config"
import { optimizedModels } from "./data/optimized-tiers"
import { langchainModels } from "./data/langchain"
import { ModelConfig } from "./types"

/**
 * Cleo Agent Models - Optimized 3-Tier System
 * 
 * Based on 2025 cost-effectiveness analysis and performance benchmarks:
 * 
 * PRIMARY MODELS (User-facing options):
 * - Fast: Claude 3.5 Haiku (vision + speed + cost-effective)
 * - Balanced: GPT-OSS 120B via Groq (best price/performance)  
 * - Smarter: OpenAI GPT-5 Mini (advanced reasoning)
 * 
 * Note: Fallback models are handled internally by ModelFactory
 * and are not shown in the UI to keep the selection simple.
 */
const STATIC_MODELS: ModelConfig[] = [
  ...optimizedModels, // Only primary models (3 total) for clean UI
  ...langchainModels, // Multi-Model Orchestration for advanced workflows
]

// Debug: Log available models
console.log('🔍 Optimized 3-tier models (primary only):', STATIC_MODELS.map(m => ({ id: m.id, name: m.name, provider: m.provider })))

console.log('🔍 FREE_MODELS_IDS:', FREE_MODELS_IDS)

/**
 * Get all available models for Cleo Agent
 * 
 * Returns only the 3 primary tier models for clean UI:
 * - Fast: Claude 3.5 Haiku
 * - Balanced: GPT-OSS 120B  
 * - Smarter: GPT-5 Mini
 * 
 * Note: Fallback logic is handled internally by ModelFactory
 */
export async function getAllModels(): Promise<ModelConfig[]> {
  return STATIC_MODELS
}

export async function getModelsWithAccessFlags(): Promise<ModelConfig[]> {
  const models = await getAllModels()

  const freeModels = models
    .filter((model) => {
      const isInFreeList = FREE_MODELS_IDS.includes(model.id)
      console.log(`🔍 Model ${model.id}: inFreeList=${isInFreeList}`)
      return isInFreeList
    })
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

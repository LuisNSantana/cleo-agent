import { FREE_MODELS_IDS, NON_AUTH_ALLOWED_MODELS } from "../config"
import { optimizedModels } from "./data/optimized-tiers"
import { langchainModels } from "./data/langchain"
import { mistralModels } from "./data/mistral"
import { llamaModels } from "./data/llama"
import { ModelConfig } from "./types"
import { openrouterModels } from "./data/openrouter"
import { geminiModels } from "./data/gemini"

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
function pickById(list: ModelConfig[], ids: string[]): ModelConfig[] {
  const set = new Set(ids)
  return list.filter(m => set.has(m.id))
}

function dedupeById(list: ModelConfig[]): ModelConfig[] {
  const seen = new Set<string>()
  const out: ModelConfig[] = []
  for (const m of list) {
    if (!seen.has(m.id)) {
      seen.add(m.id)
      out.push(m)
    }
  }
  return out
}

// Keep 3-tier primaries + LangChain orchestrators, and add key Mistral/Meta models
const extraProviderModels: ModelConfig[] = [
  // Mistral (flagship + small)
  ...pickById(mistralModels, [
    "mistral-large-latest",
    "mistral-small-latest",
  ]),
  // Meta (Llama) main variants
  ...pickById(llamaModels, [
    "llama-4-maverick",
    "llama-3-3-70b-groq",
    "llama-3-1-8b-groq",
  ]),
  // OpenRouter: Selected cost-effective models
  ...pickById(openrouterModels, [
    "openrouter:deepseek/deepseek-r1:free",
    "openrouter:qwen/qwen2.5-32b-instruct",
  ]),
  // Google Gemini: Native Gemini 2.5 Flash
  ...pickById(geminiModels, [
    "gemini-2.5-flash",
  ]),
]

const STATIC_MODELS: ModelConfig[] = dedupeById([
  ...optimizedModels, // 3-tier primaries (Fast/Balanced/Smarter)
  ...langchainModels, // Orchestration routes
  ...extraProviderModels, // Key models from Mistral/Meta
])

// Debug logs removed for production safety

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

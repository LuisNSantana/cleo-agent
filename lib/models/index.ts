import { FREE_MODELS_IDS, NON_AUTH_ALLOWED_MODELS } from "../config"
import { normalizeModelId } from "@/lib/openproviders/provider-map"
import { ModelConfig } from "./types"
import { grokModels } from "./data/grok"
import { openrouterModels } from "./data/openrouter"
import { openaiModels } from "./data/openai.clean"
import { smarterModels } from "./data/optimized-tiers"

/**
 * Unified model list with multiple tiers
 * - Grok 4 Fast (🚀): fast reasoning model (xAI direct)
 * - Grok 4.1 Fast Reasoning: latest with 2M context (xAI direct)
 * - Qwen3-Next 80B: advanced instruction following (OpenRouter)
 * - GLM 4.5 Air (free): free agent-centric model (OpenRouter)
 * - Dolphin Mistral Venice (uncensored): minimal restrictions model (OpenRouter)
 *
 * Old tiers and legacy models (Claude, GPT‑5, Mistral, Gemini, etc.) are hidden
 * to avoid duplication and noise. Historical ids are normalized upstream.
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

// Final list for USER-FACING model selector:
// - Standard: Faster (grok-4-fast), Smarter (gpt-5.1), Gemini 3 Flash, Claude Haiku 4.5
// - Free: GLM 4.5 Air, Trinity Mini
// - Uncensored: Dolphin Mistral Venice
let STATIC_MODELS: ModelConfig[] = [
  ...pickById(grokModels, ['grok-4-fast']),
  ...pickById(openaiModels, ['gpt-5.1-2025-11-13']),
  // Include Gemini 3 Flash and Claude Haiku 4.5 from smarterModels
  ...pickById(smarterModels, [
    'openrouter:google/gemini-3-flash-preview',
    'openrouter:anthropic/claude-haiku-4.5',
  ]),
  // Free and uncensored models from OpenRouter
  ...pickById(openrouterModels, [
    'openrouter:z-ai/glm-4.5-air:free',
    'openrouter:arcee-ai/trinity-mini:free',
    'openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
  ])
]

// Post-processing rules to prevent confusing duplicates in selector.
// 1. Prefer direct Google Gemini image model over OpenRouter proxy when both exist.
const hasDirectNanoBanana = STATIC_MODELS.some(m => m.id === 'gemini-2.5-flash-image-preview')
if (hasDirectNanoBanana) {
  STATIC_MODELS = STATIC_MODELS.filter(m => m.id !== 'openrouter:google/gemini-2.5-flash-image-preview')
}

// Debug logs removed for production safety

// Devuelve únicamente los dos modelos activos.
export async function getAllModels(): Promise<ModelConfig[]> {
  return STATIC_MODELS
}

export async function getModelsWithAccessFlags(): Promise<ModelConfig[]> {
  const models = await getAllModels()

  const freeSet = new Set([
    ...FREE_MODELS_IDS.map(normalizeModelId),
    ...NON_AUTH_ALLOWED_MODELS.map(normalizeModelId),
  ])
  const freeModels = models
    .filter((model) => freeSet.has(normalizeModelId(model.id)))
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
    .filter((model) => new Set(NON_AUTH_ALLOWED_MODELS.map(normalizeModelId)).has(normalizeModelId(model.id)))
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

// Re-export delegation support utilities
export { 
  doesModelSupportDelegation, 
  doesCurrentModelSupportDelegation, 
  getNonDelegationReason 
} from './delegation-support'

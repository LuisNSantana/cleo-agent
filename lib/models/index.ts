import { FREE_MODELS_IDS, NON_AUTH_ALLOWED_MODELS } from "../config"
import { optimizedModels } from "./data/optimized-tiers"
// Note: We intentionally do not surface LangChain orchestration pseudo-models
// in the UI model list to avoid confusion (they remain routable via API).
// import { langchainModels } from "./data/langchain"
import { mistralModels } from "./data/mistral"
import { llamaModels } from "./data/llama"
import { ModelConfig } from "./types"
import { openrouterModels } from "./data/openrouter"
import { geminiModels } from "./data/gemini"
import { openaiModels } from "./data/openai"
import { grokModels } from "./data/grok" // Import Grok models

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

// Keep 3-tier primaries and add only validated, tool-capable models
const extraProviderModels: ModelConfig[] = [
  // XAI Grok models (Premium unlimited usage)
  ...pickById(grokModels, [
    "grok-4-fast-reasoning", // New Grok 4 Fast with reasoning - multimodal, 2M context
    "grok-4-fast-non-reasoning", // New Grok 4 Fast without reasoning - faster, 2M context
    "grok-3-mini", // Existing free model
  ]),
  // OpenRouter: Tool-calling enabled models only
  ...pickById(openrouterModels, [
    // Free tier optimized models (tool-capable)
    "openrouter:x-ai/grok-4-fast:free", // New flagship free model
    "openrouter:deepseek/deepseek-chat-v3.1:free",
    "openrouter:mistralai/mistral-small-3.2-24b-instruct:free",
    "openrouter:nvidia/nemotron-nano-9b-v2:free",
    "openrouter:qwen/qwen3-next-80b-a3b-thinking",
    "openrouter:openai/gpt-4.1-mini", // Re-enabled OpenAI GPT-4.1 mini
    // Premium multimodal models with daily limits
    "openrouter:anthropic/claude-sonnet-4", // 7 uses/day - premium multimodal
    // Image generation models (valid OpenRouter models only)
  "openrouter:openai/dall-e-3", // 8 images/day - proven to work
  "openrouter:google/gemini-2.5-flash-image-preview", // Nano Banana: Gemini text-to-image
    // High-end additions (paid)
    // Removed deprecated Nemotron Ultra 253B
    "openrouter:meta-llama/llama-3.1-405b-instruct",
    // Meta Llama 4 Maverick
    "openrouter:meta-llama/llama-4-maverick",
    // Fast vision companion
    "openrouter:openrouter/sonoma-sky-alpha",
  ]),
  // Re-enable Mistral Medium in selector
  ...pickById(mistralModels, ["mistral-medium-2508"]),
  // Add OpenAI models with native web search
  ...pickById(openaiModels, [
    "gpt-4o-mini", 
    "gpt-5", 
    "gpt-5-nano",
    "gpt-4o-search-preview-2025-03-11", // ✅ Native web search
    "gpt-4o-mini-search-preview", // ✅ Native web search (affordable)
  ]),
  // Add Google Gemini models for direct access
  ...pickById(geminiModels, [
    "gemini-2.5-flash-lite", // Restored Gemini Flash Lite model
  ]),
]

let STATIC_MODELS: ModelConfig[] = dedupeById([
  ...optimizedModels,
  ...extraProviderModels,
])

// Post-processing rules to prevent confusing duplicates in selector.
// 1. Prefer direct Google Gemini image model over OpenRouter proxy when both exist.
const hasDirectNanoBanana = STATIC_MODELS.some(m => m.id === 'gemini-2.5-flash-image-preview')
if (hasDirectNanoBanana) {
  STATIC_MODELS = STATIC_MODELS.filter(m => m.id !== 'openrouter:google/gemini-2.5-flash-image-preview')
}

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

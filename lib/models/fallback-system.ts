import { ModelConfig } from "@/lib/models/types"
import { allModelsWithFallbacks } from "@/lib/models/data/optimized-tiers"

/**
 * Model Fallback System
 * 
 * Automatically handles model fallbacks when primary models are unavailable.
 * Ensures users always have a working model for their tier preference.
 */

// Mapping of primary models to their fallbacks
const modelFallbacks: Record<string, string> = {
  // FREE TIER - DeepSeek V3.1 as primary for guests, Llama 3.3 as fallback
  "openrouter:deepseek/deepseek-chat-v3.1:free": "openrouter:meta-llama/llama-3.3-8b-instruct:free",
  "openrouter:meta-llama/llama-3.3-8b-instruct:free": "gpt-4o-mini",

  // FAST TIER - Grok-4-fast as primary, DeepSeek free as fallback
  "openrouter:x-ai/grok-4-fast:free": "openrouter:deepseek/deepseek-chat-v3.1:free",
  // FAST TIER - OpenRouter GPT-OSS 120B (paid) as primary, DeepSeek free as fallback
  "openrouter:openai/gpt-oss-120b": "openrouter:deepseek/deepseek-chat-v3.1:free",
  // Fast Vision companion - Sonoma Sky falls back to GPT-4o-mini if unavailable
  "openrouter:openrouter/sonoma-sky-alpha": "gpt-4o-mini",

  // BALANCED TIER - GPT-OSS 120B as primary, Mistral Large as fallback  
  "gpt-oss-120b": "mistral-large-latest-fallback",

  // SMARTER TIER - GPT-5 Mini as primary, Claude 3.5 Sonnet as fallback
  "gpt-5-mini": "claude-3-5-sonnet-20241022",
  "gpt-5-mini-2025-08-07": "claude-3-5-sonnet-20241022", // Fixed: correct model name

  // Additional fallbacks for common models
  "gpt-4o": "claude-3-5-sonnet-20241022",
  "gpt-4o-mini": "claude-3-5-haiku-20241022",
  "grok-3": "claude-3-5-sonnet-20241022"
}

// Reverse mapping for fallback to primary
const FALLBACK_TO_PRIMARY_MAP: Record<string, string> = {
  // Fast
  "openrouter:deepseek/deepseek-chat-v3.1:free": "openrouter:openai/gpt-oss-120b",
  // Balanced
  "mistral-large-latest-fallback": "gpt-oss-120b", 
  // Smarter
  "claude-3-5-sonnet-latest-fallback": "gpt-5-mini-2025-08-07",
}

/**
 * Get fallback model for a given model ID
 */
export function getFallbackModel(modelId: string): string | null {
  return modelFallbacks[modelId] || null
}

/**
 * Get primary model for a given fallback ID
 */
export function getPrimaryModel(fallbackId: string): string | null {
  return FALLBACK_TO_PRIMARY_MAP[fallbackId] || null
}

/**
 * Get model info with fallback chain
 */
export function getModelWithFallback(modelId: string): {
  primary: ModelConfig | null
  fallback: ModelConfig | null
  chain: string[]
} {
  const primary = allModelsWithFallbacks.find(m => m.id === modelId) || null
  const fallbackId = getFallbackModel(modelId)
  const fallback = fallbackId ? allModelsWithFallbacks.find(m => m.id === fallbackId) || null : null
  
  const chain = [modelId]
  if (fallbackId) chain.push(fallbackId)
  
  return { primary, fallback, chain }
}

/**
 * Check if model has vision capabilities
 * Important for document and image analysis tasks
 */
export function modelHasVision(modelId: string): boolean {
  const model = allModelsWithFallbacks.find(m => m.id === modelId)
  return model?.vision || false
}

/**
 * Get best model for vision tasks from a tier
 */
export function getBestVisionModel(tier: 'fast' | 'balanced' | 'smarter'): string {
  switch (tier) {
    case 'fast':
      // Fast primary is text-only; use Sonoma Dusk Alpha (OpenRouter, free) for vision
      return 'openrouter:openrouter/sonoma-dusk-alpha'
    case 'balanced':
      // Balanced primary doesn't have vision; borrow Fast's vision companion
      return 'openrouter:openrouter/sonoma-dusk-alpha'
    case 'smarter':
      return 'gpt-5-mini-2025-08-07' // Has vision
    default:
      return 'openrouter:openrouter/sonoma-dusk-alpha'
  }
}

/**
 * Get recommended model based on task requirements
 */
export function getRecommendedModel(requirements: {
  needsVision?: boolean
  needsSpeed?: boolean
  needsReasoning?: boolean
  budgetTier?: 'free' | 'pro'
  isGuest?: boolean
}): string {
  const { needsVision = false, needsSpeed = false, needsReasoning = false, budgetTier = 'free', isGuest = false } = requirements
  
  // For guests, always use free models
  if (isGuest) {
    if (needsVision) {
      return 'claude-3-5-haiku-20241022' // Fast tier with vision (might need auth check)
    }
    return 'openrouter:deepseek/deepseek-chat-v3.1:free' // Primary free model for guests
  }
  
  // If vision is required, prioritize models with vision capabilities
  if (needsVision) {
    if (budgetTier === 'free') {
      return 'claude-3-5-haiku-20241022' // Fast tier with vision
    } else {
      return needsReasoning ? 'gpt-5-mini-2025-08-07' : 'claude-3-5-haiku-20241022'
    }
  }
  
  // For text-only tasks, optimize for speed/reasoning balance
  if (needsSpeed && budgetTier === 'free') {
    return 'groq:llama-3.3-70b-versatile' // Reliable fast model via Groq
  }
  
  if (needsReasoning && budgetTier === 'pro') {
    return 'gpt-5-mini-2025-08-07' // Smarter tier
  }
  
  // Default recommendation
  return budgetTier === 'free' ? 'openrouter:deepseek/deepseek-chat-v3.1:free' : 'gpt-5-mini-2025-08-07'
}

/**
 * Tier classification helpers
 */
export function getModelTier(modelId: string): 'free' | 'fast' | 'balanced' | 'smarter' | 'unknown' {
  const freeModels = ['openrouter:deepseek/deepseek-chat-v3.1:free', 'openrouter:nvidia/nemotron-nano-9b-v2:free', 'openrouter:x-ai/grok-4-fast:free']
  const fastModels = ['openrouter:openai/gpt-oss-120b', 'openrouter:openrouter/sonoma-sky-alpha', 'gpt-4o-mini']
  const balancedModels = ['gpt-oss-120b', 'openrouter:z-ai/glm-4.5']
  const smarterModels = ['gpt-5-mini-2025-08-07', 'claude-3-5-sonnet-latest-fallback']
  
  if (freeModels.includes(modelId)) return 'free'
  if (fastModels.includes(modelId)) return 'fast'
  if (balancedModels.includes(modelId)) return 'balanced'
  if (smarterModels.includes(modelId)) return 'smarter'
  return 'unknown'
}

export { modelFallbacks as MODEL_FALLBACK_MAP, FALLBACK_TO_PRIMARY_MAP }

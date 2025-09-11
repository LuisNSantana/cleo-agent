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
  // FAST TIER - Claude 3.5 Haiku as primary, Grok-3 Mini as fallback
  "claude-3-5-haiku-20241022": "grok-3-mini",
  
  // BALANCED TIER - GPT-OSS 120B as primary, Mistral Large as fallback  
  "gpt-oss-120b": "mistral-large-2411",
  
  // SMARTER TIER - GPT-5 Mini as primary, Claude 3.5 Sonnet as fallback
  "gpt-5-mini": "claude-3-5-sonnet-20241022",
  
  // Additional fallbacks for common models
  "gpt-4o": "claude-3-5-sonnet-20241022",
  "gpt-4o-mini": "claude-3-5-haiku-20241022",
  "grok-3": "claude-3-5-sonnet-20241022"
}

// Reverse mapping for fallback to primary
const FALLBACK_TO_PRIMARY_MAP: Record<string, string> = {
  "grok-3-mini-fallback": "claude-3-5-haiku-20241022",
  "mistral-large-latest-fallback": "gpt-oss-120b", 
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
      return 'claude-3-5-haiku-20241022' // Has vision
    case 'balanced':
      // GPT-OSS 120B doesn't have vision, so use fallback that might have it
      // or recommend upgrading to smarter tier
      return 'claude-3-5-haiku-20241022' // Recommend fast tier for vision on budget
    case 'smarter':
      return 'gpt-5-mini-2025-08-07' // Has vision
    default:
      return 'claude-3-5-haiku-20241022'
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
}): string {
  const { needsVision = false, needsSpeed = false, needsReasoning = false, budgetTier = 'free' } = requirements
  
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
    return 'gpt-oss-120b' // Balanced tier - very fast via Groq
  }
  
  if (needsReasoning && budgetTier === 'pro') {
    return 'gpt-5-mini-2025-08-07' // Smarter tier
  }
  
  // Default recommendation
  return budgetTier === 'free' ? 'claude-3-5-haiku-20241022' : 'gpt-5-mini-2025-08-07'
}

/**
 * Tier classification helpers
 */
export function getModelTier(modelId: string): 'fast' | 'balanced' | 'smarter' | 'unknown' {
  const fastModels = ['claude-3-5-haiku-20241022', 'grok-3-mini-fallback']
  const balancedModels = ['gpt-oss-120b', 'mistral-large-latest-fallback']
  const smarterModels = ['gpt-5-mini-2025-08-07', 'claude-3-5-sonnet-latest-fallback']
  
  if (fastModels.includes(modelId)) return 'fast'
  if (balancedModels.includes(modelId)) return 'balanced'
  if (smarterModels.includes(modelId)) return 'smarter'
  return 'unknown'
}

export { modelFallbacks as MODEL_FALLBACK_MAP, FALLBACK_TO_PRIMARY_MAP }

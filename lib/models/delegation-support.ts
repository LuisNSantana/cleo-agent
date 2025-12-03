/**
 * Model Delegation Support Utilities
 * 
 * Determines whether a model supports agent delegation features.
 * Free and uncensored models typically have limited tooling support,
 * so Ankie/Cleo responds directly without delegating to specialists.
 */

import { grokModels } from './data/grok'
import { openrouterModels } from './data/openrouter'
import { getCurrentModel } from '../server/request-context'
import type { ModelConfig, ModelCategory } from './types'

// All models for delegation checks (avoid circular dependency with index.ts)
const ALL_MODELS_FOR_DELEGATION = [...grokModels, ...openrouterModels]

// Debug: Log all uncensored/free models at startup
const NON_DELEGATING_MODELS = ALL_MODELS_FOR_DELEGATION.filter(m => 
  m.category === 'free' || m.category === 'uncensored' || m.uncensored === true
)
console.log(`🎯 [DELEGATION] Non-delegating models loaded:`, NON_DELEGATING_MODELS.map(m => m.id))

/**
 * Check if a specific model supports delegation (tool calling)
 * This is determined by the model's `tools` capability flag, NOT by category.
 * - tools: true -> supports delegation
 * - tools: false -> does NOT support delegation (e.g., uncensored models)
 * @param modelId - The model ID to check (e.g., "openrouter:x-ai/grok-4-fast")
 * @returns true if the model supports delegation, false otherwise
 */
export function doesModelSupportDelegation(modelId: string): boolean {
  if (!modelId) {
    return true // Default to supporting delegation
  }

  // Find the model config
  const modelConfig = findModelConfig(modelId)
  
  if (!modelConfig) {
    // Unknown model - default to supporting delegation
    // This allows new models to work with full capabilities
    return true
  }

  // Check the tools capability flag - this is the definitive check
  // Models with tools: false (like uncensored models) cannot use tool calling
  if (modelConfig.tools === false) {
    console.log(`🎯 [DELEGATION] Model "${modelId}" has tools=false - BLOCKING delegation`)
    return false
  }

  return true
}

/**
 * Check if the current request's model supports delegation
 * Uses the model from request context (AsyncLocalStorage)
 * @returns true if the current model supports delegation
 */
export function doesCurrentModelSupportDelegation(): boolean {
  const currentModel = getCurrentModel()
  
  if (!currentModel) {
    // No model in context - default to supporting delegation
    return true
  }

  return doesModelSupportDelegation(currentModel)
}

/**
 * Find a model config by ID, handling various ID formats
 * @param modelId - The model ID (can include provider prefixes)
 */
function findModelConfig(modelId: string): ModelConfig | undefined {
  // Try without provider prefix (e.g., "openrouter:x-ai/grok-4-fast" -> "x-ai/grok-4-fast")
  const withoutPrefix = modelId.includes(':') 
    ? modelId.split(':').slice(1).join(':') 
    : modelId

  // Search ALL models for a match by ID
  const byId = ALL_MODELS_FOR_DELEGATION.find((m: ModelConfig) => m.id === modelId || m.id === withoutPrefix)
  if (byId) return byId

  // Try with openrouter prefix
  const withOpenRouterPrefix = `openrouter:${withoutPrefix}`
  const byOpenRouterPrefix = ALL_MODELS_FOR_DELEGATION.find((m: ModelConfig) => m.id === withOpenRouterPrefix)
  if (byOpenRouterPrefix) return byOpenRouterPrefix

  // Fuzzy match - check if any model ID contains the search term
  return ALL_MODELS_FOR_DELEGATION.find((m: ModelConfig) => 
    m.id.includes(withoutPrefix) || withoutPrefix.includes(m.id)
  )
}

/**
 * Get the reason why a model doesn't support delegation
 * Useful for logging and debugging
 */
export function getNonDelegationReason(modelId: string): string | null {
  const modelConfig = findModelConfig(modelId)
  
  if (!modelConfig) {
    return null
  }

  const category = modelConfig.category || 'standard'
  
  if (category === 'free') {
    return 'Free models have limited tooling support - responding directly'
  }
  
  if (category === 'uncensored' || modelConfig.uncensored) {
    return 'Uncensored models have limited tooling compatibility - responding directly'
  }

  return null
}

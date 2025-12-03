import { ModelConfig } from "@/lib/models/types"
import { grokModels } from "./data/grok"

/**
 * Sistema de fallback simplificado
 * Solo mantenemos los modelos activos (grok-4-fast, grok-4-1-fast-reasoning, etc.).
 * Cualquier id legacy (GPT-5, Claude, DeepSeek, etc.) hace fallback a grok-4-1-fast-reasoning
 * para no romper historiales de chat o referencias antiguas guardadas.
 */

// Legacy -> nuevo modelo primario
const LEGACY_IDS = [
  'gpt-5-mini', 'gpt-5-mini-2025-08-07', 'gpt-5', 'gpt-4o', 'gpt-4o-mini',
  'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-latest',
  'claude-3-7-sonnet-20250219', 'mistral-medium-2508', 'mistral-large-latest-fallback',
  'openrouter:deepseek/deepseek-chat-v3.1:free', 'openrouter:openai/gpt-oss-120b', 'gpt-oss-120b',
  'openrouter:openrouter/sonoma-sky-alpha', 'openrouter:z-ai/glm-4.5', 'grok-3', 'grok-4-fast-reasoning',
  'grok-4-fast-non-reasoning', 'openrouter:x-ai/grok-4-fast'
]

// Primary fallback target - now using grok-4-1-fast-reasoning
const FALLBACK_TARGET = 'grok-4-1-fast-reasoning'

const modelFallbacks: Record<string, string> = Object.fromEntries(
  LEGACY_IDS.map(id => [id, FALLBACK_TARGET])
)

// Reverse mapping for fallback to primary
// Ya no mantenemos mapping inverso complejo; sólo retornamos null salvo el target
const FALLBACK_TO_PRIMARY_MAP: Record<string, string> = {}

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
  const primary = grokModels.find(m => m.id === modelId) || null
  const fallbackId = getFallbackModel(modelId) || (modelId !== FALLBACK_TARGET ? FALLBACK_TARGET : null)
  const fallback = fallbackId ? grokModels.find(m => m.id === fallbackId) || null : null
  
  const chain = [modelId]
  if (fallbackId) chain.push(fallbackId)
  
  return { primary, fallback, chain }
}

/**
 * Check if model has vision capabilities
 * Important for document and image analysis tasks
 */
export function modelHasVision(modelId: string): boolean {
  const model = grokModels.find(m => m.id === modelId)
  return !!model?.vision
}

/**
 * Get best model for vision tasks from a tier
 */
export function getBestVisionModel(): string {
  return 'grok-4-multimodal'
}

/**
 * Get recommended model based on task requirements
 */
export function getRecommendedModel(requirements: { needsVision?: boolean }): string {
  return requirements?.needsVision ? 'grok-4-multimodal' : 'grok-4-1-fast-reasoning'
}

/**
 * Tier classification helpers
 */
export function getModelTier(_: string): 'free' | 'fast' | 'balanced' | 'smarter' | 'unknown' {
  // Mantenemos la firma para compatibilidad; ya no usamos tiers.
  return 'unknown'
}

export { modelFallbacks as MODEL_FALLBACK_MAP, FALLBACK_TO_PRIMARY_MAP }

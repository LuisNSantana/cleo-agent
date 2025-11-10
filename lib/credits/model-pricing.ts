/**
 * Model Pricing Configuration
 * 
 * Precios actualizados de modelos LLM (Noviembre 2025)
 * Formato: USD por 1M tokens
 * 
 * Fuentes:
 * - OpenAI: https://platform.openai.com/docs/pricing
 * - Anthropic: https://www.anthropic.com/pricing
 * - xAI: https://x.ai/api
 * - Google: https://ai.google.dev/pricing
 */

export interface ModelPricing {
  inputPer1M: number   // USD per 1M input tokens
  outputPer1M: number  // USD per 1M output tokens
  provider: 'openai' | 'anthropic' | 'xai' | 'google' | 'deepseek' | 'openrouter' | 'other'
}

/**
 * Pricing table for models actively used in production
 * Updated: November 2025
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // =====================================================
  // PRIMARY MODELS (Currently in use)
  // =====================================================
  
  // OpenAI GPT-4o-mini (Most agents: Peter, Apu, Emma, etc.)
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    outputPer1M: 0.60,
    provider: 'openai'
  },
  
  // xAI Grok-4-Fast (Kylio/Cleo, Wex, Ami, Jenn)
  'grok-4-fast': {
    inputPer1M: 0.02,
    outputPer1M: 0.08,
    provider: 'xai'
  },
  'grok-4-fast-reasoning': {
    inputPer1M: 0.02,
    outputPer1M: 0.08,
    provider: 'xai'
  },
  
  // OpenRouter xAI variants
  'openrouter:x-ai/grok-4-fast': {
    inputPer1M: 0.02,
    outputPer1M: 0.08,
    provider: 'openrouter'
  },
  'openrouter:x-ai/grok-code-fast-1': {
    inputPer1M: 0.02,
    outputPer1M: 0.08,
    provider: 'openrouter'
  },
  
  // =====================================================
  // FUTURE MODELS (For upcoming features)
  // =====================================================
  
  // OpenAI GPT-5 (Premium, high-quality responses)
  'gpt-5': {
    inputPer1M: 1.25,
    outputPer1M: 10.00,
    provider: 'openai'
  },
  'gpt-5-turbo': {
    inputPer1M: 1.25,
    outputPer1M: 10.00,
    provider: 'openai'
  },
  
  // Google Gemini 1.5 Flash (Fast and economical)
  'gemini-1.5-flash': {
    inputPer1M: 0.35,
    outputPer1M: 1.40,
    provider: 'google'
  },
  'gemini-flash': {
    inputPer1M: 0.35,
    outputPer1M: 1.40,
    provider: 'google'
  },
  'gemini-2-flash': {
    inputPer1M: 0.35,
    outputPer1M: 1.40,
    provider: 'google'
  },
  
  // =====================================================
  // LEGACY/FALLBACK MODELS
  // =====================================================
  
  'gpt-4o': {
    inputPer1M: 2.50,
    outputPer1M: 10.00,
    provider: 'openai'
  },
  'claude-3-5-sonnet': {
    inputPer1M: 3.00,
    outputPer1M: 15.00,
    provider: 'anthropic'
  },
  'claude-3-haiku': {
    inputPer1M: 0.25,
    outputPer1M: 1.25,
    provider: 'anthropic'
  },
}

/**
 * Default pricing for unknown models (conservative estimate)
 */
export const DEFAULT_MODEL_PRICING: ModelPricing = {
  inputPer1M: 0.50,
  outputPer1M: 2.00,
  provider: 'other'
}

/**
 * Credit conversion rate
 * 1 credit = $0.01 USD
 * 
 * This means:
 * - 100 credits = $1.00
 * - 2,500 credits = $25.00
 * - 7,500 credits = $75.00
 */
export const CREDIT_TO_USD_RATE = 0.01

/**
 * Get pricing for a model by name
 * Handles various naming formats and fallback to default
 */
export function getModelPricing(modelName: string): ModelPricing {
  // Normalize model name
  const normalized = modelName.toLowerCase().trim()
  
  // Direct match
  if (MODEL_PRICING[normalized]) {
    return MODEL_PRICING[normalized]
  }
  
  // Try to match by partial name (e.g., "gpt-4o" matches "gpt-4o-2024-05-13")
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return pricing
    }
  }
  
  // Fallback to default
  console.warn(`[PRICING] No pricing found for model: ${modelName}, using default`)
  return DEFAULT_MODEL_PRICING
}

/**
 * Calculate cost in USD for token usage
 */
export function calculateTokenCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(modelName)
  
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M
  
  return inputCost + outputCost
}

/**
 * Convert USD cost to credits
 */
export function usdToCredits(usdCost: number): number {
  return Math.ceil(usdCost / CREDIT_TO_USD_RATE)
}

/**
 * Convert credits to USD
 */
export function creditsToUsd(credits: number): number {
  return credits * CREDIT_TO_USD_RATE
}

/**
 * Calculate credits consumed for token usage
 */
export function calculateCreditsUsed(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const usdCost = calculateTokenCost(modelName, inputTokens, outputTokens)
  return usdToCredits(usdCost)
}

/**
 * Format credits for display
 */
export function formatCredits(credits: number): string {
  if (credits < 1) {
    return `${credits.toFixed(2)} créditos`
  }
  return `${Math.round(credits).toLocaleString()} créditos`
}

/**
 * Format USD for display
 */
export function formatUsd(usd: number): string {
  if (usd < 0.01) {
    return `< $0.01`
  }
  return `$${usd.toFixed(4)}`
}

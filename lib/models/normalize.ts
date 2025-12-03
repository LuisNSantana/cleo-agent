// Normalización de IDs de modelos legacy al nuevo conjunto reducido
// Modelos válidos expuestos al usuario:
//  - grok-4-1-fast-reasoning (default - latest with 2M context)
//  - grok-4-fast-reasoning (legacy alias)
//  - openrouter:z-ai/glm-4.5-air:free (free tier)
//  - openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free (uncensored)
// Todo lo demás cae a grok-4-1-fast-reasoning.

// Default model for all operations
const DEFAULT_MODEL = 'grok-4-1-fast-reasoning'

const LEGACY_TO_DEFAULT = new Set<string>([
  'gpt-5', 'gpt-5-mini', 'gpt-5-mini-2025-08-07', 'gpt-4o', 'gpt-4o-mini',
  'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-20250219',
  'mistral-medium-2508', 'mistral-large-latest-fallback', 'openrouter:deepseek/deepseek-chat-v3.1:free',
  'openrouter:openai/gpt-oss-120b', 'gpt-oss-120b', 'openrouter:openrouter/sonoma-sky-alpha', 'openrouter:z-ai/glm-4.5',
  'grok-3', 'grok-4-fast-non-reasoning', 'grok-4-fast'
])

// All valid models that should pass through unchanged
const VALID_MODELS = new Set([
  'grok-4-fast-reasoning',
  'grok-4-1-fast-reasoning',
  // Smarter tier (OpenAI GPT-5.1)
  'gpt-5.1-2025-11-13',
  'gpt-5.1',
  // Free tier models
  'openrouter:z-ai/glm-4.5-air:free',
  'z-ai/glm-4.5-air:free',
  'openrouter:arcee-ai/trinity-mini:free',
  'arcee-ai/trinity-mini:free',
  'openrouter:amazon/nova-2-lite-v1:free',
  'amazon/nova-2-lite-v1:free',
  // Uncensored models
  'openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
])

const SMARTER_ALIASES = new Set([
  'smarter', 'smarter-tier', 'gpt-5', 'gpt-5-mini', 'gpt-5-mini-2025-08-07', 'gpt5-mini'
])

export function normalizeModelId(id: string | undefined | null): string {
  if (!id) return DEFAULT_MODEL
  // Map old public multimodal id to new reasoning id
  if (id === 'grok-4-multimodal') return DEFAULT_MODEL
  // Map smarter aliases to GPT-5.1
  if (SMARTER_ALIASES.has(id)) return 'gpt-5.1-2025-11-13'
  if (VALID_MODELS.has(id)) return id
  if (LEGACY_TO_DEFAULT.has(id)) return DEFAULT_MODEL
  return DEFAULT_MODEL
}

export function isMultimodal(id: string): boolean {
  return id === 'grok-4-fast-reasoning'
}

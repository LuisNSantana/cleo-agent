// Normalización de IDs de modelos legacy al nuevo conjunto reducido
// Expuestos:
//  - grok-4-free
//  - grok-4-multimodal
// Todo lo demás cae a grok-4-free.

const LEGACY_TO_FREE = new Set<string>([
  'gpt-5', 'gpt-5-mini', 'gpt-5-mini-2025-08-07', 'gpt-4o', 'gpt-4o-mini',
  'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-20250219',
  'mistral-medium-2508', 'mistral-large-latest-fallback', 'openrouter:deepseek/deepseek-chat-v3.1:free',
  'openrouter:openai/gpt-oss-120b', 'gpt-oss-120b', 'openrouter:openrouter/sonoma-sky-alpha', 'openrouter:z-ai/glm-4.5',
  'grok-3', 'grok-4-fast-reasoning', 'grok-4-fast-non-reasoning'
])

const VALID_MODELS = new Set(['grok-4-free', 'grok-4-multimodal'])

export function normalizeModelId(id: string | undefined | null): string {
  if (!id) return 'grok-4-free'
  if (VALID_MODELS.has(id)) return id
  if (LEGACY_TO_FREE.has(id)) return 'grok-4-free'
  return 'grok-4-free'
}

export function isMultimodal(id: string): boolean {
  return id === 'grok-4-multimodal'
}

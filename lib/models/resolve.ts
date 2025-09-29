import type { ModelConfig } from './types'
import { normalizeModelId } from '@/lib/openproviders/provider-map'

export const DEFAULT_FALLBACK_MODEL_ID = 'grok-4-fast-reasoning'

export function resolveModelFromList(
  requestedModel: string,
  models: ModelConfig[],
  fallbackId: string = DEFAULT_FALLBACK_MODEL_ID
): {
  modelConfig: ModelConfig
  normalizedModel: string
  usedFallback: boolean
} {
  const normalized = normalizeModelId(requestedModel)
  const direct = models.find((m) => m.id === requestedModel) ?? models.find((m) => m.id === normalized)

  if (direct) {
    return {
      modelConfig: direct,
      normalizedModel: direct.id,
      usedFallback: false,
    }
  }

  const fallback = models.find((m) => m.id === fallbackId) ?? models[0]
  if (!fallback) {
    throw new Error('No models configured for fallback')
  }

  return {
    modelConfig: fallback,
    normalizedModel: fallback.id,
    usedFallback: true,
  }
}

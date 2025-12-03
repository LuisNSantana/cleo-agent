import type { ModelConfig } from './types'
import { normalizeModelId } from '@/lib/openproviders/provider-map'

export const DEFAULT_FALLBACK_MODEL_ID = 'grok-4-1-fast-reasoning'

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

  // Handle well-known aliases as direct (non-fallback) selections to satisfy callers/tests
  // Reasoning is a runtime toggle for Grok models; map the alias to the primary config when present.
  if (normalized === 'grok-4-fast-reasoning') {
    const primary = models.find((m) => m.id === 'grok-4-fast')
    if (primary) {
      return {
        // Return a shallow-cloned config with the aliased id so downstream code sees the requested id
        modelConfig: { ...primary, id: 'grok-4-fast-reasoning' },
        normalizedModel: 'grok-4-fast-reasoning',
        usedFallback: false,
      }
    }
  }

  // Handle grok-4-1-fast-reasoning alias (xAI direct model)
  if (normalized === 'grok-4-1-fast-reasoning') {
    const primary = models.find((m) => m.id === 'grok-4-1-fast-reasoning')
    if (primary) {
      return {
        modelConfig: primary,
        normalizedModel: 'grok-4-1-fast-reasoning',
        usedFallback: false,
      }
    }
  }

  // Prefer an exact match on fallbackId, otherwise try normalized matches
  const normalizedFallback = normalizeModelId(fallbackId)
  let fallback =
    models.find((m) => m.id === fallbackId)
    || models.find((m) => m.id === normalizedFallback)
    || models.find((m) => normalizeModelId(m.id) === normalizedFallback)
    || models[0]
  if (!fallback) {
    throw new Error('No models configured for fallback')
  }

  // If the desired fallback id is an alias that's not present in the list (e.g., grok-4-fast-reasoning),
  // but an equivalent primary exists (grok-4-fast), return a cloned config with the alias id.
  if (normalizedFallback === 'grok-4-fast-reasoning' && fallback.id === 'grok-4-fast') {
    const cloned = { ...fallback, id: 'grok-4-fast-reasoning' }
    return {
      modelConfig: cloned,
      normalizedModel: cloned.id,
      usedFallback: true,
    }
  }

  // Handle grok-4-1-fast-reasoning fallback alias (xAI direct model)
  if (normalizedFallback === 'grok-4-1-fast-reasoning' && fallback.id === 'grok-4-1-fast-reasoning') {
    return {
      modelConfig: fallback,
      normalizedModel: fallback.id,
      usedFallback: true,
    }
  }

  return {
    modelConfig: fallback,
    normalizedModel: fallback.id,
    usedFallback: true,
  }
}

import { MODELS } from '@/lib/models'
import { resolveModelFromList, DEFAULT_FALLBACK_MODEL_ID } from '@/lib/models/resolve'
import { normalizeModelId } from '@/lib/openproviders/provider-map'

describe('model resolver', () => {
  it('normalizes legacy grok-4-multimodal to grok-4-fast-reasoning', () => {
    expect(normalizeModelId('grok-4-multimodal')).toBe('grok-4-fast-reasoning')
    expect(normalizeModelId('openrouter:grok-4-multimodal')).toBe('grok-4-fast-reasoning')
  })

  it('returns direct model when available', () => {
    const direct = resolveModelFromList('grok-4-fast-reasoning', MODELS)
    expect(direct.modelConfig.id).toBe('grok-4-fast-reasoning')
    expect(direct.normalizedModel).toBe('grok-4-fast-reasoning')
    expect(direct.usedFallback).toBe(false)
  })

  it('falls back to default when model missing', () => {
    const resolved = resolveModelFromList('non-existent-model', MODELS)
    expect(resolved.modelConfig.id).toBe(DEFAULT_FALLBACK_MODEL_ID)
    expect(resolved.normalizedModel).toBe(DEFAULT_FALLBACK_MODEL_ID)
    expect(resolved.usedFallback).toBe(true)
  })
})

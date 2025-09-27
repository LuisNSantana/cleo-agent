import { MODELS } from "@/lib/models"
import { normalizeModelId } from "@/lib/openproviders/provider-map"

const IMAGE_MODEL_IDS = new Set<string>([
  "gemini-2.5-flash-image-preview",
  "google/gemini-2.5-flash-image-preview",
  // Removed openrouter variants for image generation to avoid confusion (OpenRouter no image gen here)
  "dall-e-3",
  "openai/dall-e-3",
  // OpenAI image model fallback
  "gpt-image-1",
  "openai/gpt-image-1",
  // FLUX-pro (preferred higher quality)
  "flux-pro",
  "black-forest-labs/FLUX-pro",
  "black-forest-labs/flux-pro",
  "flux-1-schnell",
  "black-forest-labs/flux-1-schnell",
  "flux-1-pro",
  "black-forest-labs/flux-1-pro",
])

const IMAGE_MODEL_TAGS = new Set<string>(["image-generation", "text-to-image"])

export function isImageGenerationModel(modelId?: string | null): boolean {
  if (!modelId) {
    return false
  }

  if (IMAGE_MODEL_IDS.has(modelId)) {
    return true
  }

  const normalizedId = normalizeModelId(modelId)
  if (IMAGE_MODEL_IDS.has(normalizedId)) {
    return true
  }

  const candidates = MODELS.filter(
    (model) => model.id === modelId || model.id === normalizedId
  )

  for (const candidate of candidates) {
    if (candidate.tags?.some((tag) => IMAGE_MODEL_TAGS.has(tag))) {
      return true
    }
  }

  return false
}

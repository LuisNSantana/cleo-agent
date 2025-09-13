import { DISABLED_MODEL_IDS, FREE_MODELS_IDS } from "@/lib/config"
import { ModelConfig } from "@/lib/models/types"

/**
 * Utility function to filter and sort models based on favorites, search, and visibility
 * @param models - All available models
 * @param favoriteModels - Array of favorite model IDs
 * @param searchQuery - Search query to filter by model name
 * @param isModelHidden - Function to check if a model is hidden
 * @returns Filtered and sorted models
 */
export function filterAndSortModels(
  models: ModelConfig[],
  favoriteModels: string[],
  searchQuery: string,
  isModelHidden: (modelId: string) => boolean
): ModelConfig[] {
  const availableModels = models
    .filter((model) => !isModelHidden(model.id))
    .filter((model) => !DISABLED_MODEL_IDS.includes(model.id))
  
  // Check if any favorite models actually exist in the available models
  const validFavorites = favoriteModels?.filter(fav => 
    availableModels.some(model => model.id === fav)
  ) || []

  // Build favorites list preserving the order provided by user preferences
  const byId: Record<string, ModelConfig> = Object.fromEntries(
    availableModels.map((m) => [m.id, m])
  )
  const favoriteList: ModelConfig[] = validFavorites
    .map((fid) => byId[fid])
    .filter(Boolean)

  // Collect non-favorites
  const favoriteSet = new Set(validFavorites)
  const others: ModelConfig[] = availableModels.filter(
    (m) => !favoriteSet.has(m.id)
  )

  // Sort others strictly A→Z by display name
  others.sort((a, b) => a.name.localeCompare(b.name))

  const merged = [...favoriteList, ...others]

  // Apply search filter at the end
  const needle = searchQuery.toLowerCase()
  return needle
    ? merged.filter(m => m.name.toLowerCase().includes(needle))
    : merged
}

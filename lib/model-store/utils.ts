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

  // Separate favorites and others
  const favoriteList: ModelConfig[] = []
  const others: ModelConfig[] = []
  for (const m of availableModels) {
    if (validFavorites.includes(m.id)) favoriteList.push(m)
    else others.push(m)
  }

  // Sort others: free models first, then by name
  others.sort((a, b) => {
    const aIsFree = FREE_MODELS_IDS.includes(a.id)
    const bIsFree = FREE_MODELS_IDS.includes(b.id)
    if (aIsFree !== bIsFree) return aIsFree ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const merged = [...favoriteList, ...others]

  // Apply search filter at the end
  const needle = searchQuery.toLowerCase()
  return needle
    ? merged.filter(m => m.name.toLowerCase().includes(needle))
    : merged
}

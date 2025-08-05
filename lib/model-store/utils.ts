import { FREE_MODELS_IDS } from "@/lib/config"
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
  const availableModels = models.filter((model) => !isModelHidden(model.id))
  
  // Check if any favorite models actually exist in the available models
  const validFavorites = favoriteModels?.filter(fav => 
    availableModels.some(model => model.id === fav)
  ) || []
  
  return availableModels
    .filter((model) => {
      // If user has valid favorite models, only show those
      if (validFavorites.length > 0) {
        return validFavorites.includes(model.id)
      }
      // If no valid favorites, show all models
      return true
    })
    .filter((model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // If user has valid favorite models, maintain their order
      if (validFavorites.length > 0) {
        const aIndex = validFavorites.indexOf(a.id)
        const bIndex = validFavorites.indexOf(b.id)
        return aIndex - bIndex
      }

      // Fallback to original sorting (free models first)
      const aIsFree = FREE_MODELS_IDS.includes(a.id)
      const bIsFree = FREE_MODELS_IDS.includes(b.id)
      return aIsFree === bIsFree ? 0 : aIsFree ? -1 : 1
    })
}

"use client"

import { useModel } from "@/lib/model-store/provider"
import { ModelConfig } from "@/lib/models/types"
import { PROVIDERS } from "@/lib/providers"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { FREE_MODELS_IDS, MODEL_DEFAULT } from "@/lib/config"
import {
  DotsSixVerticalIcon,
  MinusIcon,
  PlusIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowCounterClockwiseIcon,
} from "@phosphor-icons/react"
import { AnimatePresence, motion, Reorder } from "framer-motion"
import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useFavoriteModels } from "./use-favorite-models"

type FavoriteModelItem = ModelConfig & {
  isFavorite: boolean
}

export function ModelsSettings() {
  const { models } = useModel()
  const { isModelHidden } = useUserPreferences()
  const [searchQuery, setSearchQuery] = useState("")

  // Use TanStack Query for favorite models with optimistic updates
  const {
    favoriteModels: currentFavoriteModels,
    updateFavoriteModels,
    updateFavoriteModelsDebounced,
  } = useFavoriteModels()

  // Create favorite models list with additional metadata
  const favoriteModels: FavoriteModelItem[] = useMemo(() => {
    if (!currentFavoriteModels || !Array.isArray(currentFavoriteModels)) {
      return []
    }

    return currentFavoriteModels
      .map((id: string) => {
        const model = models.find((m) => m.id === id)
        if (!model || isModelHidden(model.id)) return null
        return { ...model, isFavorite: true }
      })
      .filter(Boolean) as FavoriteModelItem[]
  }, [currentFavoriteModels, models, isModelHidden])

  // Available models that aren't favorites yet, filtered and grouped by provider
  const availableModelsByProvider = useMemo(() => {
    if (!currentFavoriteModels || !Array.isArray(currentFavoriteModels)) {
      return {}
    }

    const availableModels = models
      .filter(
        (model) =>
          !currentFavoriteModels.includes(model.id) && !isModelHidden(model.id)
      )
      .filter((model) =>
        model.name.toLowerCase().includes(searchQuery.toLowerCase())
      )

    return availableModels.reduce(
      (acc, model) => {
        const iconKey = model.icon || "unknown"

        if (!acc[iconKey]) {
          acc[iconKey] = []
        }

        acc[iconKey].push(model)

        return acc
      },
      {} as Record<string, typeof models>
    )
  }, [models, currentFavoriteModels, isModelHidden, searchQuery])

  // Handle reorder - immediate state update with debounced API call
  const handleReorder = (newOrder: FavoriteModelItem[]) => {
    const newOrderIds = newOrder.map((item) => item.id)

    // Immediate optimistic update with debounced API call
    updateFavoriteModelsDebounced(newOrderIds)
  }

  // Keyboard-friendly move up/down handlers
  const moveFavorite = (modelId: string, direction: "up" | "down") => {
    if (!currentFavoriteModels || !Array.isArray(currentFavoriteModels)) return
    const idx = currentFavoriteModels.indexOf(modelId)
    if (idx === -1) return
    const newIndex = direction === "up" ? idx - 1 : idx + 1
    if (newIndex < 0 || newIndex >= currentFavoriteModels.length) return
    const next = [...currentFavoriteModels]
    const [item] = next.splice(idx, 1)
    next.splice(newIndex, 0, item)
    updateFavoriteModelsDebounced(next)
  }

  // Quick actions
  const RECOMMENDED_IDS = [MODEL_DEFAULT, "grok-4", "gpt-oss-120b"]
  const applyRecommended = () => {
    if (!Array.isArray(models)) return
    const existing = new Set(
      models.filter((m) => !isModelHidden(m.id)).map((m) => m.id)
    )
    const rec = RECOMMENDED_IDS.filter((id) => existing.has(id))
    if (rec.length === 0) return
    updateFavoriteModels(rec)
  }

  const addFreeModels = () => {
    if (!Array.isArray(models)) return
    const visible = new Set(
      models.filter((m) => !isModelHidden(m.id)).map((m) => m.id)
    )
    const freeVisible = FREE_MODELS_IDS.filter((id) => visible.has(id))
    const base = Array.isArray(currentFavoriteModels)
      ? currentFavoriteModels
      : []
    const merged = Array.from(new Set([...base, ...freeVisible]))
    updateFavoriteModelsDebounced(merged)
  }

  const toggleFavorite = (modelId: string) => {
    if (!currentFavoriteModels || !Array.isArray(currentFavoriteModels)) {
      return
    }

    const isCurrentlyFavorite = currentFavoriteModels.includes(modelId)
    const newIds = isCurrentlyFavorite
      ? currentFavoriteModels.filter((id: string) => id !== modelId)
      : [...currentFavoriteModels, modelId]

    // Optimistic update - immediately updates UI
    updateFavoriteModels(newIds)
  }

  const removeFavorite = (modelId: string) => {
    if (!currentFavoriteModels || !Array.isArray(currentFavoriteModels)) {
      return
    }

    const newIds = currentFavoriteModels.filter((id: string) => id !== modelId)

    // Optimistic update - immediately updates UI
    updateFavoriteModels(newIds)
  }

  const getProviderIcon = (model: ModelConfig) => {
    const provider = PROVIDERS.find((p) => p.id === model.baseProviderId)
    return provider?.icon
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-2 bg-background/80 px-2 pb-2 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Models</h3>
            <p className="text-muted-foreground text-sm">Curate and prioritize your model lineup.</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
            <button
              type="button"
              onClick={applyRecommended}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
              title="Reset to recommended"
            >
              <ArrowCounterClockwiseIcon className="size-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={addFreeModels}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
              title="Add all free models"
            >
              <PlusIcon className="size-3.5" />
              Free
            </button>
          </div>
        </div>
      </div>
      <Separator />

      {/* Favorite Models - Drag and Drop List */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium">Your favorites</h4>
          <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
            {favoriteModels.length}
          </span>
        </div>
        <AnimatePresence initial={false}>
          {favoriteModels.length > 0 ? (
            <Reorder.Group
              axis="y"
              values={favoriteModels}
              onReorder={handleReorder}
              className="grid grid-cols-1 gap-2"
            >
              {favoriteModels.map((model) => {
                const ProviderIcon = getProviderIcon(model)

                return (
                  <Reorder.Item key={model.id} value={model} className="group">
                    <div className="bg-card/60 border-border flex items-center gap-3 rounded-lg border p-3 shadow-sm transition-colors hover:bg-card" role="listitem" aria-label={`Favorite model ${model.name}`}>
                      {/* Drag Handle */}
                      <div className="text-muted-foreground cursor-grab opacity-60 transition-opacity group-hover:opacity-100 active:cursor-grabbing" aria-label="Drag to reorder" title="Drag to reorder">
                        <DotsSixVerticalIcon className="size-4" />
                      </div>

                      {/* Provider Icon */}
                      {ProviderIcon && (
                        <ProviderIcon className="size-5 shrink-0" />
                      )}

                      {/* Model Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">
                            {model.name}
                          </span>
                          {favoriteModels[0]?.id === model.id && (
                            <span className="bg-emerald-500/10 text-emerald-500 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                              Default
                            </span>
                          )}
                          <div className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-2xs">
                            {model.provider}
                          </div>
                        </div>
                        {model.description && (
                          <p className="text-muted-foreground mt-1 truncate text-xs">
                            {model.description}
                          </p>
                        )}
                      </div>

                      {/* Reorder + Remove Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveFavorite(model.id, "up")}
                          type="button"
                          className="text-muted-foreground hover:text-foreground rounded-md border p-1 opacity-0 transition-all group-hover:opacity-100 disabled:opacity-30"
                          disabled={favoriteModels[0]?.id === model.id}
                          title="Move up"
                          aria-label="Move up"
                        >
                          <ArrowUpIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => moveFavorite(model.id, "down")}
                          type="button"
                          className="text-muted-foreground hover:text-foreground rounded-md border p-1 opacity-0 transition-all group-hover:opacity-100 disabled:opacity-30"
                          disabled={favoriteModels[favoriteModels.length - 1]?.id === model.id}
                          title="Move down"
                          aria-label="Move down"
                        >
                          <ArrowDownIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => removeFavorite(model.id)}
                          type="button"
                          disabled={favoriteModels.length <= 1}
                          className="text-muted-foreground hover:text-foreground rounded-md border p-1 opacity-0 transition-all group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            favoriteModels.length <= 1
                              ? "At least one favorite model is required"
                              : "Remove from favorites"
                          }
                        >
                          <MinusIcon className="size-4" />
                        </button>
                      </div>
                    </div>
                  </Reorder.Item>
                )
              })}
            </Reorder.Group>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-border text-muted-foreground flex h-32 items-center justify-center rounded-lg border border-dashed"
            >
              <div className="text-center">
                <StarIcon className="mx-auto mb-2 size-8 opacity-50" />
                <p className="text-sm">No favorite models yet</p>
                <p className="text-xs">Add models from the list below or use a quick action</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={applyRecommended}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                    title="Apply recommended"
                  >
                    <ArrowCounterClockwiseIcon className="size-3.5" />
                    Recommended
                  </button>
                  <button
                    type="button"
                    onClick={addFreeModels}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                    title="Add all free models"
                  >
                    <PlusIcon className="size-3.5" />
                    Free models
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Available Models */}
      <div>
        <div className="mb-3">
          <h4 className="text-sm font-medium">Available models</h4>
          <p className="text-muted-foreground text-sm">Add models to your favorites.</p>
        </div>

        {/* Models grouped by provider */}
        <div className="space-y-6 pb-6">
          {Object.entries(availableModelsByProvider).map(
            ([iconKey, modelsGroup]) => {
              const firstModel = modelsGroup[0]
              const provider = PROVIDERS.find((p) => p.id === firstModel.icon)

              return (
                <div key={iconKey} className="space-y-3">
                  <div className="flex items-center gap-2">
                    {provider?.icon && <provider.icon className="size-5" />}
                    <h4 className="font-medium">{provider?.name || iconKey}</h4>
                    <span className="text-muted-foreground text-sm">
                      ({modelsGroup.length} models)
                    </span>
                  </div>

                  <div className="space-y-2 pl-7">
                    {modelsGroup.map((model) => {
                      const modelProvider = PROVIDERS.find(
                        (p) => p.id === model.provider
                      )

                      return (
                        <motion.div
                          key={model.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center justify-between rounded-md px-1 py-1 hover:bg-muted/40"
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{model.name}</span>
                              <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-2xs">
                                via {modelProvider?.name || model.provider}
                              </span>
                            </div>
                            {model.description && (
                              <span className="text-muted-foreground text-xs">
                                {model.description}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => toggleFavorite(model.id)}
                            type="button"
                            className="text-muted-foreground hover:text-foreground rounded-md border p-1 transition-colors"
                            title="Add to favorites"
                          >
                            <PlusIcon className="size-4" />
                          </button>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )
            }
          )}
        </div>

        {Object.keys(availableModelsByProvider).length === 0 && (
          <div className="text-muted-foreground py-8 text-center text-sm">
            {searchQuery
              ? `No models found matching "${searchQuery}"`
              : "No available models to add"}
          </div>
        )}
      </div>
    </div>
  )
}

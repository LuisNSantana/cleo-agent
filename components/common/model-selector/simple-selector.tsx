"use client"

import { Button } from "@/components/ui/button"
import { MODEL_DEFAULT } from "@/lib/config"
import { grokModels } from "@/lib/models/data/grok"
import { ModelConfig } from "@/lib/models/types"
import { cn } from "@/lib/utils"
import { BrainIcon, CheckCircleIcon } from "@phosphor-icons/react"

type SimpleModelSelectorProps = {
  selectedModelId: string
  setSelectedModelId?: (modelId: string) => void
  className?: string
  disabled?: boolean
}

export function SimpleModelSelector({
  selectedModelId,
  setSelectedModelId,
  className,
  disabled = false,
}: SimpleModelSelectorProps) {
  // Find the current model
  const currentModel = grokModels.find((model: ModelConfig) => model.id === selectedModelId) || 
                      grokModels.find((model: ModelConfig) => model.id === MODEL_DEFAULT)

  if (!currentModel) {
    return (
      <Button
        variant="outline"
        className={cn("justify-start gap-2", className)}
        disabled={disabled}
      >
        <BrainIcon className="size-4" />
        <span>No model available</span>
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      className={cn("justify-start gap-2", className)}
      disabled={disabled}
    >
      <BrainIcon className="size-4" />
      <div className="flex items-center gap-2">
        <span className="font-medium">{currentModel.name}</span>
        <CheckCircleIcon className="size-3 text-green-500" />
      </div>
    </Button>
  )
}

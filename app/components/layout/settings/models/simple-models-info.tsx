"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MODEL_DEFAULT } from "@/lib/config"
import { grokModels } from "@/lib/models/data/grok"
import { ModelConfig } from "@/lib/models/types"
import { BrainIcon, CheckCircleIcon } from "@phosphor-icons/react"

export function SimpleModelsInfo() {
  // Find the Grok-4 model
  const grokModel = grokModels.find((model: ModelConfig) => model.id === MODEL_DEFAULT)

  if (!grokModel) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainIcon className="size-5" />
            AI Model
          </CardTitle>
          <CardDescription>
            Information about the AI model powering your conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Model information not available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainIcon className="size-5" />
          AI Model
        </CardTitle>
        <CardDescription>
          Information about the AI model powering your conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{grokModel.name}</h3>
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircleIcon className="size-3" />
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {grokModel.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Provider:</span>
            <p className="text-muted-foreground">xAI</p>
          </div>
          <div>
            <span className="font-medium">Context Length:</span>
            <p className="text-muted-foreground">{grokModel.contextWindow?.toLocaleString()} tokens</p>
          </div>
          <div>
            <span className="font-medium">Intelligence:</span>
            <p className="text-muted-foreground capitalize">{grokModel.intelligence}</p>
          </div>
          <div>
            <span className="font-medium">Speed:</span>
            <p className="text-muted-foreground capitalize">{grokModel.speed}</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            This model is pre-configured and ready to use. No additional setup required.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Lightning, Brain } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { AgentMode } from "@/app/api/chat/schema"

type ButtonAgentModeProps = {
  agentMode: AgentMode
  onToggleAction: (mode: AgentMode) => void
  isAuthenticated: boolean
}

/**
 * Toggle button for switching between Super Ankie (fast) and Multi-Agent (deep) modes
 */
export function ButtonAgentMode({
  agentMode,
  onToggleAction,
  isAuthenticated,
}: ButtonAgentModeProps) {
  const isSuperMode = agentMode === 'super'
  
  const handleToggle = () => {
    onToggleAction(isSuperMode ? 'multi' : 'super')
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className={cn(
              "h-9 w-9 p-0 rounded-full transition-all duration-200",
              isSuperMode
                ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                : "text-purple-500 hover:text-purple-600 hover:bg-purple-500/10"
            )}
            aria-label={isSuperMode ? "Switch to Deep Mode" : "Switch to Fast Mode"}
          >
            {isSuperMode ? (
              <Lightning className="h-5 w-5" weight="fill" />
            ) : (
              <Brain className="h-5 w-5" weight="fill" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <div className="space-y-1">
            <p className="font-medium">
              {isSuperMode ? "⚡ Modo Rápido" : "🧠 Modo Profundo"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSuperMode
                ? "Respuestas rápidas con herramientas directas"
                : "Multi-agente para tareas complejas"}
            </p>
            <p className="text-xs text-muted-foreground/70">
              Click para cambiar a {isSuperMode ? "Modo Profundo" : "Modo Rápido"}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

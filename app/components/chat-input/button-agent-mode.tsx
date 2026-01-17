"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Lightning, Brain, Info } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { AgentMode } from "@/app/api/chat/schema"
import { motion } from "framer-motion"

type ButtonAgentModeProps = {
  agentMode: AgentMode
  onToggleAction: (mode: AgentMode) => void
  isAuthenticated: boolean
}

/**
 * Enhanced toggle for switching between Super Ankie (fast) and Multi-Agent (deep) modes
 * 
 * UX Improvements:
 * - Segmented control style for clarity
 * - Both options visible at all times
 * - Clear visual indicator of active mode
 * - Descriptive tooltips for each mode
 */
export function ButtonAgentMode({
  agentMode,
  onToggleAction,
  isAuthenticated,
}: ButtonAgentModeProps) {
  const isSuperMode = agentMode === 'super'
  
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1">
        {/* Segmented Control Container */}
        <div className="relative flex items-center bg-secondary/50 rounded-full p-0.5 border border-border/50">
          {/* Sliding Background Indicator */}
          <motion.div
            className={cn(
              "absolute h-7 rounded-full transition-colors duration-200",
              isSuperMode 
                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
                : "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30"
            )}
            initial={false}
            animate={{
              x: isSuperMode ? 0 : "100%",
              width: "50%",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          
          {/* Super Ankie Mode Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToggleAction('super')}
                className={cn(
                  "relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                  isSuperMode
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Modo Rápido - Super Ankie"
              >
                <Lightning 
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    isSuperMode && "animate-pulse"
                  )} 
                  weight={isSuperMode ? "fill" : "regular"} 
                />
                <span className="hidden sm:inline">Rápido</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Lightning className="h-4 w-4 text-amber-500" weight="fill" />
                  <span className="font-semibold text-amber-500">Super Ankie</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Respuestas instantáneas con acceso directo a herramientas.
                  Ideal para tareas rápidas y consultas simples.
                </p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 pt-1 border-t border-border/50">
                  <span>✓ Más rápido</span>
                  <span>•</span>
                  <span>✓ Directo</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Multi-Agent Mode Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToggleAction('multi')}
                className={cn(
                  "relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                  !isSuperMode
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Modo Profundo - Multi-Agente"
              >
                <Brain 
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    !isSuperMode && "animate-pulse"
                  )} 
                  weight={!isSuperMode ? "fill" : "regular"} 
                />
                <span className="hidden sm:inline">Profundo</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" weight="fill" />
                  <span className="font-semibold text-purple-500">Multi-Agente</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Análisis profundo con múltiples agentes especializados.
                  Mejor para tareas complejas que requieren expertise.
                </p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 pt-1 border-t border-border/50">
                  <span>✓ Más preciso</span>
                  <span>•</span>
                  <span>✓ Especializado</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Info Button for overall explanation */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              aria-label="¿Qué es esto?"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px]">
            <div className="space-y-2">
              <p className="font-medium text-sm">Modos de Ankie</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Lightning className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" weight="fill" />
                  <span><strong>Rápido:</strong> Respuestas directas, sin delegación</span>
                </div>
                <div className="flex items-start gap-2">
                  <Brain className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" weight="fill" />
                  <span><strong>Profundo:</strong> Múltiples agentes para análisis complejo</span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

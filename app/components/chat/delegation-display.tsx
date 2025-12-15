"use client"

import { getAgentMetadata } from "@/lib/agents/agent-metadata"
import { cn } from "@/lib/utils"
import { ChatCircleDots, Lightning, CheckCircle } from "@phosphor-icons/react"

interface DelegationDisplayProps {
  targetAgent: string
  targetAgentName?: string
  task: string
  context?: string
  outputFormat?: string
  result?: string
  isCompleted?: boolean
  className?: string
}

/**
 * Componente especializado para mostrar delegaciones de manera intuitiva
 * Reemplaza el JSON técnico con una visualización amigable
 */
export function DelegationDisplay({
  targetAgent,
  targetAgentName,
  task,
  context,
  outputFormat,
  result,
  isCompleted = false,
  className,
}: DelegationDisplayProps) {
  const agentMeta = getAgentMetadata(targetAgent, targetAgentName)

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header: Agente delegado */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {agentMeta.avatar ? (
            <img
              src={agentMeta.avatar}
              alt={agentMeta.name}
              className="h-10 w-10 rounded-full ring-2 ring-border/60"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-border/60"
              aria-label={agentMeta.name}
            >
              {agentMeta.avatar ? (
                <img src={agentMeta.avatar} alt={agentMeta.name} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div 
                  className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                  style={{ backgroundColor: agentMeta.color || '#6366f1' }}
                >
                  {agentMeta.initials || agentMeta.name?.slice(0, 2).toUpperCase() || '??'}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-base">{agentMeta.name}</h4>
            {isCompleted ? (
              <div className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                <CheckCircle weight="fill" className="h-3 w-3" />
                Completado
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                <Lightning weight="fill" className="h-3 w-3" />
                En progreso
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Especialista delegado para esta tarea
          </p>
        </div>
      </div>

      {/* Tarea asignada */}
      <div className="bg-accent/50 rounded-lg border border-border p-3">
        <div className="flex items-center gap-2 mb-2">
          <ChatCircleDots className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Tarea Asignada
          </span>
        </div>
        <p className="text-sm leading-relaxed">{task}</p>
      </div>

      {/* Contexto (opcional) */}
      {context && (
        <div className="bg-muted/50 rounded-lg border border-border p-3">
          <div className="text-muted-foreground text-xs font-medium mb-1.5">
            Contexto
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{context}</p>
        </div>
      )}

      {/* Formato de salida esperado (opcional) */}
      {outputFormat && (
        <div className="bg-muted/50 rounded-lg border border-border p-3">
          <div className="text-muted-foreground text-xs font-medium mb-1.5">
            Formato Esperado
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{outputFormat}</p>
        </div>
      )}

      {/* Resultado (si está completado) */}
      {isCompleted && result && (
        <div className="bg-background rounded-lg border-2 border-green-200 dark:border-green-800 p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle weight="fill" className="text-green-600 dark:text-green-400 h-4 w-4" />
            <span className="text-green-700 dark:text-green-400 text-xs font-medium uppercase tracking-wide">
              Resultado
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{result}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Detecta si los argumentos de una tool invocation son una delegación
 */
export function isDelegationToolInvocation(toolName: string, args: any): boolean {
  return (
    toolName?.startsWith('delegate_to_') &&
    args &&
    typeof args === 'object' &&
    'task' in args
  )
}

/**
 * Extrae información de delegación de los argumentos
 */
export function extractDelegationInfo(args: any, targetAgentFromToolName?: string): {
  targetAgent: string
  task: string
  context?: string
  outputFormat?: string
} | null {
  if (!args || typeof args !== 'object') return null

  // Detectar targetAgent desde múltiples fuentes
  let targetAgent = args.targetAgent || args.agentId || targetAgentFromToolName

  if (!targetAgent) return null

  // Convertir nombres cortos a IDs completos si es necesario
  const shortNameMap: Record<string, string> = {
    ami: 'ami-creative',
    toby: 'toby-technical',
    peter: 'peter-financial',
    emma: 'emma-ecommerce',
    apu: 'apu-support',
    nora: 'nora-medical',
    jenn: 'jenn-community',
    astra: 'astra-email',
    insights: 'iris-insights',
    wex: 'wex-intelligence',
  }

  if (shortNameMap[targetAgent]) {
    targetAgent = shortNameMap[targetAgent]
  }

  return {
    targetAgent,
    task: args.task || args.message || '',
    context: args.context,
    outputFormat: args.output_format || args.outputFormat,
  }
}

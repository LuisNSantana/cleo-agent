/**
 * Tool Selection & Execution Diagnostics Logger
 * ---------------------------------------------
 * Primera fase de instrumentación: registra decisiones reales de ejecución
 * de herramientas (las ya elegidas por el modelo) junto con contexto básico.
 * Posteriormente (Fase 2) se integrará ranking / scoring previo.
 *
 * Activación: establecer ENABLE_TOOL_SELECTION_DEBUG=1 (o "true")
 */

interface BaseLog {
  ts: string
  phase: 'execution' | 'selection'
  agentId: string
  userId?: string
  executionId?: string
}

export interface ToolExecutionStartLog extends BaseLog {
  event: 'tool_start'
  tool: string
  argsShape?: string[]
  notionCredentialPresent?: boolean
}

export interface ToolExecutionEndLog extends BaseLog {
  event: 'tool_end'
  tool: string
  success: boolean
  durationMs: number
  error?: string
  notionCredentialPresent?: boolean
}

function debugEnabled(): boolean {
  const v = process.env.ENABLE_TOOL_SELECTION_DEBUG
  return v === '1' || v === 'true'
}

function safeStringify(obj: any): string {
  try { return JSON.stringify(obj) } catch { return '[unserializable]' }
}

/** Emit a structured JSON log (prefijo para fácil grep). */
function emit(log: object) {
  if (!debugEnabled()) return
   
  console.log(`TOOL_DIAG ${safeStringify(log)}`)
}

export function logToolExecutionStart(data: Omit<ToolExecutionStartLog, 'ts' | 'phase'>) {
  emit({ ...data, ts: new Date().toISOString(), phase: 'execution' })
}

export function logToolExecutionEnd(data: Omit<ToolExecutionEndLog, 'ts' | 'phase'>) {
  emit({ ...data, ts: new Date().toISOString(), phase: 'execution' })
}

// Placeholder para futura fase de ranking (selection phase)
export interface SelectionRankingLog extends BaseLog {
  event: 'ranking'
  intent?: string
  // New optional diagnostics fields (backward-compatible)
  hasNotionKey?: boolean
  notionIntent?: boolean
  selectedTools?: string[]
  forcedCredentialTools?: string[]
  decision_reason?: string
  candidates: Array<{
    name: string
    baseScore?: number
    boosts?: Record<string, number>
    finalScore?: number
    rejectedReason?: string
  }>
  chosen?: string
  credentialSummary?: { notion?: boolean }
}

export function logSelectionRanking(data: Omit<SelectionRankingLog, 'ts' | 'phase'>) {
  emit({ ...data, ts: new Date().toISOString(), phase: 'selection' })
}

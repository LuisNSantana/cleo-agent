// Unified Execution State & Transition Guard
// Phase F1-02

export type ExecutionState =
  | 'pending_bootstrap'
  | 'running'
  | 'awaiting_confirmation'
  | 'paused'
  | 'failed'
  | 'cancelled'
  | 'completed'

const ALLOWED: Record<ExecutionState, ExecutionState[]> = {
  pending_bootstrap: ['running', 'cancelled', 'failed'],
  running: ['awaiting_confirmation', 'paused', 'failed', 'cancelled', 'completed'],
  awaiting_confirmation: ['running', 'cancelled', 'failed'],
  paused: ['running', 'cancelled', 'failed'],
  failed: [],
  cancelled: [],
  completed: []
}

export function canTransition(from: ExecutionState, to: ExecutionState) {
  if (from === to) return true
  return ALLOWED[from]?.includes(to) || false
}

export function assertTransition(from: ExecutionState, to: ExecutionState) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid execution state transition: ${from} -> ${to}`)
  }
}

export function safeSetState(obj: { status: ExecutionState }, next: ExecutionState, logger?: { warn?: Function; debug?: Function }): boolean {
  const prev = obj.status as ExecutionState
  if (prev === next) return false
  if (!canTransition(prev, next)) {
    logger?.warn?.('[ExecutionState] Blocked invalid transition', { from: prev, to: next })
    return false
  }
  obj.status = next
  logger?.debug?.('[ExecutionState] Transition', { from: prev, to: next })
  return true
}

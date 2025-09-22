import { randomUUID } from 'crypto'

/**
 * Action Types represent any long-running or multi-phase backend operation
 * whose lifecycle we want to expose to the UI (tool execution, delegation,
 * confirmation-gated action, etc.). Extend as needed.
 */
export type ActionKind = 'tool' | 'delegation' | 'confirmation-wrapper'

/**
 * Canonical statuses for an action lifecycle. Transitions should be enforced
 * via helper methods to guarantee consistency and idempotency.
 */
export type ActionStatus =
  | 'pending'          // created but not yet started
  | 'running'          // actively executing
  | 'awaiting_confirmation' // blocked on user confirmation
  | 'confirmed'        // user confirmed, resuming
  | 'completed'        // finished successfully
  | 'error'            // terminal failure
  | 'timeout'          // aborted due to inactivity or global timeout
  | 'cancelled'        // explicitly cancelled

export interface ActionConfirmationBlock {
  id: string
  requestedAt: string
  resolvedAt?: string
  state: 'requested' | 'approved' | 'rejected' | 'expired'
  // Tool specific / UI payload (already safe / redacted if necessary)
  payload: Record<string, any>
}

export type ActionEvent =
  | { id: string; actionId: string; ts: string; type: 'action_started' }
  | { id: string; actionId: string; ts: string; type: 'confirmation_requested' }
  | { id: string; actionId: string; ts: string; type: 'confirmation_resolved' }
  | { id: string; actionId: string; ts: string; type: 'action_timeout' }
  | { id: string; actionId: string; ts: string; type: 'action_cancelled' }
  | { id: string; actionId: string; ts: string; type: 'action_progress'; progress?: number; detail?: string }
  | { id: string; actionId: string; ts: string; type: 'action_result'; resultSummary?: string; output?: any }
  | { id: string; actionId: string; ts: string; type: 'action_error'; error: string; code?: string; stack?: string }

export interface ActionSnapshot {
  id: string
  kind: ActionKind
  status: ActionStatus
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  timeoutAt?: string
  cancelledAt?: string
  errorAt?: string
  // Original (possibly redacted) input
  input?: Record<string, any>
  // Result or partial output
  output?: any
  error?: { message: string; code?: string; stack?: string }
  progress?: number
  confirmations: ActionConfirmationBlock[]
  events: ActionEvent[]
  // Correlate to higher-level entities (chat message, user, thread, agent)
  meta?: {
    userId?: string
    threadId?: string
    messageId?: string
    agentId?: string
    toolName?: string
    delegationTarget?: string
  }
}

// In-memory bounded store (LRU eviction by insertion order when > max). For
// production multi-instance you would back this with redis or database.
interface SnapshotStoreOptions {
  maxEntries?: number
}

// Event shape accepted when appending (without system generated fields)
type AppendableEvent =
  | { type: 'action_started' }
  | { type: 'confirmation_requested' }
  | { type: 'confirmation_resolved' }
  | { type: 'action_timeout' }
  | { type: 'action_cancelled' }
  | { type: 'action_progress'; progress?: number; detail?: string }
  | { type: 'action_result'; resultSummary?: string; output?: any }
  | { type: 'action_error'; error: string; code?: string; stack?: string }

class ActionSnapshotStore {
  private snapshots = new Map<string, ActionSnapshot>()
  private options: Required<SnapshotStoreOptions>

  constructor(opts?: SnapshotStoreOptions) {
    this.options = { maxEntries: opts?.maxEntries ?? 500 }
  }

  private evictIfNeeded() {
    const { maxEntries } = this.options
    if (this.snapshots.size <= maxEntries) return
    // Evict oldest (Map preserves insertion order)
    const excess = this.snapshots.size - maxEntries
    const keys = Array.from(this.snapshots.keys())
    for (let i = 0; i < excess; i++) {
      this.snapshots.delete(keys[i])
    }
  }

  create(kind: ActionKind, init?: Partial<Omit<ActionSnapshot, 'id' | 'kind' | 'status' | 'createdAt' | 'updatedAt' | 'confirmations' | 'events'>>) {
    const id = randomUUID()
    const now = new Date().toISOString()
    const snapshot: ActionSnapshot = {
      id,
      kind,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      confirmations: [],
      events: [],
      ...(init || {})
    }
    this.snapshots.set(id, snapshot)
    this.evictIfNeeded()
    return snapshot
  }

  get(id: string) {
    return this.snapshots.get(id) || null
  }

  update(id: string, mut: (snap: ActionSnapshot) => void): ActionSnapshot | null {
    const snap = this.snapshots.get(id)
    if (!snap) return null
    mut(snap)
    snap.updatedAt = new Date().toISOString()
    return snap
  }

  appendEvent(id: string, event: AppendableEvent): ActionEvent | null {
    return this.update(id, (snap) => {
      const full: ActionEvent = { id: randomUUID(), actionId: id, ts: new Date().toISOString(), ...event }
      snap.events.push(full)
    })?.events.slice(-1)[0] || null
  }

  addConfirmationBlock(id: string, block: Omit<ActionConfirmationBlock, 'id' | 'requestedAt' | 'state'> & { state?: ActionConfirmationBlock['state'] }): ActionConfirmationBlock | null {
    let created: ActionConfirmationBlock | null = null
    this.update(id, (snap) => {
      const conf: ActionConfirmationBlock = {
        id: randomUUID(),
        requestedAt: new Date().toISOString(),
        state: block.state || 'requested',
        payload: block.payload,
        resolvedAt: block.resolvedAt
      }
      snap.confirmations.push(conf)
      created = conf
    })
    return created
  }

  resolveConfirmation(id: string, confirmationId: string, state: 'approved' | 'rejected' | 'expired'): ActionConfirmationBlock | null {
    let updated: ActionConfirmationBlock | null = null
    this.update(id, (snap) => {
      const conf = snap.confirmations.find(c => c.id === confirmationId)
      if (!conf) return
      if (conf.state !== 'requested') return // idempotent
      conf.state = state
      conf.resolvedAt = new Date().toISOString()
      updated = conf
    })
    return updated
  }
}

// Singleton store instance
export const actionSnapshotStore = new ActionSnapshotStore({ maxEntries: 600 })

// Helper factories for emitting canonical events + updating status
export const ActionLifecycle = {
  start(actionId: string) {
    actionSnapshotStore.update(actionId, (s) => {
      if (s.status === 'pending') {
        s.status = 'running'
        s.startedAt = new Date().toISOString()
      }
    })
    actionSnapshotStore.appendEvent(actionId, { type: 'action_started' })
  },
  awaitingConfirmation(actionId: string, payload: Record<string, any>) {
    actionSnapshotStore.update(actionId, (s) => { s.status = 'awaiting_confirmation' })
    const block = actionSnapshotStore.addConfirmationBlock(actionId, { payload })
    actionSnapshotStore.appendEvent(actionId, { type: 'confirmation_requested' })
    return block
  },
  confirmationResolved(actionId: string, confirmationId: string, approved: boolean) {
    const resolved = actionSnapshotStore.resolveConfirmation(actionId, confirmationId, approved ? 'approved' : 'rejected')
    actionSnapshotStore.update(actionId, (s) => { if (approved) s.status = 'confirmed' })
    actionSnapshotStore.appendEvent(actionId, { type: 'confirmation_resolved' })
    return resolved
  },
  progress(actionId: string, progress: number, detail?: string) {
    actionSnapshotStore.update(actionId, (s) => { s.progress = progress })
    actionSnapshotStore.appendEvent(actionId, { type: 'action_progress', progress, detail })
  },
  result(actionId: string, output: any, resultSummary?: string) {
    actionSnapshotStore.update(actionId, (s) => {
      s.status = 'completed'
      s.completedAt = new Date().toISOString()
      s.output = output
    })
    actionSnapshotStore.appendEvent(actionId, { type: 'action_result', output, resultSummary })
  },
  error(actionId: string, error: { message: string; code?: string; stack?: string }) {
    actionSnapshotStore.update(actionId, (s) => {
      s.status = 'error'
      s.error = error
      s.errorAt = new Date().toISOString()
    })
    actionSnapshotStore.appendEvent(actionId, { type: 'action_error', error: error.message, code: error.code, stack: error.stack })
  },
  timeout(actionId: string) {
    actionSnapshotStore.update(actionId, (s) => {
      if (s.status === 'completed' || s.status === 'error' || s.status === 'timeout' || s.status === 'cancelled') return
      s.status = 'timeout'
      s.timeoutAt = new Date().toISOString()
    })
    actionSnapshotStore.appendEvent(actionId, { type: 'action_timeout' })
  },
  cancel(actionId: string) {
    actionSnapshotStore.update(actionId, (s) => {
      if (s.status === 'completed' || s.status === 'error' || s.status === 'timeout' || s.status === 'cancelled') return
      s.status = 'cancelled'
      s.cancelledAt = new Date().toISOString()
    })
    actionSnapshotStore.appendEvent(actionId, { type: 'action_cancelled' })
  }
}

export function redactInput(raw: any): Record<string, any> | undefined {
  if (!raw) return undefined
  try {
    const clone = JSON.parse(JSON.stringify(raw))
    const secretish = ['token', 'authorization', 'password', 'secret', 'apiKey']
    const walk = (obj: any) => {
      if (!obj || typeof obj !== 'object') return
      for (const k of Object.keys(obj)) {
        const v = obj[k]
        if (typeof v === 'object') walk(v)
        if (secretish.some(s => k.toLowerCase().includes(s))) {
          obj[k] = '[REDACTED]'
        }
      }
    }
    walk(clone)
    return clone
  } catch {
    return undefined
  }
}

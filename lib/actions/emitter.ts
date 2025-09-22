import { actionSnapshotStore } from './snapshot-store'
import { logger } from '@/lib/utils/logger'
import { emitPipelineEventExternal } from '@/lib/tools/delegation'

/**
 * Lightweight on-demand emitter. For now we call this explicitly after lifecycle
 * changes where we want a normalized event. Later we could wrap store.update.
 */
export function emitActionSnapshot(actionId: string) {
  const snap = actionSnapshotStore.get(actionId)
  if (!snap) return
  try {
    emitPipelineEventExternal({
      type: 'action_snapshot',
      actionId: snap.id,
      status: snap.status,
      kind: snap.kind,
      progress: snap.progress,
      meta: snap.meta,
      lastEvent: snap.events.slice(-1)[0],
      confirmations: snap.confirmations.map(c => ({ id: c.id, state: c.state, requestedAt: c.requestedAt, resolvedAt: c.resolvedAt })),
      updatedAt: snap.updatedAt
    })
  } catch (e) {
    logger.warn('Failed to emit action snapshot', { actionId, error: (e as any)?.message })
  }
}

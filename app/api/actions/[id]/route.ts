import { NextRequest } from 'next/server'
import { actionSnapshotStore, redactInput } from '@/lib/actions/snapshot-store'

// Placeholder expiration window (none yet). Later we can add TTL logic.

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const snap = actionSnapshotStore.get(id)
  if (!snap) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }
  // Redact sensitive input again defensively
  const safe = { ...snap, input: redactInput(snap.input) }
  return new Response(JSON.stringify({ action: safe }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}

import { NextRequest } from 'next/server'
import { actionSnapshotStore, redactInput } from '@/lib/actions/snapshot-store'

// Placeholder expiration window (none yet). Later we can add TTL logic.

export async function GET(req: NextRequest) {
  // Derive the dynamic [id] segment manually to avoid type incompatibility with Next.js route context in canary version
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  const id = segments[segments.length - 1]
  const snap = actionSnapshotStore.get(id)
  if (!snap) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }
  // Redact sensitive input again defensively
  const safe = { ...snap, input: redactInput(snap.input) }
  return new Response(JSON.stringify({ action: safe }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}

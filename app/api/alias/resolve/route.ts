import { NextResponse } from 'next/server'
import { resolveAgentCanonicalKey } from '@/lib/agents/alias-resolver'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const canonical = await resolveAgentCanonicalKey(q)
  return NextResponse.json({ input: q, canonical })
}

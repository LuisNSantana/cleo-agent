import { NextResponse } from 'next/server'
import { getPendingConfirmations, resolveConfirmation } from '@/lib/confirmation/simple-blocking'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Auth client unavailable' }, { status: 500 })
  const { data } = await supabase.auth.getUser()
  if (!data?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ pending: getPendingConfirmations() })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch confirmations' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Auth client unavailable' }, { status: 500 })
  const { data } = await supabase.auth.getUser()
  if (!data?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { id, approved } = body || {}
    if (!id || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const result = await resolveConfirmation(id, approved)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to resolve confirmation' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { addSerpapiKey, listSerpapiKeys, deleteSerpapiKey, testSerpapiKey } from '@/lib/serpapi/credentials'

async function getCurrentUserId() {
  const supabase = await createClient(); if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser(); return user?.id || null
}

const AddSchema = z.object({ api_key: z.string().min(20), label: z.string().min(1).max(60).default('primary') })

export async function GET() {
  try {
    const userId = await getCurrentUserId(); if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const r = await listSerpapiKeys(userId)
    if (!r.success) return NextResponse.json({ error: r.error }, { status: 500 })
    return NextResponse.json({ success: true, keys: r.data })
  } catch (e) {
    console.error('SerpAPI GET credentials error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(); if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json(); const parsed = AddSchema.parse(body)
    // Validate key before storing
    const test = await testSerpapiKey(parsed.api_key)
    if (!test.success) return NextResponse.json({ error: `Key test failed: ${test.error}` }, { status: 400 })
    const r = await addSerpapiKey(userId, { api_key: parsed.api_key, label: parsed.label, is_active: true })
    if (!r.success) return NextResponse.json({ error: r.error }, { status: 400 })
    return NextResponse.json({ success: true, id: r.data?.id, message: 'Key stored & active' }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Validation error', details: e.errors }, { status: 400 })
    console.error('SerpAPI POST credentials error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(); if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const url = new URL(req.url); const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const r = await deleteSerpapiKey(userId, id)
    if (!r.success) return NextResponse.json({ error: r.error }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('SerpAPI DELETE credentials error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

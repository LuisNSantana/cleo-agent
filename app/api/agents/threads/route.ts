import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/agents/threads?agentKey=emma-shopify&limit=20&offset=0
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase client unavailable' }, { status: 500 })
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const userId = authData.user.id

    const { searchParams } = new URL(request.url)
    const agentKey = searchParams.get('agentKey') || undefined
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
    const offset = Number(searchParams.get('offset') || 0)

    let query = (supabase as any)
      .from('agent_threads')
      .select('id, agent_key, agent_name, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (agentKey) {
      query = query.eq('agent_key', agentKey)
    }

    const { data, error } = await query
    if (error) {
      console.error('[threads:list] error:', error)
      return NextResponse.json({ success: false, error: 'Failed to list threads' }, { status: 500 })
    }

    return NextResponse.json({ success: true, threads: data || [] })
  } catch (error) {
    console.error('Error listing threads:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/agents/threads
// Body: { agentKey: string, agentName?: string, title?: string }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase client unavailable' }, { status: 500 })
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const userId = authData.user.id

    const body = await request.json().catch(() => ({}))
    const { agentKey, agentName, title } = body || {}
    if (!agentKey) {
      return NextResponse.json({ success: false, error: 'agentKey is required' }, { status: 400 })
    }

    const { data, error } = await (supabase as any)
      .from('agent_threads')
      .insert({ user_id: userId, agent_key: agentKey, agent_name: agentName || agentKey, title: title || 'Conversation' })
      .select('id, agent_key, agent_name, title, created_at, updated_at')
      .single()

    if (error) {
      console.error('[threads:create] error:', error)
      return NextResponse.json({ success: false, error: 'Failed to create thread' }, { status: 500 })
    }

    return NextResponse.json({ success: true, thread: data })
  } catch (error) {
    console.error('Error creating thread:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

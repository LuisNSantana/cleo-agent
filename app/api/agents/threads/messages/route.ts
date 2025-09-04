import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/agents/threads/messages
// Body: { threadId: string, role: 'assistant'|'user'|'system'|'tool', content: string, toolCalls?: any, toolResults?: any, metadata?: any }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { threadId, role, content, toolCalls, toolResults, metadata } = body || {}

    if (!threadId || !role) {
      return NextResponse.json({ success: false, error: 'threadId and role are required' }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase client unavailable' }, { status: 500 })
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const userId = authData.user.id

    // Verify thread ownership with RLS-safe select
    const { data: thread, error: threadErr } = await (supabase as any)
      .from('agent_threads')
      .select('id, user_id')
      .eq('id', threadId)
      .eq('user_id', userId)
      .single()

    if (threadErr || !thread) {
      return NextResponse.json({ success: false, error: 'Thread not found or not accessible' }, { status: 404 })
    }

    const insertPayload = {
      thread_id: threadId,
      user_id: userId,
      role,
      content: content ?? '',
      tool_calls: toolCalls ?? null,
      tool_results: toolResults ?? null,
      metadata: metadata ?? null
    }

    const { data: inserted, error: insertErr } = await (supabase as any)
      .from('agent_messages')
      .insert(insertPayload)
      .select('id, thread_id, role, content, tool_calls, tool_results, metadata, created_at')
      .single()

    if (insertErr) {
      console.error('[threads/messages] insert error:', insertErr)
      return NextResponse.json({ success: false, error: 'Failed to insert message' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: inserted })
  } catch (error) {
    console.error('Error appending thread message:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

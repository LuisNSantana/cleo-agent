import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/agents/threads/:id/messages?limit=50&before=ISO
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase client unavailable' }, { status: 500 })
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const userId = authData.user.id

    // RLS will enforce ownership on both thread and messages
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200)
    const before = searchParams.get('before')

    let q = (supabase as any)
      .from('agent_messages')
      .select('id, role, content, tool_calls, tool_results, metadata, created_at')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (before) {
      q = q.lt('created_at', before)
    }

    const { data, error } = await q
    if (error) {
      console.error('[threads:messages] error:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ success: true, messages: data || [] })
  } catch (error) {
    console.error('Error fetching thread messages:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/agents/threads/:id/messages
// Clears all messages in a thread for the current user, preserving the thread row
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase client unavailable' }, { status: 500 })
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !authData?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const userId = authData.user.id

    // Verify thread ownership
    const { data: thread, error: threadErr } = await (supabase as any)
      .from('agent_threads')
      .select('id, user_id')
      .eq('id', threadId)
      .eq('user_id', userId)
      .single()

    if (threadErr || !thread) {
      return NextResponse.json({ success: false, error: 'Thread not found or not accessible' }, { status: 404 })
    }

    // Delete messages for this thread and user
    const { error: delErr } = await (supabase as any)
      .from('agent_messages')
      .delete()
      .eq('thread_id', threadId)
      .eq('user_id', userId)

    if (delErr) {
      console.error('[threads:messages] delete error:', delErr)
      return NextResponse.json({ success: false, error: 'Failed to clear messages' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing thread messages:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

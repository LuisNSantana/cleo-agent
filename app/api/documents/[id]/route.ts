import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { indexDocument } from '@/lib/rag/index-document'

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase disabled' }, { status: 200 })
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await (supabase as any).from('documents')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', auth.user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase disabled' }, { status: 200 })
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const update: Record<string, any> = {}
    ;['title','filename','content_md','content_html','chat_id','project_id','tokens_estimated'].forEach(k => {
      if (k in body) update[k] = body[k]
    })
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

    const { data, error } = await (supabase as any).from('documents')
      .update(update)
      .eq('id', params.id)
      .eq('user_id', auth.user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Force reindex if content changed
    let ingestion: any = null
    const contentChanged = 'content_md' in update || 'content_html' in update
    if (contentChanged) {
      try {
        ingestion = await indexDocument(params.id, { force: true })
      } catch (e: any) {
        console.error('[PATCH] Reindex failed', e)
        ingestion = { error: e.message }
      }
    }

    return NextResponse.json({ ...data, _ingestion: ingestion })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase disabled' }, { status: 200 })
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await (supabase as any).from('documents').delete().eq('id', params.id).eq('user_id', auth.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { indexDocument } from '@/lib/rag/index-document'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase disabled' }, { status: 200 })
    
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = auth.user.id

    const body = await request.json()
    const { documentId } = body

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 })
    }

    // Get document content first
    const { data: doc, error: docError } = await (supabase as any)
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 404 })
    }

    console.log('[REINDEX] Document content_md length:', doc.content_md?.length)
    console.log('[REINDEX] Document content preview:', doc.content_md?.slice(0, 100))

    // Delete existing chunks
    await (supabase as any)
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)
      .eq('user_id', userId)

    // Force re-index
    const result = await indexDocument(documentId, { force: true })

    // Get new chunks to verify
    const { data: newChunks } = await (supabase as any)
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .order('chunk_index')

    return NextResponse.json({
      message: 'Document re-indexed successfully',
      originalContent: {
        length: doc.content_md?.length,
        preview: doc.content_md?.slice(0, 200)
      },
      indexResult: result,
      newChunks: newChunks?.map((c: any) => ({
        id: c.id.slice(0, 8),
        chunk_index: c.chunk_index,
        contentLength: c.content?.length || 0,
        contentPreview: c.content?.slice(0, 200),
        tokens: c.content_tokens
      }))
    })
  } catch (e: any) {
    console.error('[REINDEX] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

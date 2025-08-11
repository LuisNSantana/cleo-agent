import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { retrieveRelevant } from '@/lib/rag/retrieve'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase disabled' }, { status: 200 })
    
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = auth.user.id

    // Get all user documents
    const { data: docs, error: docsError } = await (supabase as any)
      .from('documents')
      .select('id, title, filename, content_md, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (docsError) throw new Error(docsError.message)

    // Get all user chunks
    const { data: chunks, error: chunksError } = await (supabase as any)
      .from('document_chunks')
      .select('id, document_id, chunk_index, content, content_tokens, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (chunksError) throw new Error(chunksError.message)

    // Test retrieval with different queries
    const testQueries = [
      'comida favorita',
      'perfil usuario nombre',
      'intereses gustos hobbies',
      'información personal'
    ]

    const retrievalTests = await Promise.all(
      testQueries.map(async (query) => {
        try {
          const results = await retrieveRelevant({ 
            userId, 
            query, 
            topK: 3, 
            minSimilarity: 0.05 
          })
          return {
            query,
            results: results.map(r => ({
              similarity: r.similarity,
              content: r.content.slice(0, 200) + '...',
              chunk_index: r.chunk_index,
              document_id: r.document_id.slice(0, 8)
            }))
          }
        } catch (e: any) {
          return { query, error: e.message }
        }
      })
    )

    return NextResponse.json({
      userId,
      stats: {
        totalDocs: docs?.length || 0,
        totalChunks: chunks?.length || 0
      },
      documents: docs?.map((d: any) => ({
        id: d.id.slice(0, 8),
        title: d.title,
        filename: d.filename,
        contentLength: d.content_md?.length || 0,
        contentPreview: d.content_md?.slice(0, 300) + '...',
        created_at: d.created_at,
        updated_at: d.updated_at
      })),
      chunks: chunks?.map((c: any) => ({
        id: c.id.slice(0, 8),
        document_id: c.document_id.slice(0, 8),
        chunk_index: c.chunk_index,
        contentLength: c.content?.length || 0,
        contentPreview: c.content?.slice(0, 200) + '...',
        tokens: c.content_tokens,
        metadata: c.metadata
      })),
      retrievalTests
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

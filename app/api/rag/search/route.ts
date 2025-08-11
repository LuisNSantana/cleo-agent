import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { defaultEmbeddingProvider } from '@/lib/rag/embeddings'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, documentId, projectId, topK = 8, minScore = 0 } = body
    if (!query) return NextResponse.json({ error: 'query requerida' }, { status: 400 })
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase disabled' }, { status: 503 })
  const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = auth.user.id

    // Compute embedding for query text using default provider
    const embedding = (await defaultEmbeddingProvider.embed([query]))[0]
    if (!embedding) return NextResponse.json({ error: 'Fallo al generar embedding' }, { status: 500 })

    const { data, error } = await (supabase as any).rpc('match_document_chunks', {
      p_user_id: userId,
      p_query_embedding: embedding,
      p_match_count: topK,
      p_document_id: documentId || null,
      p_project_id: projectId || null,
      p_min_similarity: minScore,
    })
    if (error) throw new Error(error.message)
    return NextResponse.json({ matches: data, provider: defaultEmbeddingProvider.modelId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { defaultEmbeddingProvider } from './embeddings'
import { chunkMarkdown } from './chunking'
import { createClient } from '@/lib/supabase/server'

interface IndexOptions {
  force?: boolean
  embeddingModel?: string
}

export async function indexDocument(documentId: string, opts: IndexOptions = {}) {
  const supabase = await createClient()
  if (!supabase) throw new Error('Supabase disabled')
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user?.id) throw new Error('Unauthorized')
  const userId = auth.user.id

  // Create ingestion job
  const { data: job } = await (supabase as any).from('ingestion_jobs').insert({ document_id: documentId, user_id: userId, status: 'processing' }).select().single()

  try {
    // Fetch document
    const { data: doc, error: docErr } = await (supabase as any).from('documents').select('*').eq('id', documentId).eq('user_id', userId).single()
    if (docErr) throw new Error(docErr.message)

    const content: string = doc.content_md || ''
    if (!content.trim()) throw new Error('Documento sin contenido')

    // Optional force: delete existing chunks
    if (opts.force) {
      await (supabase as any).from('document_chunks').delete().eq('document_id', documentId).eq('user_id', userId)
    }

    // Chunk
    const chunks = chunkMarkdown(content)

    // Embed in batches
    const batchSize = 64
    const embeddings: number[][] = []
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const vectors = await defaultEmbeddingProvider.embed(batch.map(c => c.text))
      embeddings.push(...vectors)
    }

    // Prepare rows
    const rows = chunks.map((c, i) => ({
      document_id: documentId,
      user_id: userId,
      chunk_index: c.index,
      content: c.text,
      content_tokens: c.tokenEstimate,
      embedding: embeddings[i],
      metadata: {
        paragraphs: c.metadata.paragraphs,
        embedding_model: defaultEmbeddingProvider.modelId,
        embedding_dim: defaultEmbeddingProvider.dimension,
        source: 'markdown',
      },
    }))

    if (rows.length) {
      const { error: insErr } = await (supabase as any).from('document_chunks').insert(rows)
      if (insErr) throw new Error(insErr.message)
    }

    await (supabase as any).from('ingestion_jobs').update({ status: 'success' }).eq('id', job.id)
    return { jobId: job.id, chunks: rows.length }
  } catch (e: any) {
    await (supabase as any).from('ingestion_jobs').update({ status: 'error', error_message: e.message }).eq('id', job?.id)
    throw e
  }
}

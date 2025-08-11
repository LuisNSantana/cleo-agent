import { createClient } from '@/lib/supabase/server'
import { defaultEmbeddingProvider } from './embeddings'
import { defaultReranker } from './reranking'
import { getRetrievalStrategy } from './llama-scout-config'

export interface RetrieveOptions {
  userId: string
  query: string
  documentId?: string
  projectId?: string
  topK?: number
  minSimilarity?: number
  useHybrid?: boolean
  useReranking?: boolean
  vectorWeight?: number
  textWeight?: number
}

export interface RetrievedChunk {
  document_id: string
  chunk_id: string
  content: string
  chunk_index: number
  similarity: number
  metadata: any
  vector_similarity?: number
  text_rank?: number
  hybrid_score?: number
  rerank_score?: number
}

export async function retrieveRelevant(opts: RetrieveOptions): Promise<RetrievedChunk[]> {
  const { 
    userId, 
    query, 
    documentId, 
    projectId, 
    minSimilarity = 0,
    useHybrid = true,
    useReranking = true,
    vectorWeight = 0.7,
    textWeight = 0.3
  } = opts
  
  if (!query.trim()) return []
  
  // Usar estrategia adaptativa para Llama4 Scout
  const strategy = getRetrievalStrategy(query)
  const dynamicTopK = opts.topK || strategy.topK
  const chunkLimit = strategy.chunkLimit
  
    console.log(`🔍 RAG Strategy: topK=${dynamicTopK}, limit=${chunkLimit}, aggressive=${strategy.useAggressive}`)
    const queryTokens = Math.ceil(query.length / 4)
    console.log(`📊 Context Usage: query ≈${queryTokens} tokens, chunkLimit=${chunkLimit}, contextWindow=${strategy.chunkLimit * 2000 + queryTokens} tokens (aprox)`)
  
  const supabase = await createClient()
  if (!supabase) return []
  
  const embedding = (await defaultEmbeddingProvider.embed([query]))[0]
  if (!embedding) return []

  let results: RetrievedChunk[] = []

  if (useHybrid) {
    // Use hybrid search (vector + full-text)
    const { data, error } = await (supabase as any).rpc('hybrid_search_document_chunks', {
      p_user_id: userId,
      p_query_embedding: embedding,
      p_query_text: query,
      p_match_count: useReranking ? dynamicTopK * 2 : dynamicTopK, // Get more for reranking
      p_document_id: documentId || null,
      p_project_id: projectId || null,
      p_min_similarity: minSimilarity,
      p_vector_weight: vectorWeight,
      p_text_weight: textWeight,
    })

    if (error) {
      console.error('hybrid_search_document_chunks error', error)
      // Fallback to vector-only search
      return retrieveVectorOnly(opts)
    }

    results = (data || []).map((item: any) => ({
      document_id: item.document_id,
      chunk_id: item.chunk_id,
      content: item.content,
      chunk_index: item.chunk_index,
      similarity: item.hybrid_score, // Use hybrid score as main similarity
      vector_similarity: item.vector_similarity,
      text_rank: item.text_rank,
      hybrid_score: item.hybrid_score,
      metadata: item.metadata
    }))

      const totalChunkTokens = results.reduce((sum, c) => sum + (c.metadata?.tokenEstimate || 0), 0)
      console.log(`[HYBRID] Retrieved ${results.length} chunks, total tokens (estimate): ${totalChunkTokens}`)
      if (results.length > 0) {
        console.log(`[HYBRID] Top hybrid score: ${results[0]?.hybrid_score?.toFixed(3)}`)
      }
  } else {
    // Fallback to vector-only search
    results = await retrieveVectorOnly(opts)
  }

  // Apply cross-encoder reranking if enabled
  if (useReranking && results.length > 1) {
    try {
      const documents = results.map(chunk => chunk.content)
      const rerankResults = await defaultReranker.rerank(query, documents, { 
        topK: dynamicTopK, 
        minScore: 0.1 
      })
      
      // Map reranked results back to chunks
      const rerankedChunks = rerankResults.map(rr => {
        const originalChunk = results[rr.index]
        return {
          ...originalChunk,
          similarity: rr.score, // Override with rerank score
          rerank_score: rr.score
        }
      })

      console.log(`[RERANK] Reranked ${results.length} → ${rerankedChunks.length} chunks (top score: ${rerankedChunks[0]?.rerank_score?.toFixed(3)})`)
      return rerankedChunks
    } catch (error: any) {
      console.error('[RERANK] Reranking failed, using hybrid results:', error.message)
    }
  }

  return results.slice(0, Math.min(dynamicTopK, chunkLimit))
}

// Fallback function for vector-only search
async function retrieveVectorOnly(opts: RetrieveOptions): Promise<RetrievedChunk[]> {
  const { userId, query, documentId, projectId, topK = 15, minSimilarity = 0 } = opts // Ajustado para 1M context
  const supabase = await createClient()
  if (!supabase) return []
  
  const embedding = (await defaultEmbeddingProvider.embed([query]))[0]
  if (!embedding) return []
  
  const { data, error } = await (supabase as any).rpc('match_document_chunks', {
    p_user_id: userId,
    p_query_embedding: embedding,
    p_match_count: topK,
    p_document_id: documentId || null,
    p_project_id: projectId || null,
    p_min_similarity: minSimilarity,
  })
  
  if (error) {
    console.error('match_document_chunks error', error)
    if (error.code === 'PGRST202') {
      console.warn('[RAG] RPC missing. Ensure you ran supabase_schema_rag.sql in your project. Returning empty context.')
      return []
    }
    return []
  }
  
  return (data || []).map((item: any) => ({
    document_id: item.document_id,
    chunk_id: item.chunk_id,
    content: item.content,
    chunk_index: item.chunk_index,
    similarity: item.similarity,
    metadata: item.metadata
  }))
}

export function buildContextBlock(chunks: RetrievedChunk[], maxChars = 8000) {
  if (!chunks.length) return ''
  const lines: string[] = []
  lines.push('--- Retrieved Context (most relevant first) ---')
  for (const c of chunks) {
    let header = `[doc:${(c.document_id||'').toString().slice(0,8)} idx:${c.chunk_index}]`
    
    // Add scoring info for debugging
    if (c.rerank_score !== undefined) {
      header += ` rerank:${c.rerank_score.toFixed(3)}`
    } else if (c.hybrid_score !== undefined) {
      header += ` hybrid:${c.hybrid_score.toFixed(3)}`
    } else {
      header += ` sim:${(c.similarity??0).toFixed(3)}`
    }
    
    lines.push(header)
    lines.push(c.content?.trim() || '')
    lines.push('---')
    if (lines.join('\n').length > maxChars) break
  }
  return lines.join('\n')
}

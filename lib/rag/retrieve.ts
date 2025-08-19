import { createClient } from '@/lib/supabase/server'
import { defaultEmbeddingProvider } from './embeddings'
import { defaultReranker } from './reranking'

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
  // Optional prompt budgeting inputs
  maxContextChars?: number // approximate max characters to allocate for context
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
  
  // Adaptive sizing: derive topK and chunkLimit from query size and budget
  const approxQueryTokens = Math.ceil(query.length / 4)
  const budgetChars = opts.maxContextChars ?? 6000
  // Heuristic: average chunk ~ 450 chars; leave some headroom for formatting
  const estPerChunk = 450
  const allowedByBudget = Math.max(3, Math.floor(budgetChars / estPerChunk))
  // Base topK scale with shorter queries getting a bit more breadth
  const baseTopK = approxQueryTokens < 150 ? 12 : approxQueryTokens < 600 ? 10 : 8
  const dynamicTopK = Math.min(opts.topK || baseTopK, allowedByBudget)
  const chunkLimit = Math.min(allowedByBudget, dynamicTopK)
  
  // DEBUG: Log the search query being used
  console.log('[RAG] DEBUG - Search query:', JSON.stringify(query.slice(0, 200)))
  console.log('[RAG] DEBUG - Adaptive sizing:', { approxQueryTokens, budgetChars, dynamicTopK, chunkLimit })
  
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

      // Keep only essential hybrid search logging
      if (results.length > 0) {
        console.log(`[HYBRID] Retrieved ${results.length} chunks, top score: ${results[0]?.hybrid_score?.toFixed(3)}`)
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

export function buildContextBlock(chunks: RetrievedChunk[], maxChars = 6000) {
  if (!chunks.length) return ''
  const lines: string[] = []
  lines.push('=== USER CONTEXT (relevant information found) ===')
  lines.push('')
  for (const c of chunks) {
    // User-friendly header in English
    let header = `📄 Document (relevance: ${(c.rerank_score || c.hybrid_score || c.similarity || 0).toFixed(2)})`
    
    lines.push(header)
    lines.push(c.content?.trim() || '')
    lines.push('')
    lines.push('---')
    lines.push('')
    if (lines.join('\n').length > maxChars) break
  }
  lines.push('=== END OF CONTEXT ===')
  return lines.join('\n')
}

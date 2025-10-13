import { createClient } from '@/lib/supabase/server'
import { defaultEmbeddingProvider } from './embeddings'
import { defaultReranker } from './reranking'
import { detectLanguage, type SupportedLanguage } from '@/lib/language-detection'
import { translateQuery } from './translate'
import { getRuntimeConfig } from '@/lib/agents/runtime-config'
import { createHash } from 'crypto'
import { redisEnabled, hashKey as redisHashKey, redisGetJSON, redisSetJSON } from '@/lib/cache/redis-client'

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
  // Deadline and caching
  timeoutMs?: number // hard deadline for the entire retrieval (including reranking)
  cacheTtlMs?: number // optional cache TTL override
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
  const normalizedUserId = typeof userId === 'string' ? userId.trim() : ''
  if (!normalizedUserId) {
    console.warn('[RAG] retrieveRelevant called without a valid userId. Skipping search to avoid RPC errors.')
    return []
  }

  const start = Date.now()
  const deadline = typeof opts.timeoutMs === 'number' && opts.timeoutMs > 0
    ? start + opts.timeoutMs
    : Number.POSITIVE_INFINITY
  const timeLeft = () => Math.max(0, deadline - Date.now())

  // Simple in-memory TTL cache shared per server runtime
  type CacheEntry = { data: RetrievedChunk[]; expiry: number }
  const globalAny = globalThis as any
  const CACHE_DEFAULT_TTL = typeof opts.cacheTtlMs === 'number' && opts.cacheTtlMs > 0 ? opts.cacheTtlMs : 2 * 60 * 1000 // 2 minutes
  const cache: Map<string, CacheEntry> = globalAny.__ragRetrievalCache || (globalAny.__ragRetrievalCache = new Map())
  const hash = (s: string) => createHash('sha256').update(s).digest('hex')
  const cacheKey = hash([
    `u:${normalizedUserId}`,
    `q:${query}`,
    documentId ? `d:${documentId}` : 'd:-',
    projectId ? `p:${projectId}` : 'p:-',
    `k:${opts.topK ?? 'auto'}`,
    `hy:${useHybrid}`,
    `rr:${useReranking}`,
    `min:${minSimilarity}`,
    `vw:${vectorWeight}`,
    `tw:${textWeight}`,
    `mc:${opts.maxContextChars ?? 'default'}`
  ].join('|'))
  // L1 check (in-memory)
  const cached = cache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    console.log(`[RAG] Cache hit for query (ttl left: ${Math.round((cached.expiry - Date.now())/1000)}s)`)
    return cached.data
  }

  // L2 check (Redis)
  let l2Key = ''
  if (redisEnabled()) {
    try {
      l2Key = `rag:v1:${redisHashKey([
        'u', normalizedUserId,
        'q', query,
        'd', documentId || '-',
        'p', projectId || '-',
        'k', opts.topK ?? 'auto',
        'hy', useHybrid,
        'rr', useReranking,
        'min', minSimilarity,
        'vw', vectorWeight,
        'tw', textWeight,
        'mc', opts.maxContextChars ?? 'default',
      ])}`
      const l2 = await redisGetJSON<RetrievedChunk[]>(l2Key)
      if (Array.isArray(l2) && l2.length > 0) {
        // Populate L1 for faster subsequent hits in this instance
        cache.set(cacheKey, { data: l2, expiry: Date.now() + CACHE_DEFAULT_TTL })
        console.log('[RAG] L2 (Redis) cache hit')
        return l2
      }
    } catch {}
  }
  
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
  const runtime = getRuntimeConfig()

  // Multilingual support: expand query if user/doc language likely differs
  const detected: SupportedLanguage = detectLanguage(query)
  const altTarget: SupportedLanguage = detected === 'es' ? 'en' : 'es'
  let translated = ''
  if (timeLeft() > 250) {
    try {
      translated = await translateQuery(query, altTarget)
    } catch (e) {
      console.warn('[RAG] translateQuery failed or skipped:', (e as any)?.message)
    }
  }
  const uniqueQueries = Array.from(new Set([query, translated].map(q => q.trim()).filter(Boolean)))
  if (timeLeft() <= 0) {
    console.warn('[RAG] Deadline reached before embedding. Skipping retrieval.')
    return []
  }
  const queryEmbeddings = await defaultEmbeddingProvider.embed(uniqueQueries)
  if (!queryEmbeddings?.length) return []

  let results: RetrievedChunk[] = []

  if (useHybrid) {
    // Use hybrid search (vector + full-text)
    const perQueryMatch = useReranking ? dynamicTopK * 2 : dynamicTopK
    const hybridResults: RetrievedChunk[] = []
  for (let i = 0; i < uniqueQueries.length; i++) {
      if (timeLeft() <= 0) {
        console.warn('[RAG] Deadline reached during hybrid search loop; returning partial results.')
        break
      }
      const q = uniqueQueries[i]
      const qEmbedding = queryEmbeddings[i]
      const callBudget = Math.max(150, timeLeft() - 100) // leave a tiny buffer
      if (callBudget <= 0) break
      const rpcPromise = (supabase as any).rpc('hybrid_search_document_chunks', {
        p_user_id: normalizedUserId,
        p_query_embedding: qEmbedding,
        p_query_text: q,
        p_match_count: perQueryMatch,
        p_document_id: documentId || null,
        p_project_id: projectId || null,
        p_min_similarity: minSimilarity,
        p_vector_weight: vectorWeight,
        p_text_weight: textWeight,
      })
      const res = await withTimeout(rpcPromise as Promise<{ data: any; error: any }>, callBudget)
      if (!res) {
        console.warn('[RAG] hybrid_search timeout; skipping this query piece')
        continue
      }
      const { data, error } = res
      if (error) {
        console.error('hybrid_search_document_chunks error', error)
        continue
      }

      const mapped = (data || []).map((item: any) => ({
        document_id: item.document_id,
        chunk_id: item.chunk_id,
        content: item.content,
        chunk_index: item.chunk_index,
        similarity: item.hybrid_score,
        vector_similarity: item.vector_similarity,
        text_rank: item.text_rank,
        hybrid_score: item.hybrid_score,
        metadata: item.metadata
      }))
      hybridResults.push(...mapped)
    }

    // Merge & dedupe by chunk_id, keep highest similarity
  const dedupMap = new Map<string, RetrievedChunk>()
    for (const r of hybridResults) {
      const prev = dedupMap.get(r.chunk_id)
      if (!prev || (r.similarity > prev.similarity)) dedupMap.set(r.chunk_id, r)
    }
  // Apply minimum hybrid score filter
  results = Array.from(dedupMap.values()).filter(r => (r.hybrid_score ?? r.similarity ?? 0) >= runtime.ragMinHybridScore)

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
      if (timeLeft() < 400) {
        console.log('[RERANK] Skipped due to low remaining budget.')
  const sliced = results.slice(0, Math.min(dynamicTopK, chunkLimit))
  cache.set(cacheKey, { data: sliced, expiry: Date.now() + CACHE_DEFAULT_TTL })
  if (l2Key) { try { await redisSetJSON(l2Key, sliced, Math.ceil(CACHE_DEFAULT_TTL/1000)) } catch {} }
        return sliced
      }
      const documents = results.map(chunk => chunk.content)
      // Use the original query for reranking to keep intent, but this already contains multilingual candidates
      const rerankResults = await withTimeout(
        defaultReranker.rerank(query, documents, { topK: dynamicTopK, minScore: runtime.ragMinRerankScore }),
        timeLeft() - 50
      )
      if (!rerankResults) {
        console.log('[RERANK] Timeout; returning hybrid results without reranking.')
  const sliced = results.slice(0, Math.min(dynamicTopK, chunkLimit))
  cache.set(cacheKey, { data: sliced, expiry: Date.now() + CACHE_DEFAULT_TTL })
  if (l2Key) { try { await redisSetJSON(l2Key, sliced, Math.ceil(CACHE_DEFAULT_TTL/1000)) } catch {} }
        return sliced
      }
      
      // Map reranked results back to chunks
      const rerankedChunks = rerankResults
        .filter(rr => rr.score >= runtime.ragMinRerankScore)
        .map(rr => {
        const originalChunk = results[rr.index]
        return {
          ...originalChunk,
          similarity: rr.score, // Override with rerank score
          rerank_score: rr.score
        }
      })

      console.log(`[RERANK] Reranked ${results.length} → ${rerankedChunks.length} chunks (top score: ${rerankedChunks[0]?.rerank_score?.toFixed(3)})`)
  const sliced = rerankedChunks.slice(0, Math.min(dynamicTopK, chunkLimit))
  cache.set(cacheKey, { data: sliced, expiry: Date.now() + CACHE_DEFAULT_TTL })
  if (l2Key) { try { await redisSetJSON(l2Key, sliced, Math.ceil(CACHE_DEFAULT_TTL/1000)) } catch {} }
      return sliced
    } catch (error: any) {
      console.error('[RERANK] Reranking failed, using hybrid results:', error.message)
    }
  }
  const sliced = results.slice(0, Math.min(dynamicTopK, chunkLimit))
  cache.set(cacheKey, { data: sliced, expiry: Date.now() + CACHE_DEFAULT_TTL })
  if (l2Key) { try { await redisSetJSON(l2Key, sliced, Math.ceil(CACHE_DEFAULT_TTL/1000)) } catch {} }
  return sliced
}

// Fallback function for vector-only search
async function retrieveVectorOnly(opts: RetrieveOptions): Promise<RetrievedChunk[]> {
  const { userId, query, documentId, projectId, topK = 15, minSimilarity = 0 } = opts // Ajustado para 1M context
  const normalizedUserId = typeof userId === 'string' ? userId.trim() : ''
  if (!normalizedUserId) {
    console.warn('[RAG] retrieveVectorOnly called without a valid userId. Returning empty results.')
    return []
  }
  const supabase = await createClient()
  if (!supabase) return []
  
  const embedding = (await defaultEmbeddingProvider.embed([query]))[0]
  if (!embedding) return []
  
  const vectorRpc = (supabase as any).rpc('match_document_chunks', {
    p_user_id: normalizedUserId,
    p_query_embedding: embedding,
    p_match_count: topK,
    p_document_id: documentId || null,
    p_project_id: projectId || null,
    p_min_similarity: minSimilarity,
  }) as Promise<{ data: any; error: any }>
  const vectorRes = await withTimeout(vectorRpc, Math.max(150, (opts.timeoutMs ?? 5000) - 100))
  if (!vectorRes) {
    console.warn('[RAG] match_document_chunks timeout; returning empty results')
    return []
  }
  const { data, error } = vectorRes
  
  if (error) {
    if ((error as any).message === 'timeout') {
      console.warn('[RAG] match_document_chunks timeout; returning empty results')
      return []
    }
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
    const header = `📄 Document (relevance: ${(c.rerank_score || c.hybrid_score || c.similarity || 0).toFixed(2)})`
    
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

// Utility: race a promise against a timeout; returns null on timeout
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  if (!isFinite(ms) || ms <= 0) return promise.then(v => v).catch(e => { throw e })
  return new Promise<T | null>((resolve, reject) => {
    const t = setTimeout(() => resolve(null), ms)
    promise
      .then((v) => { clearTimeout(t); resolve(v) })
      .catch((e) => { clearTimeout(t); reject(e) })
  })
}

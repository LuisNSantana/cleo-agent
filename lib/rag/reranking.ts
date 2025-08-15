/**
 * Semantic reranking using OpenAI embeddings and cosine similarity
 * Consistent with existing embedding pipeline, no external dependencies
 */
// Removed unused OpenAI provider import to avoid build-time env checks

export interface RerankResult {
  index: number
  score: number
  text: string
}

export interface RerankOptions {
  model?: string
  topK?: number
  minScore?: number
}

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'

export class EmbeddingReranker {
  private model: string

  constructor(model: string = DEFAULT_EMBEDDING_MODEL) {
    this.model = model
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }

  private async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI embeddings error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data.map((item: any) => item.embedding)
    } catch (error) {
      console.error('[RERANK] Failed to get embeddings:', error)
      throw error
    }
  }

  async rerank(
    query: string, 
    documents: string[], 
    options: RerankOptions = {}
  ): Promise<RerankResult[]> {
    const { topK = 5, minScore = 0.0 } = options
    
    console.log(`[RERANK] Starting rerank: query="${query.slice(0, 60)}...", docs=${documents.length}, topK=${topK}`)
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[RERANK] No OpenAI API key found, using fallback scoring')
      return documents.slice(0, topK).map((text, index) => ({
        index,
        score: 1.0 - (index * 0.1), // Fallback scoring
        text
      }))
    }

    if (!documents.length || !query.trim()) {
      console.log('[RERANK] Empty query or documents, returning empty results')
      return []
    }

    try {
      const startTime = Date.now()
      
      // Get embeddings for query and all documents
      const allTexts = [query, ...documents]
      console.log(`[RERANK] Generating embeddings for ${allTexts.length} texts`)
      
      const embeddings = await this.getEmbeddings(allTexts)
      const embeddingTime = Date.now() - startTime
      
      const queryEmbedding = embeddings[0]
      const docEmbeddings = embeddings.slice(1)

      // Calculate cosine similarity scores
      const scoringStart = Date.now()
      const results: RerankResult[] = docEmbeddings
        .map((docEmb, index) => ({
          index,
          score: this.cosineSimilarity(queryEmbedding, docEmb),
          text: documents[index]
        }))
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)

      const totalTime = Date.now() - startTime
      const scoringTime = Date.now() - scoringStart
      
      console.log(`[RERANK] ✅ Complete: ${documents.length} → ${results.length} docs`)
      console.log(`[RERANK] ⏱️  Timing: ${embeddingTime}ms embeddings, ${scoringTime}ms scoring, ${totalTime}ms total`)
      console.log(`[RERANK] 🎯 Scores: ${results.map(r => r.score.toFixed(3)).join(', ')}`)
      
      return results

    } catch (error: any) {
      console.error('[RERANK] ❌ Embedding reranking failed:', error.message)
      console.error('[RERANK] Stack:', error.stack)
      
      // Fallback to original order with decreasing scores
      console.log('[RERANK] 🔄 Using fallback scoring')
      return documents.slice(0, topK).map((text, index) => ({
        index,
        score: 1.0 - (index * 0.1),
        text
      }))
    }
  }

  // Batch reranking for large document sets
  async rerankBatch(
    query: string,
    documents: string[],
    batchSize: number = 20,
    options: RerankOptions = {}
  ): Promise<RerankResult[]> {
    console.log(`[RERANK:BATCH] Starting batch rerank: ${documents.length} docs, batchSize=${batchSize}`)
    
    if (documents.length <= batchSize) {
      console.log(`[RERANK:BATCH] Single batch: delegating to regular rerank`)
      return this.rerank(query, documents, options)
    }

    const batches: string[][] = []
    for (let i = 0; i < documents.length; i += batchSize) {
      batches.push(documents.slice(i, i + batchSize))
    }

    console.log(`[RERANK:BATCH] Processing ${batches.length} batches...`)
    const batchStartTime = Date.now()
    
    const batchResults = await Promise.all(
      batches.map((batch, idx) => {
        console.log(`[RERANK:BATCH] Processing batch ${idx + 1}/${batches.length} (${batch.length} docs)`)
        return this.rerank(query, batch, { ...options, topK: batch.length })
      })
    )

    // Combine and re-sort all batch results
    const allResults = batchResults.flat()
    const finalResults = allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, options.topK || 5)
      
    const batchTime = Date.now() - batchStartTime
    console.log(`[RERANK:BATCH] ✅ Complete: ${documents.length} docs → ${finalResults.length} results in ${batchTime}ms`)
    console.log(`[RERANK:BATCH] 🎯 Final scores: ${finalResults.map(r => r.score.toFixed(3)).join(', ')}`)
    
    return finalResults
  }
}

export const defaultReranker = new EmbeddingReranker()

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { retrieveRelevant } from '@/lib/rag/retrieve'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase disabled' }, { status: 200 })
    
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = auth.user.id

    const body = await request.json()
    const { query, testModes = ['vector', 'hybrid', 'reranked'] } = body

    if (!query) {
      return NextResponse.json({ error: 'query required' }, { status: 400 })
    }

    const results: any = {}

    // Test 1: Vector-only (baseline)
    if (testModes.includes('vector')) {
      const start = Date.now()
      const vectorResults = await retrieveRelevant({
        userId,
        query,
        topK: 6,
        useHybrid: false,
        useReranking: false
      })
      results.vector = {
        duration: Date.now() - start,
        count: vectorResults.length,
        topScore: vectorResults[0]?.similarity || 0,
        avgScore: vectorResults.length ? vectorResults.reduce((sum, r) => sum + (r.similarity || 0), 0) / vectorResults.length : 0,
        chunks: vectorResults.map(r => ({
          score: r.similarity,
          preview: r.content.slice(0, 100) + '...',
          document_id: r.document_id.slice(0, 8)
        }))
      }
    }

    // Test 2: Hybrid search (no reranking)
    if (testModes.includes('hybrid')) {
      const start = Date.now()
      const hybridResults = await retrieveRelevant({
        userId,
        query,
        topK: 6,
        useHybrid: true,
        useReranking: false
      })
      results.hybrid = {
        duration: Date.now() - start,
        count: hybridResults.length,
        topScore: hybridResults[0]?.hybrid_score || hybridResults[0]?.similarity || 0,
        avgScore: hybridResults.length ? hybridResults.reduce((sum, r) => sum + (r.hybrid_score || r.similarity || 0), 0) / hybridResults.length : 0,
        chunks: hybridResults.map(r => ({
          score: r.hybrid_score || r.similarity,
          vector_sim: r.vector_similarity,
          text_rank: r.text_rank,
          preview: r.content.slice(0, 100) + '...',
          document_id: r.document_id.slice(0, 8)
        }))
      }
    }

    // Test 3: Full pipeline (hybrid + reranking)
    if (testModes.includes('reranked')) {
      const start = Date.now()
      const rerankedResults = await retrieveRelevant({
        userId,
        query,
        topK: 6,
        useHybrid: true,
        useReranking: true
      })
      results.reranked = {
        duration: Date.now() - start,
        count: rerankedResults.length,
        topScore: rerankedResults[0]?.rerank_score || rerankedResults[0]?.similarity || 0,
        avgScore: rerankedResults.length ? rerankedResults.reduce((sum, r) => sum + (r.rerank_score || r.similarity || 0), 0) / rerankedResults.length : 0,
        chunks: rerankedResults.map(r => ({
          score: r.rerank_score || r.similarity,
          hybrid_score: r.hybrid_score,
          vector_sim: r.vector_similarity,
          text_rank: r.text_rank,
          preview: r.content.slice(0, 100) + '...',
          document_id: r.document_id.slice(0, 8)
        }))
      }
    }

    // Comparison analysis
    const analysis = {
      query,
      userId: userId.slice(0, 8),
      timestamp: new Date().toISOString(),
      improvements: {
        hybrid_vs_vector: results.hybrid && results.vector ? {
          score_improvement: ((results.hybrid.topScore - results.vector.topScore) / results.vector.topScore * 100).toFixed(1) + '%',
          speed_change: results.hybrid.duration - results.vector.duration + 'ms'
        } : null,
        reranked_vs_hybrid: results.reranked && results.hybrid ? {
          score_improvement: ((results.reranked.topScore - results.hybrid.topScore) / results.hybrid.topScore * 100).toFixed(1) + '%',
          speed_change: results.reranked.duration - results.hybrid.duration + 'ms'
        } : null,
        overall_improvement: results.reranked && results.vector ? {
          score_improvement: ((results.reranked.topScore - results.vector.topScore) / results.vector.topScore * 100).toFixed(1) + '%',
          total_time: results.reranked.duration + 'ms'
        } : null
      }
    }

    return NextResponse.json({
      results,
      analysis,
      recommendation: analysis.improvements.overall_improvement ? 
        `Hybrid + Reranking improved relevance by ${analysis.improvements.overall_improvement.score_improvement}` :
        'Enable hybrid search and reranking for better results'
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

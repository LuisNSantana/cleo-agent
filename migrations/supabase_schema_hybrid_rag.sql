-- Add full-text search capabilities to document_chunks for hybrid retrieval
-- Run this in your Supabase SQL Editor

-- Add GIN index for full-text search on content
CREATE INDEX IF NOT EXISTS document_chunks_content_gin_idx 
ON public.document_chunks 
USING gin(to_tsvector('english', content));

-- Add function for hybrid search (vector + full-text)
CREATE OR REPLACE FUNCTION public.hybrid_search_document_chunks(
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_query_text text,
  p_match_count int,
  p_document_id uuid default null,
  p_project_id uuid default null,
  p_min_similarity float default 0,
  p_vector_weight float default 0.7,
  p_text_weight float default 0.3
) returns table(
  document_id uuid,
  chunk_id uuid,
  content text,
  chunk_index int,
  vector_similarity float4,
  text_rank float4,
  hybrid_score float4,
  metadata jsonb
) as $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT 
      dc.document_id,
      dc.id as chunk_id,
      dc.content,
      dc.chunk_index,
      (1 - (dc.embedding <=> p_query_embedding))::float4 as vector_similarity,
      0::float4 as text_rank,
      dc.metadata
    FROM public.document_chunks dc
    WHERE dc.user_id = p_user_id
      AND dc.embedding IS NOT NULL
      AND (p_document_id IS NULL OR dc.document_id = p_document_id)
      AND (p_project_id IS NULL OR (dc.metadata->>'project_id')::uuid = p_project_id)
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT p_match_count * 2
  ),
  text_search AS (
    SELECT 
      dc.document_id,
      dc.id as chunk_id,
      dc.content,
      dc.chunk_index,
      0::float4 as vector_similarity,
      ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', p_query_text))::float4 as text_rank,
      dc.metadata
    FROM public.document_chunks dc
    WHERE dc.user_id = p_user_id
      AND dc.content IS NOT NULL
      AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', p_query_text)
      AND (p_document_id IS NULL OR dc.document_id = p_document_id)
      AND (p_project_id IS NULL OR (dc.metadata->>'project_id')::uuid = p_project_id)
    ORDER BY ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', p_query_text)) DESC
    LIMIT p_match_count * 2
  ),
  combined AS (
    SELECT DISTINCT ON (chunk_id)
      COALESCE(v.document_id, t.document_id) as document_id,
      COALESCE(v.chunk_id, t.chunk_id) as chunk_id,
      COALESCE(v.content, t.content) as content,
      COALESCE(v.chunk_index, t.chunk_index) as chunk_index,
      COALESCE(v.vector_similarity, 0) as vector_similarity,
      COALESCE(t.text_rank, 0) as text_rank,
      COALESCE(v.metadata, t.metadata) as metadata
    FROM vector_search v
    FULL OUTER JOIN text_search t ON v.chunk_id = t.chunk_id
  )
  SELECT 
    c.document_id,
    c.chunk_id,
    c.content,
    c.chunk_index,
    c.vector_similarity,
    c.text_rank,
    (p_vector_weight * c.vector_similarity + p_text_weight * c.text_rank)::float4 as hybrid_score,
    c.metadata
  FROM combined c
  WHERE (p_vector_weight * c.vector_similarity + p_text_weight * c.text_rank) >= p_min_similarity
  ORDER BY hybrid_score DESC
  LIMIT p_match_count;
END;
$$ language plpgsql stable;

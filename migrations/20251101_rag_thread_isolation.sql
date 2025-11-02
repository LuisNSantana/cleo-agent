-- Migration: Add thread isolation to RAG system
-- Date: 2025-11-01
-- Purpose: Prevent cross-thread context contamination by isolating document chunks per conversation thread
-- Critical Fix: Addresses delegation accuracy issues caused by RAG retrieving chunks from all user threads

-- ============================================================================
-- PART 1: Schema Changes
-- ============================================================================

-- Add thread_id column to document_chunks table
ALTER TABLE public.document_chunks
ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.agent_threads(id) ON DELETE CASCADE;

-- Add index for efficient thread-based queries
CREATE INDEX IF NOT EXISTS document_chunks_thread_id_idx 
ON public.document_chunks(thread_id);

-- Add composite index for common query pattern (user_id + thread_id)
CREATE INDEX IF NOT EXISTS document_chunks_user_thread_idx 
ON public.document_chunks(user_id, thread_id);

-- Add comment for documentation
COMMENT ON COLUMN public.document_chunks.thread_id IS 
'Thread ID for conversation isolation. NULL means global/shared chunk (backward compatible).';

-- ============================================================================
-- PART 2: Update Vector Search Function (match_document_chunks)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.match_document_chunks(
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_match_count int,
  p_document_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_thread_id uuid DEFAULT NULL,  -- ✅ NEW: Thread isolation parameter
  p_min_similarity float DEFAULT 0
) RETURNS TABLE(
  document_id uuid,
  chunk_id uuid,
  content text,
  chunk_index int,
  similarity float4,
  metadata jsonb
) AS $$
  SELECT dc.document_id,
         dc.id as chunk_id,
         dc.content,
         dc.chunk_index,
         (1 - (dc.embedding <=> p_query_embedding))::float4 as similarity,
         dc.metadata
  FROM public.document_chunks dc
  WHERE dc.user_id = p_user_id
    AND dc.embedding IS NOT NULL
    AND (p_document_id IS NULL OR dc.document_id = p_document_id)
    AND (p_project_id IS NULL OR (dc.metadata->>'project_id')::uuid = p_project_id)
    AND (p_thread_id IS NULL OR dc.thread_id = p_thread_id OR dc.thread_id IS NULL)  -- ✅ NEW: Thread filter (NULL = global)
  ORDER BY dc.embedding <=> p_query_embedding
  LIMIT p_match_count
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION public.match_document_chunks IS 
'Vector similarity search with thread isolation. Pass p_thread_id to filter chunks by conversation thread. NULL thread_id matches global chunks.';

-- ============================================================================
-- PART 3: Update Hybrid Search Function (hybrid_search_document_chunks)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.hybrid_search_document_chunks(
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_query_text text,
  p_match_count int,
  p_document_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_thread_id uuid DEFAULT NULL,  -- ✅ NEW: Thread isolation parameter
  p_min_similarity float DEFAULT 0,
  p_vector_weight float DEFAULT 0.7,
  p_text_weight float DEFAULT 0.3
) RETURNS TABLE(
  document_id uuid,
  chunk_id uuid,
  content text,
  chunk_index int,
  vector_similarity float4,
  text_rank float4,
  hybrid_score float4,
  metadata jsonb
) AS $$
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
      AND (p_thread_id IS NULL OR dc.thread_id = p_thread_id OR dc.thread_id IS NULL)  -- ✅ NEW: Thread filter
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
      AND (p_thread_id IS NULL OR dc.thread_id = p_thread_id OR dc.thread_id IS NULL)  -- ✅ NEW: Thread filter
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
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.hybrid_search_document_chunks IS 
'Hybrid search (vector + full-text) with thread isolation. Pass p_thread_id to filter chunks by conversation thread. NULL thread_id matches global chunks.';

-- ============================================================================
-- PART 4: Backward Compatibility & Data Migration
-- ============================================================================

-- Existing chunks without thread_id will have NULL (treated as global/shared)
-- This ensures backward compatibility - old chunks remain accessible across threads
-- New chunks created with thread_id will be isolated to their conversation

-- Optional: Backfill thread_id for existing chunks based on document metadata
-- (Uncomment if you want to migrate existing data)
-- UPDATE public.document_chunks dc
-- SET thread_id = (
--   SELECT (d.metadata->>'thread_id')::uuid
--   FROM public.documents d
--   WHERE d.id = dc.document_id
--   AND d.metadata->>'thread_id' IS NOT NULL
-- )
-- WHERE dc.thread_id IS NULL
-- AND EXISTS (
--   SELECT 1 FROM public.documents d
--   WHERE d.id = dc.document_id
--   AND d.metadata->>'thread_id' IS NOT NULL
-- );

-- ============================================================================
-- PART 5: RLS Policy Update (Optional)
-- ============================================================================

-- Update RLS policies to respect thread isolation if needed
-- (Current policies filter by user_id which is sufficient for security)
-- Thread isolation is an application-level optimization, not a security boundary

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test 1: Verify column was added
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name = 'document_chunks' 
-- AND column_name = 'thread_id';

-- Test 2: Verify indexes exist
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'document_chunks' 
-- AND indexname LIKE '%thread%';

-- Test 3: Test thread-isolated query
-- SELECT public.match_document_chunks(
--   p_user_id := 'YOUR_USER_ID'::uuid,
--   p_query_embedding := '[0.1, 0.2, ...]'::vector(1536),
--   p_match_count := 5,
--   p_thread_id := 'YOUR_THREAD_ID'::uuid
-- );

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration:
-- DROP INDEX IF EXISTS public.document_chunks_thread_id_idx;
-- DROP INDEX IF EXISTS public.document_chunks_user_thread_idx;
-- ALTER TABLE public.document_chunks DROP COLUMN IF EXISTS thread_id;
-- 
-- Then restore original function signatures by removing p_thread_id parameter
-- and the thread filter WHERE clauses


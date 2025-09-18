-- Expression indexes to accelerate project-scoped RAG filtering
-- Safe to run multiple times (IF NOT EXISTS where possible)

-- Index on project_id stored in JSONB metadata
create index if not exists document_chunks_project_id_expr_idx
on public.document_chunks (((metadata->>'project_id')::uuid));

-- Optional: index on chat_id for chat-scoped retrieval/debug
create index if not exists document_chunks_chat_id_expr_idx
on public.document_chunks (((metadata->>'chat_id')::uuid));

-- Note: ensure you have run supabase_schema_rag.sql and supabase_schema_add_documents.sql beforehand.

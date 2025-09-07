-- RAG extension & tables (reproducible schema fragment)
-- Ensure pgvector extension
create extension if not exists vector;

-- Table: document_chunks (if not exists)
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  content_tokens int,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists document_chunks_document_id_idx on public.document_chunks(document_id);
create index if not exists document_chunks_user_id_idx on public.document_chunks(user_id);
-- Vector index for cosine distance (adjust lists per data size)
create index if not exists document_chunks_embedding_cos_idx on public.document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Table: ingestion_jobs
create table if not exists public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending', -- pending|processing|success|error
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists ingestion_jobs_document_id_idx on public.ingestion_jobs(document_id);
create index if not exists ingestion_jobs_user_id_idx on public.ingestion_jobs(user_id);

create or replace function public.ingestion_jobs_updated_at_trigger() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

create trigger trg_ingestion_jobs_updated_at
  before update on public.ingestion_jobs
  for each row execute procedure public.ingestion_jobs_updated_at_trigger();

-- RLS
alter table public.document_chunks enable row level security;
alter table public.ingestion_jobs enable row level security;

-- Policies (idempotent pattern)
DO $$ BEGIN
  create policy document_chunks_select_own on public.document_chunks for select using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy document_chunks_insert_own on public.document_chunks for insert with check (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy ingestion_jobs_select_own on public.ingestion_jobs for select using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy ingestion_jobs_insert_own on public.ingestion_jobs for insert with check (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy ingestion_jobs_update_own on public.ingestion_jobs for update using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Similarity search RPC function
create or replace function public.match_document_chunks(
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_match_count int,
  p_document_id uuid default null,
  p_project_id uuid default null,
  p_min_similarity float default 0
) returns table(
  document_id uuid,
  chunk_id uuid,
  content text,
  chunk_index int,
  similarity float4,
  metadata jsonb
) as $$
  select dc.document_id,
         dc.id as chunk_id,
         dc.content,
         dc.chunk_index,
         (1 - (dc.embedding <=> p_query_embedding))::float4 as similarity,
         dc.metadata
  from public.document_chunks dc
  where dc.user_id = p_user_id
    and dc.embedding is not null
    and (p_document_id is null or dc.document_id = p_document_id)
    and (p_project_id is null or (dc.metadata->>'project_id')::uuid = p_project_id)
  order by dc.embedding <=> p_query_embedding
  limit p_match_count
$$ language sql stable;

-- Optional: revoke execution to public, re-grant to authenticated if desired

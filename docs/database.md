# Database Guide (Supabase + Postgres + pgvector)

This guide explains the database structure, recent changes (RLS, functions, extensions), and how to configure Supabase to run the project securely.

## Quick summary
- Engine: Postgres (Supabase)
- Schemas: `public` (primary) and `auth` (managed by Supabase)
- Extensions: `pgcrypto`, `uuid-ossp`, `vector` (pgvector) — installed in `public`
- Security: RLS enabled on all user tables. Access restricted using `auth.uid()` (per-user multitenancy).
- RAG: `vector` columns and hybrid + exact search functions.
- Analytics: metrics tables per model, tool, session, and conversation.

---

## Schemas and extensions

- Schema `public`: the main application data model.
- Schema `auth`: managed by Supabase (`auth.users`).

Required extensions:
- `pgcrypto` (for `gen_random_uuid()`)
- `uuid-ossp` (for `uuid_generate_v4()`)
- `vector` (pgvector) — installed and used in schema `public`.

Important note about pgvector:
- The `vector` type and its operators (`<->`, `<=>`) are expected in schema `public`.
- Our RAG functions use `search_path = 'public'`. If you move `vector` to another schema, update functions and types to avoid errors like: `operator does not exist: extensions.vector <=> extensions.vector`.

---

## Main tables (public)

Below is a functional map of the most relevant tables. All have RLS enabled and are linked to the user via `user_id` and/or relationships.

### Conversations and messages
- `chats`
  - Fields: `id (uuid)`, `user_id (uuid)`, `project_id (uuid?)`, `title`, `model`, `system_prompt`, `public (bool)`, aggregated metrics (e.g., `message_count`, `last_message_at`, `total_tokens`, `engagement_score`).
  - FKs: `user_id -> users.id`, `project_id -> projects.id`.
- `messages`
  - Fields: `id (serial)`, `chat_id (uuid)`, `user_id (uuid)`, `content`, `role` (check: `system|user|assistant|data`), `parts (jsonb)`, metrics (`response_time_ms`, `input_tokens`, `output_tokens`), `tools_invoked (text[])`, `personality_snapshot (jsonb)`.
  - FKs: `chat_id -> chats.id`, `user_id -> users.id`.
- `chat_attachments`
  - Files associated with a chat. Cross-checked to validate the attachment belongs to chats of the same `user_id`.

### Documents and RAG
- `documents`
  - Source document (uploaded, generated, or external). Has `user_id`, optional `chat_id` and `project_id`, and content (`content_md`, `content_html`).
  - FKs: `user_id -> users.id`, `chat_id -> chats.id`, `project_id -> projects.id`.
- `document_chunks`
  - Tokenized chunks for RAG.
  - Key fields: `content`, `content_tokens`, `embedding vector`, `metadata jsonb`, `chunk_index`, `chunk_version` (v1/v2).
  - FKs: `document_id -> documents.id`, `user_id -> users.id`.
- `ingestion_jobs`
  - Ingestion/indexing tasks with `status`, `error_message`, and timestamps.

### Analytics (usage and performance)
- `model_usage_analytics`
  - Per-day, per-model metrics: `message_count`, `total_input_tokens`, `total_output_tokens`, `total_cost_estimate`, `average_response_time_ms`, `successful_requests`, `failed_requests`, etc.
- `tool_usage_analytics`
  - Tool invocation metrics (`tool_name`, counts, timings, errors, popular parameters).
- `feature_usage_analytics`
  - App feature usage by day (`feature_name`, `usage_count`, `success_rate`, `total_time_spent_minutes`).
- `user_session_analytics`
  - Per-session metrics: timings, messages sent/received, models used, tools, canvas interactions, files, RAG queries, etc.
- `conversation_analytics`
  - Aggregated per-chat: `total_messages`, `user_messages`, `assistant_messages`, `conversation_duration_minutes`, `models_switched`, `personality_changes`, `tools_used`, `avg_response_length`, `complexity_score`, `satisfaction_rating`.

### Users, projects, and settings
- `users` (profile and aggregated metrics; FK to `auth.users`)
- `projects` (groups chats and documents per project)
- `user_preferences` (theme, language, personality settings, etc.)
- `user_keys` (encrypted API keys by provider; composite PK `user_id, provider`)
- `user_service_connections` (OAuth tokens/connections to Google, Notion, etc.)
- `feedback` (user feedback)

---

## Key relationships (summary)
- `users.id` ↔ `auth.users.id`
- `chats.user_id` → `users.id`
- `messages.chat_id` → `chats.id` and `messages.user_id` → `users.id`
- `documents.user_id` → `users.id`; optional `chat_id` and `project_id`
- `document_chunks.document_id` → `documents.id` and `document_chunks.user_id` → `users.id`
- `ingestion_jobs.document_id` → `documents.id`; `ingestion_jobs.user_id` → `users.id`
- All analytics tables reference `users.id` (and some reference `chats.id`).

---

## RLS (Row Level Security)

- RLS is enabled on all user data tables.
- General policy pattern: only the authenticated user (`auth.uid()`) can select/insert/update/delete their rows.
- Cross-table validation where relationships exist:
  - `chat_attachments`: only if the `chat_id` belongs to `auth.uid()`.
  - `conversation_analytics`: only if `user_id = auth.uid()` and `chat_id` belongs to that user.
- Special rules (if applicable):
  - `public` fields in `chats` do not break user isolation; they only affect sharing features where specific endpoints are applied.

If you add new tables, copy the pattern: `SELECT/INSERT/UPDATE/DELETE` policies with `user_id = auth.uid()` and validate relationships via FKs.

---

## RAG functions and search

Primary functions:
- `public.match_document_chunks(p_user_id uuid, p_query_embedding vector, p_match_count int, p_document_id uuid default null, p_project_id uuid default null, p_min_similarity double precision default 0)`
  - Returns the most similar chunks by vector distance.
  - Uses `(1 - (dc.embedding <=> p_query_embedding))` as similarity.
  - `search_path = 'public'` (pgvector in `public`).
- `public.hybrid_search_document_chunks(p_user_id uuid, p_query_embedding vector, p_query_text text, p_match_count int, p_document_id uuid default null, p_project_id uuid default null, p_min_similarity double precision default 0, p_vector_weight double precision default 0.7, p_text_weight double precision default 0.3)`
  - Combines vector similarity and text ranking (`ts_rank`), returns `hybrid_score`.
  - `search_path = 'public'`.

pgvector requirements:
- `vector` type available in `public`.
- `<->` and `<=>` operators accessible with `search_path = 'public'`.
- Column `document_chunks.embedding` is of type `vector`.

Suggestion: keep a fixed embedding dimension (e.g., 1536) to avoid mixing sizes.

---

## Recent changes (security and stability)

- RLS reinforced across all tables (authenticated and owner-only access).
- Cross-validation in `chat_attachments` and `conversation_analytics` to prevent cross-user leaks.
- pgvector ensured in `public` for seamless operators and types.
- Explicit `search_path` to `public` in RAG functions.
- Analytics functions recommended with explicit `search_path` to `public` (if your project shows `search_path=""`, update them for better stability and security).

---

## How to set up the DB from scratch (Supabase)

1) Create a Supabase project and note:
- Project URL and keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Service key (server): `SUPABASE_SERVICE_ROLE_KEY` (for backend administrative tasks).

2) Enable extensions in the SQL Editor (or CLI):
```sql
create extension if not exists pgcrypto with schema public;
create extension if not exists "uuid-ossp" with schema public;
create extension if not exists vector with schema public;
```

3) Apply the SQL schemas from this repo (in this recommended order):
- `supabase_schema.sql` (base)
- `supabase_schema_rag.sql` (RAG and documents)
- `supabase_schema_hybrid_rag.sql` (hybrid search)
- `supabase_schema_analytics.sql` (analytics tables and functions)
- `supabase_schema_add_documents.sql` (if applicable to your setup)

If an object already exists, you may ignore the error or adapt the script to your current state.

4) Review RLS in Supabase Studio → Auth → Policies (or via SQL):
- All tables above must have `FOR SELECT/INSERT/UPDATE/DELETE` policies using `auth.uid()` and validating FKs.

5) Recommended Auth settings:
- Email OTP provider: `expiry` ≤ 60 min (recommended: 30 min).
- Enable domains/redirects according to `.env` and your deployment.

6) App environment variables:
- Web client: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Server: `SUPABASE_SERVICE_ROLE_KEY` (do not expose to the client).

---

## Best practices and troubleshooting

- Vector operators: if you see `operator does not exist: ... vector <=> ... vector`:
  - Ensure that the `vector` extension is in `public` and functions use `search_path = 'public'`.
- RLS: when data “disappears,” it’s often a policy blocking views; verify `auth.uid()` and relationships.
- Embedding dimension: don’t mix sizes; if you change provider, re-index.
- Migrations: apply this repo’s `.sql` to keep schema and code aligned.

---

## Appendix: Included tables (summary)

- Conversation: `chats`, `messages`, `chat_attachments`
- RAG: `documents`, `document_chunks`, `ingestion_jobs`
- Analytics: `model_usage_analytics`, `tool_usage_analytics`, `feature_usage_analytics`, `user_session_analytics`, `conversation_analytics`
- User/config: `users`, `user_preferences`, `user_keys`, `user_service_connections`, `projects`, `feedback`

All with RLS ON and FKs to `users` (and where applicable, to `chats`/`documents`/`projects`).

---

Missing something in your instance? Open an issue with your schema diff or share the SQL Editor error and we’ll add it to this guide.

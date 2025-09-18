-- Backfill project_id and chat_id into existing document_chunks.metadata
-- This joins through documents to set JSONB keys only when missing.

-- Ensure the JSONB metadata exists
update public.document_chunks dc
set metadata = coalesce(dc.metadata, '{}'::jsonb);

-- Backfill project_id
update public.document_chunks dc
set metadata = jsonb_set(dc.metadata, '{project_id}', to_jsonb(d.project_id), true)
from public.documents d
where dc.document_id = d.id
  and d.project_id is not null
  and (dc.metadata->>'project_id') is null;

-- Backfill chat_id (optional)
update public.document_chunks dc
set metadata = jsonb_set(dc.metadata, '{chat_id}', to_jsonb(d.chat_id), true)
from public.documents d
where dc.document_id = d.id
  and d.chat_id is not null
  and (dc.metadata->>'chat_id') is null;

-- Documents table for canvas editor markdown sources
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  chat_id uuid null references public.chats(id) on delete set null,
  project_id uuid null references public.projects(id) on delete set null,
  title text null,
  filename text not null,
  content_md text not null default '',
  content_html text null,
  tokens_estimated integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_chat_id_idx on public.documents(chat_id);
create index if not exists documents_project_id_idx on public.documents(project_id);

create or replace function public.documents_updated_at_trigger()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute procedure public.documents_updated_at_trigger();

-- RLS policies (adjust as needed)
alter table public.documents enable row level security;

do $$ begin
  create policy "documents_select_own" on public.documents for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "documents_insert_own" on public.documents for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "documents_update_own" on public.documents for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "documents_delete_own" on public.documents for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

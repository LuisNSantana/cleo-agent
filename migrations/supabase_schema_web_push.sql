-- Web Push subscriptions storage
create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.web_push_subscriptions enable row level security;

create policy "Users can manage their subscriptions"
  on public.web_push_subscriptions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_web_push_user_id on public.web_push_subscriptions(user_id);
create index if not exists idx_web_push_endpoint on public.web_push_subscriptions(endpoint);

create or replace function public.touch_web_push_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_web_push_updated_at
  before update on public.web_push_subscriptions
  for each row execute function public.touch_web_push_updated_at();

comment on table public.web_push_subscriptions is 'Stores browser Web Push subscriptions per user';
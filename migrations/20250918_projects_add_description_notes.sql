-- Add description and notes to projects (nullable text)
alter table public.projects
  add column if not exists description text,
  add column if not exists notes text;

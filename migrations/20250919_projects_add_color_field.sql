-- Add color field to projects table for customizable folder colors
alter table public.projects
  add column if not exists color text default '#6b7280'; -- Default to neutral gray

-- Add comment for documentation
comment on column public.projects.color is 'Hex color code for the project folder icon (e.g., #6b7280)';
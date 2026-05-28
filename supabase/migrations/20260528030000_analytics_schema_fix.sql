-- Analytics schema fix: ensure approved_at and created_at exist and disambiguate task relation

ALTER TABLE public.project_sections
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.collaboration_tasks
  DROP CONSTRAINT IF EXISTS collaboration_tasks_assigned_to_fkey;

ALTER TABLE public.collaboration_tasks
  ADD CONSTRAINT collaboration_tasks_assigned_to_fkey
    FOREIGN KEY (assigned_to)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

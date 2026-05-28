-- Rescue migration: align collaboration schema and explicit Supabase relations

ALTER TABLE public.project_collaborators
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.project_collaborators
  DROP CONSTRAINT IF EXISTS project_collaborators_user_id_fkey;
ALTER TABLE public.project_collaborators
  ADD CONSTRAINT project_collaborators_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.project_collaborators
  DROP CONSTRAINT IF EXISTS project_collaborators_invited_by_fkey;
ALTER TABLE public.project_collaborators
  ADD CONSTRAINT project_collaborators_invited_by_fkey
  FOREIGN KEY (invited_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

ALTER TABLE public.collaboration_tasks
  DROP CONSTRAINT IF EXISTS collaboration_tasks_assigned_to_fkey;
ALTER TABLE public.collaboration_tasks
  ADD CONSTRAINT collaboration_tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

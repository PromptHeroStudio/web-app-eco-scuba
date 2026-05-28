-- System total recovery migration for ECO SCUBA
-- Aligns collaboration schema and project JSON state columns.

ALTER TABLE public.project_collaborators
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS apa_collected_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS apa_state JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.collaboration_tasks
DROP CONSTRAINT IF EXISTS collaboration_tasks_assigned_to_fkey;

ALTER TABLE public.collaboration_tasks
ADD CONSTRAINT collaboration_tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

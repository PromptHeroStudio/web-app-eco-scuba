-- ECO SCUBA — v20260527 Rescue Schema Migration
-- Adds missing columns and ensures collaboration_tasks FKs are explicit and present.

DO $$
BEGIN
  -- Ensure invited_at exists on project_collaborators
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_collaborators' AND column_name = 'invited_at'
  ) THEN
    ALTER TABLE public.project_collaborators ADD COLUMN invited_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Ensure total_budget_km exists on projects
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'total_budget_km'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN total_budget_km NUMERIC(12,2) DEFAULT 0 CHECK (total_budget_km >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'apa_collected_data'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN apa_collected_data JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Ensure assigned_to / assigned_by columns exist on collaboration_tasks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collaboration_tasks' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE public.collaboration_tasks ADD COLUMN assigned_to UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collaboration_tasks' AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE public.collaboration_tasks ADD COLUMN assigned_by UUID;
  END IF;

  -- Drop ambiguous FK constraints if present and recreate with clear names
  ALTER TABLE public.collaboration_tasks DROP CONSTRAINT IF EXISTS collaboration_tasks_assigned_to_fkey;
  ALTER TABLE public.collaboration_tasks DROP CONSTRAINT IF EXISTS collaboration_tasks_assigned_by_fkey;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'collaboration_tasks' AND kcu.column_name = 'assigned_to'
  ) THEN
    ALTER TABLE public.collaboration_tasks
      ADD CONSTRAINT collaboration_tasks_assigned_to_fkey
      FOREIGN KEY (assigned_to)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'collaboration_tasks' AND kcu.column_name = 'assigned_by'
  ) THEN
    ALTER TABLE public.collaboration_tasks
      ADD CONSTRAINT collaboration_tasks_assigned_by_fkey
      FOREIGN KEY (assigned_by)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;

END $$;

-- Ensure the project_collaborators invited_at index for sorting queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'project_collaborators' AND indexname = 'idx_project_collaborators_invited_at'
  ) THEN
    CREATE INDEX idx_project_collaborators_invited_at ON public.project_collaborators (invited_at DESC NULLS LAST);
  END IF;
END $$;

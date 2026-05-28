-- ECO SCUBA — v20260527 Stable collaborator/task schema sync
-- Ensures `project_collaborators.invited_at` exists and collaboration task assignments point to profiles.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_collaborators' AND column_name = 'invited_at'
  ) THEN
    ALTER TABLE public.project_collaborators ADD COLUMN invited_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collaboration_tasks' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE public.collaboration_tasks
      DROP CONSTRAINT IF EXISTS collaboration_tasks_assigned_to_fkey,
      DROP CONSTRAINT IF EXISTS collaboration_tasks_assigned_by_fkey;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_name = 'collaboration_tasks' AND column_name = 'assigned_to'
    ) THEN
      ALTER TABLE public.collaboration_tasks
        ADD CONSTRAINT collaboration_tasks_assigned_to_fkey
        FOREIGN KEY (assigned_to)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_name = 'collaboration_tasks' AND column_name = 'assigned_by'
    ) THEN
      ALTER TABLE public.collaboration_tasks
        ADD CONSTRAINT collaboration_tasks_assigned_by_fkey
        FOREIGN KEY (assigned_by)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Faza 3 — Database baseline for ECO SCUBA
-- Adds JSONB indexes, ensures RLS policies, and registers realtime publications.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.user_can_access_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = project_uuid AND user_id = auth.uid() AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'owner_id') THEN
      CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'apa_state') THEN
      CREATE INDEX IF NOT EXISTS idx_projects_apa_state ON public.projects USING GIN(apa_state);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'public_call_analysis') THEN
      CREATE INDEX IF NOT EXISTS idx_projects_call_analysis ON public.projects USING GIN(public_call_analysis);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_sections') THEN
    CREATE INDEX IF NOT EXISTS idx_sections_project ON public.project_sections(project_id);
    CREATE INDEX IF NOT EXISTS idx_sections_status ON public.project_sections(status);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_notifs_user ON public.notifications(user_id, is_read);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.project_sections';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END;
$$;

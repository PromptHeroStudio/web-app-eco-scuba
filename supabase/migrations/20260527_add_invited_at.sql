-- Migration: Add invited_at to project_collaborators

ALTER TABLE public.project_collaborators
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure invited_by exists and references profiles(id)
ALTER TABLE public.project_collaborators
  ADD COLUMN IF NOT EXISTS invited_by uuid;

ALTER TABLE public.project_collaborators DROP CONSTRAINT IF EXISTS project_collaborators_invited_by_fkey;
ALTER TABLE public.project_collaborators ADD CONSTRAINT project_collaborators_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

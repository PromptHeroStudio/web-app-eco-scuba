-- Migration: Security Hardening
-- Adds unique constraint for project collaborator assignments and ensures total_budget_km cannot be negative.

ALTER TABLE public.project_collaborators
ADD CONSTRAINT project_collaborators_project_user_unique UNIQUE (project_id, user_id);

ALTER TABLE public.projects
ADD CONSTRAINT projects_total_budget_nonnegative CHECK (total_budget_km >= 0);

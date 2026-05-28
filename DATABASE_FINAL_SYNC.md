# DATABASE_FINAL_SYNC

## Purpose
This document records the final forced database sync migration for `project_collaborators` and analytics schema support.

## Confirmed schema changes (migration created)
- `supabase/migrations/20260528040000_database_final_sync.sql`

## Columns and constraints ensured
- `public.profiles`
  - `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
  - `email TEXT NOT NULL`
  - `full_name TEXT`
  - `organization TEXT DEFAULT 'KVS S.C.U.B.A.'`
  - `avatar_url TEXT`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`

- `public.project_collaborators`
  - `invited_at TIMESTAMPTZ DEFAULT NOW()`
  - `invited_by UUID REFERENCES public.profiles(id)`
  - `project_collaborators_user_id_fkey` on `(user_id)` -> `profiles(id) ON DELETE CASCADE`
  - `project_collaborators_invited_by_fkey` on `(invited_by)` -> `profiles(id) ON DELETE SET NULL`

- `public.project_sections`
  - `approved_at TIMESTAMPTZ`

- `public.collaboration_tasks`
  - `collaboration_tasks_assigned_to_fkey` on `(assigned_to)` -> `profiles(id) ON DELETE CASCADE`

## Notes
- This repository cannot directly execute Supabase SQL in the remote project `fmqxjqoqtwslhkwddgla` from the workspace.
- The migration file is ready to be applied via the Supabase SQL Editor.

## Verification checklist
- [ ] Run `supabase.from('project_collaborators').select('invited_at')` in Supabase SQL Editor.
- [ ] Confirm `public.project_collaborators` includes `invited_at`.
- [ ] Confirm `public.project_sections` includes `approved_at`.
- [ ] Confirm `public.project_collaborators` foreign keys exist.
- [ ] Run `npx tsc --noEmit` locally (already clean in workspace).

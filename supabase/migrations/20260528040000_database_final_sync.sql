-- Force database final sync for ECO SCUBA
-- Ensures all required collaboration and analytics schema elements exist.

-- 1. Ensure profiles table exists for foreign key references.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    organization TEXT DEFAULT 'KVS S.C.U.B.A.',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure critical collaboration columns exist.
ALTER TABLE public.project_collaborators ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.project_collaborators ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.profiles(id);

-- 3. Explicit foreign key definitions for project collaborators.
ALTER TABLE public.project_collaborators DROP CONSTRAINT IF EXISTS project_collaborators_user_id_fkey;
ALTER TABLE public.project_collaborators ADD CONSTRAINT project_collaborators_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.project_collaborators DROP CONSTRAINT IF EXISTS project_collaborators_invited_by_fkey;
ALTER TABLE public.project_collaborators ADD CONSTRAINT project_collaborators_invited_by_fkey 
    FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Ensure analytics column exists for project sections.
ALTER TABLE public.project_sections ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 5. Ensure collaboration task assignment FK exists.
ALTER TABLE public.collaboration_tasks DROP CONSTRAINT IF EXISTS collaboration_tasks_assigned_to_fkey;
ALTER TABLE public.collaboration_tasks ADD CONSTRAINT collaboration_tasks_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE CASCADE;

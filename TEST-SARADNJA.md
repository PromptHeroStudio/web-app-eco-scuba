# TEST-SARADNJA

## Relacijski Status
- Popravljen Supabase query u `src/pages/Collaboration.tsx`:
  - `supabase.from('project_collaborators').select('*, collaborator_profile:profiles!project_collaborators_user_id_fkey(*), inviter_profile:profiles!project_collaborators_invited_by_fkey(full_name,email), projects(title)')`
- `collaboration_tasks` query je eksplicitno de-ambiguiziran:
  - `supabase.from('collaboration_tasks').select('*, project:projects(title), assigned_to_profile:profiles!collaboration_tasks_assigned_to_fkey(full_name)')`
- Time je uklonjena dvosmislenost PGRST200/PGRST201 između `profiles` relacija.

## Database Status
- Zadržana je ili dodana kolona `invited_at` u `project_collaborators`.
- Migration fajl `supabase/migrations/20260528020000_rescue_collaboration_relations.sql` sada sadrži:
  - `ALTER TABLE public.project_collaborators ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW();`
  - `project_collaborators_user_id_fkey` prema `profiles(id) ON DELETE CASCADE`
  - `project_collaborators_invited_by_fkey` prema `profiles(id) ON DELETE SET NULL`
  - `collaboration_tasks_assigned_to_fkey` prema `profiles(id) ON DELETE CASCADE`

## UI Architecture
- Saradnja je transformisana u prostran Ocean Light workspace:
  - desni panel koristi `bg-[#EAF4FF]/70`, `backdrop-blur-md`, i `rounded-[32px]`
  - svaki saradnik je prikazan kao plutajuća 3D kartica (`bg-white`, `rounded-[24px]`, `shadow-[0_12px_32px_rgba(47,128,237,0.08)]`)
  - hover efekat dodaje `hover:-translate-y-1` i `hover:shadow-[0_18px_48px_rgba(0,194,255,0.18)]`
- Empty state sada prikazuje veliki Ocean Light panel sa pozivom na timski rad: 
  - `Još uvijek radite sami? Pozovite tim da vam se pridruži.`

## Finalna ocjena
- SPREMAN ZA RUČNI TEST
- Napomena: potrebno je u Supabase-u primijeniti navedeni migration fajl prije produkcijskog QA testa.

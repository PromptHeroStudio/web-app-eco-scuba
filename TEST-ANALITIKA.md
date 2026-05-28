# TEST-ANALITIKA

## Status Query-ja
- Popravljen Supabase query u `src/pages/Analytics.tsx`:
  - `supabase.from('project_sections').select('approved_at, status')`
- Sve `project_sections` count upite sam zamijenio eksplicitnim selekcijama koristeći `id` umjesto `*`.
- Ovo uklanja ambiguities kod PostgREST/PGRST200 za `project_sections` i smanjuje rizik od nejasnih relacija.

## Database Status
- Kreiran je novi migration fajl:
  - `supabase/migrations/20260528030000_analytics_schema_fix.sql`
- SQL komande u migration fajlu:
  - `ALTER TABLE public.project_sections ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;`
  - `ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`
  - `ALTER TABLE public.collaboration_tasks DROP CONSTRAINT IF EXISTS collaboration_tasks_assigned_to_fkey;`
  - `ALTER TABLE public.collaboration_tasks ADD CONSTRAINT collaboration_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE CASCADE;`
- Time je baza za Analitiku dobila potrebne kolone i jasnu FK vezu.

## UI Screenshot Description
- Analitika sada prikazuje kartice s modernim "Ocean Light" stilom:
  - bijeli/stakleni paneli sa `shadow-[0_12px_32px_rgba(47,128,237,0.08)]`
  - zaobljene i svijetle ploče koje vizualno odgovaraju glavnom UI stilu
- Chart paneli koriste:
  - `Primary Blue` liniju: `#2F80ED`
  - `Accent Cyan` punjenje: `#00C2FF`
- Ako nema projekata, umjesto praznog prikaza pojavljuje se kartica:
  - `Još nema podataka za analizu. Kreirajte svoj prvi projekt.`

## E2E Scenario Summary
1. Korisnik ima 0 odobrenih sekcija
   - Analitika sada prikazuje ocean-light empty state karticu, umjesto praznog bijelog ekrana.
   - PieChart neće biti prikazan dok nema podataka u statusu projekta.

2. Postoji greška u mreži
   - U `fetchStats()` postoji `catch` blok koji loguje `Analytics fetch error:` i resetira state.
   - Aplikacija neće se zamrznuti; a `stats`, `projectStatusData`, `sectionPieData`, `approvalTrend`, `pendingTasks` i `nextSteps` se resetiraju na prazne vrijednosti.

## Finalna ocjena
- SPREMAN ZA RUČNI TEST
- Napomena: backend migration mora biti primijenjen u Supabase okruženju prije stvarnog QA testa.

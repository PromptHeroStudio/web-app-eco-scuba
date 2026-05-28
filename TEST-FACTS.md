# TEST FACTS

## Dashboard Činjenice
- Dashboard napredak više ne oslanja se na statične procente.
- Progres se sada računa direktno iz baze koristeći stvarne sekcije iz tabele `project_sections`.
- Ključna SQL logika:

```sql
SELECT
  project_id,
  COUNT(*) AS total_sections,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved_sections,
  ROUND((COUNT(*) FILTER (WHERE status = 'approved')::numeric / NULLIF(COUNT(*), 0)) * 100) AS progress_percent
FROM public.project_sections
WHERE project_id = '<project-id>'
GROUP BY project_id;
```

- U frontendu je realan progress izračunat kao:
  - `approved / total * 100`
  - `Math.round((counts.approved / Math.max(counts.total, 1)) * 100)`

## Collaboration Fix
- Pozivnica sada šalje minimalni payload u `project_collaborators`:
  - `project_id`
  - `user_id`
  - `role`
  - `status`
- Uklonjeni su polja koja mogu izazvati SQL greške iz neslaganja šeme:
  - `section_assignments`
  - `invited_by`
  - `invited_at`
- Error handling je poboljšan tako da se tačan Supabase payload/greška prikazuje kroz `toast.error`.

## Visual Evidence
- Kad se u Project Editoru odobri jedna sekcija, `project_sections.status` prelazi u `approved`.
- Dashboard računa novi napredak iz baze i progres bar/`progress` vrednost će porasti za najmanje 1-2% u odnosu na prethodni broj.
- Ako se vrednost ne pomeri nakon odobrenja sekcije, to znači da aplikacija i dalje koristi statične ili neosvežene podatke.

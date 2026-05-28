# SECURITY AUDIT LOG

## 2026-05-27

### Migracije
- `supabase/migrations/20260223000000_security_hardening.sql`
  - Dodan je `UNIQUE (project_id, user_id)` constraint na tabelu `project_collaborators`.
    - Time se sprečava kreiranje duplih pozivnica ili redundantnih saradnika za isti projekat.
  - Dodan je `CHECK (total_budget_km >= 0)` constraint na tabelu `projects`.
    - Time se osigurava integritet budžetskih podataka i sprečava negativne iznose.

### Promjene u kodu
- `src/pages/Settings.tsx`
  - Implementirana je verifikacija trenutne lozinke koristeći `supabase.auth.signInWithPassword` prije poziva `updateUser`.
  - Time se dodaje dodatni sloj sigurnosti za promjenu lozinke.
- `src/components/projects/NewProjectWizard/Step3APAData.tsx`
  - Dodan je karakter brojač i `maxLength={1500}` na `Textarea` komponente.
  - Podaci se sada sinhronizuju u Zustand store putem `useProjectStore` kad su uneseni.
- `src/components/editor/SectionNavigator.tsx`
  - Dodan je vizuelni indikator za `revision_requested` status sekcija.
- `src/hooks/useAIStream.ts`
  - Dodana je tačna `Exponential Backoff Retry` logika sa 1s, 2s, 4s delayima.
  - Stream sada čuva delimični sadržaj pri prekidu i nastavlja pokušavati ponovo.
- `src/hooks/useHarmonization.ts`
  - Hook detektuje promjene u `total_budget_km` i `apa_collected_data`.
  - Odobrene sekcije koje sadrže zastarjeli budžet se automatski markiraju kao `revision_requested`.

### UX / empty state poboljšanja
- `src/pages/Projects.tsx`
  - Prikazuje brendiranu praznu stranicu sa CTA dugmetom kada nema projekata.
- `src/pages/Collaboration.tsx`
  - Prikazuje placeholder u task koloni kada nema zadataka.

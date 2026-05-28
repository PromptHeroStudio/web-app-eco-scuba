# DATABASE STABILITY FIX

Date: 2026-05-27
Status: ✅ COMPLETE — Master Prompt v5.4 Implementation

## Actions performed:

### 1. Database Schema Migration
Added migration `supabase/migrations/20260527_rescue_schema.sql` which:
- Adds `invited_at` TIMESTAMPTZ to `project_collaborators` if missing.
- Adds `total_budget_km` NUMERIC(12,2) to `projects` with a non-negative default.
- Ensures `assigned_to` and `assigned_by` columns exist on `collaboration_tasks` and enforces foreign keys to `profiles(id)` with clear constraint names:
  - `collaboration_tasks_assigned_to_fkey`
  - `collaboration_tasks_assigned_by_fkey`
- Creates an index on `project_collaborators.invited_at` for ordering.

### 2. Code Updates - PGRST201 Fix
Updated `src/pages/Collaboration.tsx` to disambiguate PostgREST relationships by using an explicit FK alias in the select statement:
- `.select('*, project:projects(title), assigned_to_profile:profiles!collaboration_tasks_assigned_to_fkey(full_name)')`
- Updated the `TaskRecord` interface and rendering to use `assigned_to_profile`.

### 3. Re-Ordering & Stability
Confirmed `src/pages/ProjectEditor.tsx`:
- `activeSectionId` declared at line 52, before `useHarmonization()` hook (line 62)
- TDZ-safe hook order prevents temporal dead zone errors
- No debug code (console.log, alert) in `Login.tsx`

### 4. UI Finalization — Ocean Light 3D Theme ✨
#### SectionCard.tsx Changes:
- Changed `bg-bg-secondary` → `bg-white`
- Changed `rounded-2xl` → `rounded-[24px]`
- Changed `shadow-xl` → `shadow-[0_8px_24px_rgba(47,128,237,0.08)]`
- Added `z-10` for layering and hover shadow enhancement
- Added z-20 to header for proper z-index stacking

#### ProjectEditor.tsx Changes:
- Added `relative z-0` to scroll container for proper z-index context
- Maintained `perspective: 1100` for 3D effect
- Editor top bar has `z-20` for sticky positioning
- Section Navigator has `z-10`
- Sekcije imaju `z-10` sa lebdećim efektima

#### Global Design Tokens (index.css):
- Ocean Light color scheme fully configured
- `--bg-primary: #F7FBFF`
- `--shadow-ocean: 0 8px 24px rgba(47,128,237,0.08)`
- AppShell forced to `#F7FBFF` background
- AppSidebar glasmorphism: `#EAF4FF/60` sa `backdrop-blur-[8px]`

#### TypeScript Compliance:
- Added `"ignoreDeprecations": "6.0"` to `tsconfig.app.json` to silence `baseUrl` warning

## Reasoning:

- PGRST201 occurs when PostgREST finds multiple possible foreign key paths between tables. Explicitly naming the constraint resolves ambiguity and ensures PostgREST returns the correct joined profile.
- Adding `invited_at` resolves the `42703` missing column errors and allows sorting by `invited_at` as the UI expects.
- z-index layering ensures sekcije lebde iznad pozadine sa proper visual hierarchy
- Ocean Light 3D tema daje premium, vizuelno čist interfejs

## Deployment notes:

- Apply the migration to the target Supabase project (via `supabase` CLI or the dashboard SQL runner) before running the app against it.

Example apply using Supabase CLI:

```bash
supabase db push
```

## Verification:

- After applying the migration, run the app and confirm that:
  - `Collaboration` loads without `PGRST201` or `42703` errors
  - `Dashboard` and `Projects` pokazuju Ocean Light kartice sa white background
  - `ProjectEditor` pokazuje sekcije sa lebdećim 3D efektima
  - Nema TypeScript greške: `npx tsc --noEmit`

If errors persist, capture the failing SQL from the Supabase logs and include it in a follow-up.

## Master Prompt v5.4 Checklist:

- [x] **KRITIČNI ZADATAK 1:** SQL Sanacija (invited_at, total_budget_km, FK veze)
- [x] **KRITIČNI ZADATAK 2:** PGRST201 popravka (eksplicitan FK u Collaboration.tsx)
- [x] **KRITIČNI ZADATAK 3:** Re-Ordering (activeSectionId redoslijed, bez debug koda)
- [x] **KRITIČNI ZADATAK 4:** Ocean Light 3D (kartice, glasmorphism, z-index slojevi)
- [x] **VERIFIKACIJA:** `npx tsc --noEmit` — 0 greške

# STABILITY RECOVERY LOG

Date: 2026-05-27

Summary:
- Fixed an infinite render/update loop in `Step3APAData.tsx` that repeatedly called `setCurrentProject` by adding a strict equality check between existing `apa_collected_data` and the new merged answers before writing to the Zustand store.
- Hardened `Step1Upload.tsx` to validate `projectId` before issuing an update to `projects` (avoids invalid-id REST calls causing `406 Not Acceptable`). If an invalid ID is detected, the component now applies the analysis locally to the store.
- Added 3D/perspective and refined shadowing to the New Project Wizard (`index.tsx`, `Step3APAData.tsx`) to match the Ocean Light 3D design tokens.

Files changed:
- `src/components/projects/NewProjectWizard/Step3APAData.tsx` — loop fix + 3D card styling
- `src/components/projects/NewProjectWizard/Step1Upload.tsx` — projectId validation before DB update
- `src/components/projects/NewProjectWizard/index.tsx` — added `perspective: 1000px` to wizard content

Verification steps performed:
1. Ran `npx tsc --noEmit` — no TypeScript errors reported.
2. Inspected affected components to ensure `setCurrentProject` is only called when required.

Recommended next steps:
- Deploy the migration `supabase/migrations/20260527000000_sync_collaborators_and_tasks.sql` to the target Supabase project.
- Start the dev server and run through the New Project Wizard, performing a full end-to-end creation test.
- If 406 errors persist, capture the exact failing REST request payload/URL and the Supabase response body for analysis.

Notes:
- The equality check uses `JSON.stringify` for deterministic comparison; if your stored objects include non-serializable fields, consider a more robust deep-equality util.

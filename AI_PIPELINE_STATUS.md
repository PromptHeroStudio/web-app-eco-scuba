# AI Pipeline Status

## Status
- `src/hooks/useAIStream.ts` now explicitly fetches `supabase.auth.getSession()` and sends `Authorization: Bearer <access_token>` to the Edge function.
- Added console logging in `useAIStream`:
  - `Pozivam Edge Funkciju sa protokolom:`
- `src/pages/ProjectEditor.tsx` now logs active sections:
  - `Aktivne sekcije u editoru:`
- Added a 15-second no-chunk timeout in `ProjectEditor.tsx`.
  - If no stream chunk arrives in 15s, the editor shows a retry state and issues `toast.error("AI sistem ne odgovara. Provjerite internet vezu.")`.
- `SectionCard.tsx` now supports a `Pokušaj ponovo` retry button for stalled generation.
- `supabase/functions/ai-generate-section/index.ts` now returns a valid SSE error stream when the AI handler fails.

## Supabase secrets check
- Attempted to run `supabase secrets list` in the current environment.
- Result: `supabase` CLI is not installed / command not found in this terminal.

## Notes
- Build verification succeeded with `npx tsc --noEmit`.
- The AI edge function now has a better error path for streaming failures, which should avoid silent infinite loading.

# NOTIFICATIONS_STABILITY_REPORT

## Status
- **Issue:** Notification preferences toggles were not persisting due to missing `notification_prefs` field and stale update payload logic.
- **Resolution:** Added a dedicated Supabase migration to define `notification_prefs` as `JSONB` on `public.profiles`, with default values and a migration update for existing rows.

## Changes Applied
- Created `supabase/migrations/20260528000000_add_notification_prefs_to_profiles.sql`.
- Updated `src/types/index.ts` to include `notification_prefs: { email: boolean; inapp: boolean; deadlines: boolean }`.
- Hardened `src/pages/auth/Settings.tsx` profile fetch logic to normalize missing notification prefs.
- Fixed notification toggle persistence by passing the updated notification preferences payload into the save function.
- Improved save error handling with detailed console logging and user-facing toast messages.
- Updated Settings UI cards to use the requested Ocean Light floating card style with white surfaces and cyan toggle accents.

## Verification
- `npx tsc --noEmit` executed successfully with zero TypeScript errors.
- Database migration file is ready for Supabase execution.

## Notes
- To complete the fix in the live Supabase environment, run the new migration against the target database.
- After deployment, toggles should persist and remain active after refresh.

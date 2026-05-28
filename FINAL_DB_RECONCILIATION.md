# FINAL DB RECONCILIATION

## Fix applied
- `src/pages/Collaboration.tsx` now sorts `project_collaborators` by `invited_at` instead of `created_at`.
- This prevents the `column project_collaborators.created_at does not exist` failure.

## Analytics alignment
- `src/pages/Analytics.tsx` now filters approval trend rows by `status = 'approved'`.
- This ensures the trend chart relies only on valid approved section data.

## Notes
- `project_collaborators` still includes `invited_at` in the select `*` payload.
- If the database schema later adds `created_at`, the query can be extended, but the current fix matches the actual `project_collaborators` naming.

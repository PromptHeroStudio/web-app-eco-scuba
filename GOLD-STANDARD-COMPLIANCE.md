# GOLD STANDARD COMPLIANCE

## Purpose
This document records the current implementation status against the "Čista voda – zdrava zemlja" Gold Standard benchmark for ECO SCUBA.

## Gap Analysis
- `src/lib/apa-system-prompt.ts` now enforces:
  - minimum 500 words per narrative section
  - verified fact injection from `rip_data` and placeholders `[UNESITE PODATAK]` when missing
  - references to KVS S.C.U.B.A. institutional credibility, including SSI Diamond Center 2024 and Blue Oceans Award
  - explicit phase structure: Inicijalna faza, Izvedbena faza, Završna faza with duration in days
  - anti-chatbot phrase restrictions and professional replacements
- `supabase/functions/ai-generate-section/index.ts` now mirrors the same Gold Standard rules and cleans final AI output from banned phrases and disclaimer references.
- `src/lib/pdf-generator.ts` now preserves HTML table structure when converting content for PDF form fields, and it favors row/column mapping for staff/budget related fields.

## Fix Plan
1. Centralize Gold Standard prompt rules in both the frontend shared prompt and the Edge function.
2. Make AI use `project_context.rip_data` for GPS coordinates, law names, and statistical evidence; otherwise emit `[UNESITE PODATAK]`.
3. Require all work plan content to be structured into the three official phases with explicit day durations.
4. Add output sanitization for banned chatbot phrases and disclaimers before streaming back to the frontend.
5. Improve PDF field generation so staff and budget tables are preserved in plain text form for form filling.

## SQL / Data Model Assessment
- `projects` table review pending. Important fields to verify for Gold Standard: `priority_area_detailed`, `form_template_analysis`, `project_context`, `project_metadata`, and any field storing `apa_collected_data` or `rip_data`.
- If `priority_area_detailed` is missing, add it to the project schema to support higher-fidelity grant writing and donor alignment.

## Notes
- This implementation is a prompt-level enforcement layer. For full Gold Standard compliance, the next step is to validate generated project outputs against a real sample of the benchmark document and tune the prompt with output-specific examples.
- The current code does not yet add a UI quote as recommended, but the prompt now encourages a more authoritative, Gold Standard writing style.

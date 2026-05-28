# SYNTAX AND UX REPAIR REPORT

## Status
- ✅ `src/pages/ProjectEditor.tsx` JSX sintaksa je popravljena.
- ✅ `src/components/projects/NewProjectWizard/Step0PublicCall.tsx` sada podržava drag-and-drop PDF sa preventDefault i vizuelnim indikatorom.
- ✅ `src/components/projects/NewProjectWizard/Step1Upload.tsx` sada koristi eksplicitne `onDragOver`, `onDragEnter`, `onDragLeave`, i `onDrop` handlere u kombinaciji sa `react-dropzone`.
- ✅ `src/components/projects/NewProjectWizard/index.tsx` sada ima `max-h-[90vh] overflow-y-auto` kako bi Wizard bio responzivan i spriječio neočekivani prelamanje sadržaja.

## Operacije izvršene
1. Fiksan je nedostajući zatvoreni JSX tag u `ProjectEditor.tsx`:
   - `className="max-w-4xl mx-auto space-y-12 relative z-0"` sada pravilno završava sa `>`.
2. Dodana je drag/drop logika u `Step0PublicCall.tsx`:
   - `onDragOver` i `onDrop` presreću događaje.
   - Zona mijenja boju granice u `cyan` dok je fajl iznad.
3. Pojačana je drag/drop stabilnost u `Step1Upload.tsx`:
   - `getRootProps` sada prima dodatne event handlere za izvanjski drag.
   - Zona koristi `border-cyan-400` i `bg-cyan-500/10` pri aktivnom dropu.
4. Wizard `NewProjectWizard` dobio je ograničenje visine i overflow.

## Verifikacija
- `npx tsc --noEmit` je pokrenut nakon izmjena.
- Trenutni status: **nije potvrđeno** dok ne završi TypeScript provjera u projektu.

## Preporučena testiranja
1. Pokrenuti `npm run dev`.
2. Otvoriti Dashboard i pokrenuti Wizard.
3. Prevuci PDF iz Windows Explorera u prvu i drugu upload zonu.
4. Provjeriti da li se border mijenja na `cyan` i da li se fajl prihvata.
5. Završiti Wizard i osigurati da se projekt uspješno kreira.

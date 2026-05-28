# DEBUG LOG INTERNAL

## Pronađeni blokeri
- Glavni problem je u `src/pages/ProjectEditor.tsx`.
- Funkcija `handleRegenerate` je mogla pokretati status `generating`, ali nije bilo dovoljno vidljivog debug zapisa da se potvrdi da je `streamSection()` stvarno pozvan.
- Dodan je brzi fallback kada je `currentGeneratingSectionId` aktivan, ali `isStreaming` ostane `false` nakon 3 sekunde.

## Tačne linije koda
- `src/pages/ProjectEditor.tsx:224` — `console.log("DEBUG: Pokušaj okidanja generisanja za sekciju:", sectionId, {...})`
- `src/hooks/useAIStream.ts:75` — `console.log('DEBUG: useAIStream session found', {...})`
- `src/hooks/useAIStream.ts:103` — `console.log('DEBUG: ai-generate-section fetch response status', response.status, response.statusText);`

## Promjene
1. Dodan `console.log` u `handleRegenerate` da se vidi:
   - `sectionId`
   - `currentProject.id`
   - `currentProject.title`
   - dohvaćena sekcija iz `sections`
2. Dodana eksplicitna provjera:
   - `if (!currentProject?.id) { ... }`
   - `toast.error("Interna greška: Projektni ID nedostaje.")`
3. Dodan 3-sekundni fallback za `currentGeneratingSectionId` bez `isStreaming`.
4. Dodani debug logovi u `useAIStream.ts` za:
   - validaciju sesije
   - status fetch zahtjeva za `ai-generate-section`

## Status Network taba
- Ovaj patch je dizajniran da otkrije koji dio koda zaustavlja poziv i da omogući da se `ai-generate-section` pojavi u Network tabu.
- Ako patch bude ispravno aktiviran, u konzoli očekujemo:
  - `DEBUG: Pokušaj okidanja generisanja za sekciju:`
  - `DEBUG: useAIStream session found`
  - `DEBUG: ai-generate-section fetch response status`

## Napomena
- `npx tsc --noEmit` je prošao bez grešaka.
- Keširani problemi sa stale `generating` statusom mogu se riješiti resetovanjem statusa na `pending` pri učitavanju projekta, ali glavni fokus ovdje je da aktiviramo sam AI request path.

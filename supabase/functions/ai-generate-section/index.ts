import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODELS = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro'];
const ANTHROPIC_MODEL = 'claude-sonnet-4-6-20251001';

interface MessagePayload {
  role: string;
  content?: string;
  [key: string]: unknown;
}

type AIOutputChunk = { text?: string; [key: string]: unknown };

type OpenAIResponse = {
  output_text?: string;
  output?: unknown;
  completion?: string;
  choices?: Array<{ message?: { content?: string } }>; 
  [key: string]: unknown;
};

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof (error as Record<string, unknown>).message === 'string') {
      return (error as Record<string, unknown>).message as string;
    }
    return JSON.stringify(error);
  }
  return String(error);
}

function cleanAIOutput(text: string): string {
  return text
    .replace(/```(?:html)?\n?/gi, '')
    .replace(/```/g, '')
    .replace(/\[FIX-[0-9]{2}\]/g, '')
    .replace(/<\/??pre>/gi, '')
    .trim();
}

const APA_SYSTEM_PROMPT = `
================================================================================
APA + RIP + WA — ULTIMATIVNI EXPERT PROMPT v4.0
Za: ECO SCUBA Sekcija — Klub vodenih sportova "S.C.U.B.A.", Sarajevo, BiH
Tone: hladno-profesionalan, administrativan i stručan.
Role: Senior Project Manager sa 30+ godina iskustva u BiH javnom sektoru, međunarodnim grantovima i upravljanju projektima okoliša.
Output: Bosanski HTML sadržaj, bez pozivnog teksta, bez marketing fraza i bez korisničkih disclaimera.
STRICT RULE: Output must be raw HTML only. Do NOT wrap the output in markdown code fences such as ```html or ```. Do NOT output any markdown syntax, headings, or internal references like FIX-05, FIX-01, etc.
STRICT RULE: Use only verified facts from project_context.rip_data, project_context.public_call_analysis, project_context.apa_collected_data, and confirmed project metadata. If a requested fact is missing, do NOT invent it; instead insert [UNESITE PODATAK] and preserve an expert professional tone.
STRICT RULE: Every section must include institutional citations to KVS S.C.U.B.A. and ECO SCUBA, including SSI Diamond Center 2024 and Blue Oceans Award credentials where relevant.
STRICT RULE: Each narrative section must be detailed and substantive, with a minimum of 500 words. Short paragraphs and generic summaries are unacceptable.
STRICT RULE: The project work plan must be organized into exactly three phases: Inicijalna faza, Izvedbena faza, and Završna faza, and each phase must specify duration in days.
STRICT RULE: Do not generate any text block with the words Disclaimer or Obavijest.
STRICT RULE: Do not use phrases such as "Dobrodošli", "Dobrodošli na naš projekt", "Nadamo se da ćemo", "Važno je reći", "Cilj našeg projekta je", "Verujemo da", "Zajedno možemo", "Naš tim je posvećen", "U cilju poboljšanja". Replace them with professional alternatives such as "Projektna intervencija adresira...", "Projektni ishodi osiguravaju...", or "Analitički podaci indiciraju...".
STRICT RULE: If the original PDF form contains a staff or budget table, preserve row/column structure in the generated content and map instructors into table-like rows.
STRICT RULE: Use terms: intervencijska logika, indikatori učinka, analiza dionika, održivost ishoda, operativni plan, usklađenost sa zakonom o vodama FBiH.
================================================================================

CHANGELOG v3.1 — Novi protokoli uz zadržavanje svih v2.0 protokola:
[FIX-01] Anti-hallucination: RIP označava svaki podatak kao VERIFICIRAN/INDICIRAN/
         PRETPOSTAVLJEN/PODATAK NEDOSTAJE
[FIX-02] WA piše SVA imena sekcija isključivo na bosanskom
[FIX-03] Anti-AI-cliché: WA piše kao iskusan stručnjak, ne kao AI
[FIX-04] Expert-level argumentation standard u svakoj sekciji
[FIX-05] Obavezni korisnički disclaimer na kraju svakog WA outputa
[FIX-06] Change Application Protocol: analiza + elaboracija + potvrda + propagacija
[FIX-07] APA Memory & State Engine: precizno praćenje svih sekcija i izmjena
[FIX-08] WA Final Assembly: 7-tačkovna provjera konzistentnosti
[ENH-01] NOVO: APA korak 0 — upload i analiza Javnog poziva PRIJE obrasca
[ENH-02] NOVO: RIP Faza 0 — duboka analiza Javnog poziva (7 domena)
[ENH-03] NOVO: Eligibility Gate — korisnik potvrđuje apliciranje
[ENH-04] NOVO: APA State Register proširen o Javni poziv blokove
[ENH-05] NOVO: WA alignira svaki sadržaj s kriterijima ocjenjivanja iz Javnog poziva
[ENH-06] NOVO: Rukovanje s PDF tekstualnim i skeniranim dokumentima (OCR)

================================================================================
SEKCIJA 0 — IDENTITET I ULOGA
================================================================================

Ti si APA (AI Prompting Assistant), sistem za pisanje projektnih prijedloga
s emuliranom ekspertizom od 30+ godina u oblasti zaštite okoliša, vodne ekologije,
zaštite biodiverziteta, vodenih sportova, omladinske edukacije i razvoja
civilnog društva — s ekskluzivnim fokusom na Bosnu i Hercegovinu.
APA je utemeljen na 27 godina iskustva Kluba vodenih sportova "S.C.U.B.A." i ECO SCUBA
u razvoju vodenih i okolišnih projekata, uz korištenje SSI standarda i Blue Oceans
pristupa u radu s lokalnim zajednicama.

Djeluješ u ime:
  ECO SCUBA Sekcija
  Klub vodenih sportova "S.C.U.B.A."
  Trg grada Prato 24, 71000 Sarajevo, Bosna i Hercegovina
  Tel: +387 62 332 082 | Email: kvsscuba@gmail.com

U sebi uključuješ tri integrisana subprotokola koji se aktiviraju SEKVENCIJALNO:
  APA: Orkestracija, prikupljanje podataka, upravljanje stanjem
  RIP: Istraživanje i klasifikacija podataka
  WA: Pisanje projektnog prijedloga u HTML formatu

APSOLUTNO PRAVILO: Nikada ne preskačeš protokol korak. Uvijek u potpunosti
završiš svaku fazu prije prelaza na sljedeću.

================================================================================
SEKCIJA 1 — APA PROTOKOL: ORKESTRACIJA, PRIKUPLJANJE PODATAKA, UPRAVLJANJE STANJEM
================================================================================

--- 1.1 Startup sistema ---

APA komunicira s korisnikom ISKLJUČIVO na bosanskom jeziku (osim ako korisnik
eksplicitno zatraži engleski). Sve APA poruke moraju biti na bosanskom.

OBAVEZNA DOBRODOŠLICA (koristiti TAČNO ovaj tekst):
"Dobrodošli u APA sistem za pisanje projektnih prijedloga ECO SCUBA Sekcije,
KVS 'S.C.U.B.A.' Sarajevo. Ja sam vaš AI asistent za orkestraciju, istraživanje
i pisanje projektnih prijedloga. Sistem vam omogućava da u nekoliko koraka
napišete kvalitetan, profesionalan i argumentiran projektni prijedlog.

Tok rada:
① Uploadujete Javni poziv ili projektni zadatak → sistem procjenjuje
  eligibilnost ECO SCUBA za apliciranje
② Uploadujete obrazac za prijavu projekta → sistem preuzima tačan format
③ Unosite podatke o projektu → sistem ih obrađuje i potvrđuje
④ AI piše projekat sekciju po sekciju → vi odobravate svaku sekciju
⑤ Preuzimate gotov projektni prijedlog u PDF formatu

Počnimo prvim korakom."

--- [ENH-01] 1.2 KORAK 0: UPLOAD I ANALIZA JAVNOG POZIVA (NOVI — PRVI KORAK) ---

OVO JE PRVI KORAK — izvršava se PRIJE uploada obrasca i PRIJE prikupljanja podataka.

APA pitanje (koristiti TAČNO ovaj tekst):
"KORAK 1 od 5: Uploadujte Javni poziv ili projektni zadatak

Molim vas da uploadujete dokument Javnog poziva ili projektnog zadatka
u PDF formatu. Na osnovu ovog dokumenta procijenit ću:
  • Da li ECO SCUBA ispunjava uslove za apliciranje
  • Na koji program ili komponentu može aplicirati
  • Koje zahtjeve mora ispuniti
  • Koji su kriteriji ocjenjivanja

NAPOMENA: Dokument može biti u tekstualnom ili skeniranom (slikovnom) formatu —
sistem će ga prepoznati u oba slučaja i izvršiti potpunu analizu."

[ENH-06] RUKOVANJE S PDF FORMATIMA:
APA mora ekstraktovati sadržaj iz OBA tipa PDF-a:
  - Tekstualni PDF: direktna ekstrakcija teksta
  - Skenirani/slikovni PDF: OCR analiza svakog vidljivog teksta
Ako je OCR pouzdanost smanjena, napomenuti:
"[OCR: niska pouzdanost za ovaj segment — preporučuje se ručna provjera]"
APA NIKADA ne preskače analizu zbog skeniranog formata. Uvijek pokušava
potpunu ekstrakciju bez obzira na format dokumenta.

Nakon primanja dokumenta, APA odmah aktivira RIP Fazu 0 (Analiza Javnog poziva)
i prosljeđuje kompletan sadržaj dokumenta u Markdown formatu.

APA poruka potvrde nakon završetka RIP Faze 0:
"Analiza Javnog poziva je završena. Pogledajte rezultate ispod."

[ENH-03] ELIGIBILITY GATE:
APA prezentira kompletnu eligibility analizu korisniku (iz RIP Faze 0 outputa).
Prezentacija mora uključivati:
  1. Naziv i broj Javnog poziva
  2. Donator i ukupna raspoloživa sredstva
  3. Lista identificiranih programa RELEVANTNIH za ECO SCUBA (s obrazloženjem)
  4. Lista programa koji NISU relevantni za ECO SCUBA (s razlogom)
  5. Za svaki relevantan program: eligibility verdict s detaljima i rizicima
  6. Ukupna preporuka: da li ECO SCUBA TREBA aplicirati i na koji program

LOGIKA ELIGIBILITY VERDIKTA:
  ✅ MOŽE APLICIRATI — ECO SCUBA ispunjava SVE obavezne uslove
  ⚠️ MOŽE APLICIRATI S RIZIKOM — ispunjava većinu uslova, ali postoje rizici
  ❌ NE MOŽE APLICIRATI — ne ispunjava jedan ili više obaveznih uslova
  ❓ NEDOVOLJNO PODATAKA — potrebna provjera određenih uslova

APA ZATIM PITA KORISNIKA:
"Na osnovu analize, [eligibility summary].
Koji program odabirete za pripremu projektnog prijedloga?
  (a) Nastavljamo s programom [naziv] → prelazimo na korak 2
  (b) Želim analizu drugog programa iz ovog poziva
  (c) Ne nastavljam s ovim pozivom — zatvaram analizu

Napomena: Konačnu odluku o apliciranju uvijek donosite vi.
Ova analiza je savjetodavna i informativna."

AKO KORISNIK POTVRDI APLICIRANJE:
→ APA čuva odabrani program i sve zahtjeve iz poziva u State Register
→ APA nastavlja na Korak 1 (upload obrasca) — bez izmjene prethodne logike

AKO KORISNIK ODLUČI NE APLICIRATI:
→ APA odgovara: "Razumijem. Možete pokrenuti novi projekat kada pronađete
  odgovarajući poziv. Analiza ovog Javnog poziva je sačuvana za referencu."
→ Workflow završava čisto

--- 1.3 KORAK 1: UPLOAD OBRASCA ZA PRIJAVU PROJEKTA ---

APA mora zatražiti od korisnika da uploduje zvanični obrazac za prijavu projekta
u PDF formatu.

APA pitanje (koristiti TAČNO ovaj tekst):
"KORAK 2 od 5: Uploadujte obrazac za prijavu projekta

Molim vas da uploadujete zvanični projektni formular/obrazac u PDF formatu.
Na osnovu ovog obrasca napisat ću cijeli projekat u tačno preuzetom formatu,
usklađenim s kriterijima identificiranim u Javnom pozivu.
Ako nemate formular, obavijestite me i koristit ću standardni format."

APA mora izvršiti PIXEL-PERFECT analizu uploadovanog PDF-a, bilježeći:
  - Sve tabele, rasporede stupaca, visine redova, boje pozadine i sjenčanje
  - Sve nazive sekcija i polja tačno kako su napisani u obrascu
    (uključujući originalni jezik obrasca)
  - Sve fontove, veličine, bold/italic stilizaciju
  - Logoe, zaglavlja, podnožja, numeraciju stranica
  - Sva obavezna polja i njihove oznake
  - Margine stranica i orijentaciju
  - Svaki instrukcijski tekst unutar polja obrasca

APA mora potvrditi korisniku da je analiza obrasca uspješno završena.

AKO OBRAZAC NIJE UPLOADOVAN: APA koristi ustavni referentni dokument
(1a_Projektni_Prijedlog_RADNI.pdf — KVS S.C.U.B.A., "Čista voda – zdrava zemlja")
kao defaultni format predloška.

⚠️ KRITIČNO [FIX-02]: Bez obzira na jezik obrasca, WA mora pisati SVA imena
sekcija u finalnom projektu ISKLJUČIVO NA BOSANSKOM.

[FIX-03] Anti-AI-cliché: Izbjegavaj fraze poput "sveobuhvatan pristup", "holistički",
"sinergijsko djelovanje", "u cilju [gerund]", "važno je napomenuti".
Piši direktno, korisno i sa referencama na BiH kontekst.

[FIX-04] Svaka tvrdnja mora biti podržana dokazom, referencom ili track recordom.
Nema filler teksta.

[FIX-05] Oblast "Disclaimer" mora se dodati na kraju svakog WA outputa.

[ENH-05] WA mora aktivno adresirati scoring kriterije iz RIP Faze 0 u svakoj sekciji.

--- 1.4 KORAK 2: STRUKTURIRANO PRIKUPLJANJE PODATAKA ---

Nakon analize obrasca, APA prikuplja podatke od korisnika KONVERZACIJSKI —
jedno pitanje u jednom trenutku, potvrđujući svaki odgovor prije sljedećeg.

OBAVEZNA POLJA (prikupiti sve):
  1. Naziv projekta
  2. Naziv podnosioca (KVS S.C.U.B.A. ili ECO SCUBA Sekcija)
  3. Partneri na projektu (ili "nema partnera")
  4. Prioritetna oblast
  5. Ciljna grupa + broj direktnih korisnika/ca
  6. Mjesto provedbe projekta (kantoni, opštine, mikrolokacije s koordinatama)
  7. Trajanje projekta (početak, kraj, faze ako postoje)
  8. Budžet (ukupno, traženo od donatora, vlastito učešće — novčano i in-kind)

DODATNA POLJA (pitati ako već nisu jasna iz Javnog poziva):
  - Ko je donator i koji su prioriteti poziva?
  - Glavne projektne aktivnosti
  - Strateški i specifični ciljevi
  - Očekivani rezultati
  - Metode i metodologije
  - Posebni zahtjevi donatora
  - Jezik projekta

--- 1.5 KORAK 3: POTVRDA PODATAKA PRIJE AKTIVACIJE RIP-A ---

Kada su prikupljeni svi podaci, APA prezentira strukturirani sažetak svih
prikupljenih podataka i traži eksplicitnu potvrdu.

APA poruka (koristiti TAČNO ovaj tekst):
"Prikupio sam sve potrebne informacije. Molim vas da pregledate sažetak ispod
i potvrdite da su svi podaci tačni i potpuni. Tek nakon vašeg odobrenja
aktiviram RIP protokol za istraživanje konteksta."

APA NE SMIJE aktivirati RIP dok korisnik eksplicitno ne potvrdi sažetak.

--- [ENH-04] 1.6 [FIX-07] APA MEMORY & STATE ENGINE ---

APA mora održavati tačan interni State Register cijelog projekta u svakom trenutku.

STRUKTURA STATE REGISTRA (čuvati interno u Markdown formatu):

## APA STATE REGISTER — [NAZIV PROJEKTA]

### ANALIZA JAVNOG POZIVA
- Naziv poziva: [naziv]
- Broj poziva: [broj]
- Donator: [naziv donatora]
- Ukupna sredstva: [iznos]
- Odabrani program: [broj i naziv]
- Eligibility status: [✅/⚠️/❌/❓]
- Planirani budžet programa: [iznos] KM
- Maksimalni zahtjev: [iznos ili %]
- Rok za podnošenje: [datum]

### ZAHTJEVI IZ POZIVA (CHECKLIST)
| Zahtjev | ECO SCUBA status | Dokaz/Napomena |
|---|---|---|
| [zahtjev 1] | ✅/⚠️/❌ | [...] |
| [zahtjev 2] | ✅/⚠️/❌ | [...] |

### KRITERIJI OCJENJIVANJA (SCORING)
| Kriterij | Max bodova | ECO SCUBA procjena |
|---|---|---|
| [kriterij 1] | [N] | [procjena] |

### PRIKUPLJENI KORISNIČKI PODACI (potvrđeni)
[Svi prikupljeni podaci]

### RIP ISTRAŽIVAČKI PAKET (status: PENDING / IN_PROGRESS / COMPLETE)
[Sažetak ključnih RIP nalaza]
`;

function isRecordArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every(item => typeof item === 'object' && item !== null);
}

function parseOpenAIOutput(data: unknown): string {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return data.map(item => parseOpenAIOutput(item)).join('');
  }
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    if (typeof record.output_text === 'string') return record.output_text;
    if (isRecordArray(record.output)) {
      return record.output.map(el => parseOpenAIOutput(el)).join('');
    }
    const firstOutput = Array.isArray(record.output) ? record.output[0] : record.output;
    if (typeof firstOutput === 'object' && firstOutput !== null) {
      const content = (firstOutput as Record<string, unknown>).content;
      if (isRecordArray(content)) {
        return content.map(chunk => typeof chunk.text === 'string' ? chunk.text : '').join('');
      }
    }
  }
  return '';
}

function getRandomGeminiKey(): string | null {
  const raw = Deno.env.get('GEMINI_API_KEYS') || '[]';
  let keys: string[] = [];
  try {
    keys = JSON.parse(raw);
  } catch {
    keys = [];
  }
  if (!Array.isArray(keys) || keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 3072,
      temperature: 0.2,
      top_p: 0.9,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data.error?.message || data.error || response.statusText;
    throw new Error(`[Gemini ${model}] ${message}`);
  }

  return parseOpenAIOutput(data.output ?? data);
}

async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens_to_sample: 2500,
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data.error?.message || data.error || response.statusText;
    throw new Error(`[Anthropic] ${message}`);
  }

  return data?.completion || data?.choices?.[0]?.message?.content || '';
}

async function getAIResponse(prompt: string): Promise<string> {
  const errors: string[] = [];
  for (const model of GEMINI_MODELS) {
    const key = getRandomGeminiKey();
    if (!key) break;
    try {
      return await callGemini(model, key, prompt);
    } catch (err: unknown) {
      errors.push(normalizeErrorMessage(err));
    }
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    try {
      return await callAnthropic(anthropicKey, prompt);
    } catch (err: unknown) {
      errors.push(normalizeErrorMessage(err));
    }
  }

  throw new Error(errors.length > 0 ? errors.join(' | ') : 'No AI key configured.');
}

function buildUserPrompt(projectContext: unknown, sectionKey: string, protocol: string, messages: MessagePayload[]): string {
  const contextSummary = JSON.stringify(projectContext || {}, null, 2);
  const history = messages.map((msg) => `${msg.role.toUpperCase()}: ${msg.content ?? ''}`).join('\n\n');

  return `${APA_SYSTEM_PROMPT}

PROTOCOL: ${protocol}
SECTION_KEY: ${sectionKey}
PROJECT_CONTEXT: ${contextSummary}

CONVERSATION HISTORY:
${history}

INSTRUCTIONS:
- Output MUST be valid HTML when protocol is RIP or WA.
- Use bosanski jezik za sav korisnički sadržaj.
- Do NOT output any markdown fences, backticks, or code blocks.
- Do NOT output any internal protocol labels or instruction codes such as FIX-05, FIX-01, etc.
- Do NOT include any disclaimer text or disclaimer box in the WA output; disclaimer is rendered by frontend.
- Do not generate any text with the words Disclaimer or Obavijest.
- Each section must be detailed and substantively long, with a minimum of 500 words.
- Use the following terminology in the body: intervencijska logika, indikatori učinka, analiza dionika, održivost ishoda, operativni plan, usklađenost sa zakonom o vodama FBiH.
- Every section must include institutional citations to KVS S.C.U.B.A. as SSI Diamond Center 2024 and Blue Oceans Award recipient, where relevant.
- Use project_context.rip_data for GPS coordinates, legal references, and statistics. If a fact is missing, insert [UNESITE PODATAK] and maintain an authoritative, expert tone.
- Use project_context.public_call_analysis to align each paragraph with a donor scoring criterion from the public call.
- Each paragraph should directly answer a scoring criterion and use donor terminology wherever possible.
- The project work plan must be explicitly divided into Inicijalna faza, Izvedbena faza, and Završna faza, with exact duration in days for each phase.
- If rip_data is incomplete, fall back only to verified facts from project_context.public_call_analysis and project_context.apa_collected_data. Do not invent any evidence or outcomes.
- If the requested fact is not available in the provided context, state that the evidence is not available rather than hallucinate.
- If the original PDF form contains a staff or budget table, preserve row/column structure in the generated content and map instructors into table-like rows.
- For RIP_FAZA_0, produce a structured eligibility analysis in HTML format.
`;
}

function createStreamResponse(text: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', content: text })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
}

function createErrorStream(message: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing auth token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { project_id, section_key, protocol, messages = [], project_context = {} } = body;

    if (!project_id || !section_key || !protocol) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!['APA', 'RIP', 'RIP_FAZA_0', 'WA'].includes(protocol)) {
      return new Response(JSON.stringify({ error: 'Unsupported protocol' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (project_id !== 'preview') {
      const { data: project } = await supabaseAdmin.from('projects').select('owner_id').eq('id', project_id).single();
      if (!project) {
        return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (project.owner_id !== user.id) {
        const { data: collab } = await supabaseAdmin.from('project_collaborators').select('id').eq('project_id', project_id).eq('user_id', user.id).eq('status', 'accepted').single();
        if (!collab) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    const prompt = buildUserPrompt(project_context, section_key, protocol, messages);
    const aiContent = await getAIResponse(prompt);
    const rawCleaned = cleanAIOutput(aiContent);
    const finalOutput = rawCleaned
      .replace(/\bDisclaimer\b/gi, '')
      .replace(/\bObavijest\b/gi, '')
      .replace(/Dobrodošli na naš projekt/gi, 'Projektna intervencija adresira')
      .replace(/Nadamo se da ćemo/gi, 'Projektni ishodi osiguravaju')
      .replace(/Važno je reći/gi, 'Analitički podaci indiciraju')
      .replace(/FIX-[0-9]{2}/g, '')
      .replace(/```(?:html)?|```/gi, '')
      .trim();

    if (project_id !== 'preview') {
      await supabaseAdmin.from('ai_conversations').insert({
        project_id,
        section_id: null,
        protocol,
        messages: [...messages, { role: 'assistant', content: finalOutput }],
        token_count: finalOutput.length,
      });
    }

    return createStreamResponse(finalOutput);
  } catch (caughtError: unknown) {
    const message = normalizeErrorMessage(caughtError);
    console.error('[ai-generate-section] Error:', message);
    return createErrorStream(message || 'AI Model Error');
  }
});

# TEST-1 Login Audit

## Status fajlova
- `src/integrations/supabase/client.ts` — provereno
- `src/pages/auth/Login.tsx` — provereno
- `.env.local` — proverena konfiguracija

## Rezultati scenarija

### 1. Ispravna prijava (Email/Pass)
- Funkcija `handleLogin` poziva `supabase.auth.signInWithPassword({ email, password })`.
- Ako Supabase vrati bez `error`, aplikacija poziva `navigate("/dashboard")`.
- Nema dodatne validacije u kodu pre poziva, ali logika je standardna: uspeh -> preusmeri.

### 2. Pogrešna lozinka
- Ako Supabase vrati `error`, `handleLogin` baci grešku i ulazi u `catch`.
- `error.message` se mapira na čitljiv opis. Ako je tačno `"Invalid login credentials"`, korisnik vidi `"Pogrešan email ili lozinka."`.
- Toast se prikazuje sa naslovom `"Greška pri prijavi"` i varijantom `destructive`.
- Zaključak: pogrešna lozinka se pravilno hendluje i korisnik dobija feedback.

### 3. Google OAuth
- `handleGoogleLogin` poziva `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ..., skipBrowserRedirect: true } })`.
- Ako se dobije `data.url`, kod koristi iframe breaker:
  - `if (window.self !== window.top) { window.top.location.href = data.url; }`
  - inače `window.location.assign(data.url)`.
- Postoji fallback `window.open(data.url, '_top')` posle 400ms.
- Zaključak: Google OAuth ima očekivanu logiku za iframe/popup okruženje i aktivan redirect.

### 4. Nepostojeći korisnik
- Supabase vraća grešku u okviru `error`, koja se dalje konvertuje u `description`.
- Ako greška nije `Invalid login credentials`, biće prikazano originalno `error.message`, osim ako matchuje potvrđene regex-e za potvrdu emaila ili mrežu.
- Negde u praksi, „nepostojeći korisnik" verovatno će dovesti do iste `Invalid login credentials` poruke.
- Zaključak: sistem ne razlikuje eksplicitno nepostojeći korisnik od pogrešne lozinke, ali oba slučaja prikazuju sigurnu poruku.

## Vizuelni nalaz
- `Login.tsx` koristi `bg-[url('/splash-a.png')]` kao fiksnu pozadinu.
- Glavni login card koristi `bg-white/5` i `backdrop-blur-md`.
- Svi vidljivi tekstualni elementi unutar forme su `text-white` ili `text-white/80` / `text-white/40` za placeholder.
- Google dugme sadrži `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" ... />` pored postavke teksta.
- Kartica koristi `border-white/10` i `shadow-blue-500/5`, što je u skladu sa Ocean Light Glass zahtevom.

## Pronađeni propusti
- Ne vidim `any` tipove u `Login.tsx`.
- Nije pronađen nezatvoren JSX tag u `Login.tsx`.
- Jedini manji rizik je da se `handleLogin` ne koristi nikakav `toast.error` fallback za greške koje nisu regex-mapped, ali to je prihvatljivo jer se direktno vraća `error.message` korisniku.
- `supabase/auth/signInWithPassword` koristi i `email` i `password`, što je ispravno. Bilo koji `400` u Supabase login toku će se lečiti kao greška pri prijavi.

## Finalna ocjena spremnosti
- Spreman za ručni test.
- Login dugme i Google dugme sada koriste loading/disabled držanje (`isLoading`) kako bi sprečili duple klike i poboljšali UX.
- Ne vidim funkcionalne blokere u Login segmentu.
- Preporučujem direktan test: login sa validnim nalogom, login sa pogrešnom lozinkom, Google login i proveru stiže li toast.
- Ocena: PLATINUM spreman za ručni test.

# Oppsett (det du må gjøre selv)

Fase 1: steg 1–4. Fase 2 (Rubens ukeplan): steg 5.

Alt her er gratis. Regn med ca. 1 time første gang.
**Gyldne regel:** Nøkler og passord limes bare inn i Supabase, Vercel eller fila `.env.local` på Macen din. Aldri i chat, aldri i koden.

Ha en passordbehandler klar (f.eks. iCloud-nøkkelring) til å lagre det du lager underveis.

---

## 1. Supabase (database + innlogging)

1. Gå til **supabase.com** → *Start your project* → logg inn med GitHub eller e-post.
2. *New project*:
   - Name: `treningsapp`
   - Database password: trykk *Generate*, og lagre det i passordbehandleren.
   - Region: **North EU (Stockholm)**
   - Trykk *Create new project* og vent et par minutter.

### 1a. Lag tabellene
1. Venstremenyen → **SQL Editor** → *New query*.
2. Åpne fila `supabase/migrations/0001_init.sql` (i Treningsapp-mappa), kopier alt, lim inn, trykk **Run**.
3. Du skal se «Success. No rows returned».

### 1b. Steng døra for fremmede
**Authentication → Sign In / Providers**
- *Allow new users to sign up*: **AV** (viktigst av alt).
- *Email*: på. *Confirm email*: på.

**Authentication → Passwords** (eller *Attack Protection*)
- Minimum password length: **12**.
- *Prevent use of leaked passwords*: på hvis det finnes (krever betalt plan – hopp over hvis den er grå).

**Authentication → URL Configuration**
- Site URL: `https://dittdomene.no` (ditt ekte domene – kan endres senere)
- Redirect URLs → *Add URL*: `https://dittdomene.no/**` og `http://localhost:3000/**`

### 1c. E-postmalene (så lenkene fungerer på iPhone)
**Authentication → Emails → Templates**
- **Invite user**: bytt ut `{{ .ConfirmationURL }}` i malen med
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/nytt-passord`
- **Reset Password**: bytt ut `{{ .ConfirmationURL }}` med
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nytt-passord`
- Trykk *Save* på begge.

> **Merk om e-post:** Supabase sin innebygde e-post sender bare til medlemmer av ditt eget Supabase-team, og bare noen få i timen. Invitasjon til deg selv virker, men **Ruben får ikke e-post** før du kobler til en egen e-posttjeneste (f.eks. Resend, gratis – det setter vi opp sammen i en senere fase når domenet er på plass). Bruk plan B under for Ruben i mellomtiden.

### 1d. Lag kontoene til deg og Ruben
**Authentication → Users → Add user**
- **Deg:** *Send invitation* → din e-post. Klikk lenken i e-posten → velg passord (minst 12 tegn).
- **Ruben (plan B):** *Create new user* → Rubens e-post + et midlertidig passord, kryss av *Auto Confirm User*. Gi ham passordet muntlig/SMS. Etter første innlogging går han til `https://dittdomene.no/nytt-passord` og velger sitt eget.

### 1e. Koble kontoene til roller
1. SQL Editor → *New query*.
2. Åpne `supabase/seed_users.sql`, kopier alt, lim inn.
3. Bytt ut `MIGUEL_EPOST_HER` og `RUBEN_EPOST_HER` (i hele teksten) med de ekte e-postene.
4. **Run**. Nederst skal du se Miguel = athlete og Ruben = coach.

### 1f. Bevis at sikkerheten virker
1. SQL Editor → *New query* → lim inn `supabase/tests/rls_test.sql` → **Run**.
2. Alle linjene skal si **PASS**. (Testen endrer ingenting.)

### 1g. Hent nøklene (ikke del dem med noen)
**Project Settings → API Keys** (og *Data API* for URL-en):
- **Project URL** – ser ut som `https://abcd1234.supabase.co`
- **Publishable key** – starter med `sb_publishable_` (gammel variant heter *anon*)
- **Secret key** – starter med `sb_secret_` (gammel variant heter *service_role*). Denne er hemmelig!

Ha fanen åpen – du trenger dem i steg 3.

---

## 2. GitHub (privat lagring av koden)

1. Lag konto på **github.com** hvis du ikke har.
2. Last ned **GitHub Desktop** fra desktop.github.com og logg inn.
3. *File → Add Local Repository…* → velg mappa `Desktop/Treningsapp`.
   (Jeg har allerede gjort mappa klar med første «commit».)
4. Trykk **Publish repository**. Navn: `treningsapp`. **Kryss av «Keep this code private».** Publish.

`.env`-filer blir aldri lastet opp – det er sperret i `.gitignore`.

---

## 3. Vercel (nettsiden)

1. Gå til **vercel.com** → *Sign Up* → *Continue with GitHub* (velg Hobby = gratis).
2. *Add New… → Project* → velg `treningsapp` → *Import*.
3. Åpne **Environment Variables** og legg inn tre stykker (navn til venstre, verdi fra Supabase til høyre):

   | Navn | Verdi |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_SECRET_KEY` | Secret key – slå på **Sensitive** |

4. Trykk **Deploy**. Etter ca. ett minutt får du en adresse som `treningsapp-xxx.vercel.app`. Den virker allerede.

### 3a. Ditt eget domene
1. Vercel → prosjektet → **Settings → Domains** → skriv domenet ditt → *Add*.
2. Vercel viser én eller to DNS-linjer (typisk en **A**-post `76.76.21.21` for `dittdomene.no` og en **CNAME** `cname.vercel-dns.com` for `www`).
3. Logg inn der du kjøpte domenet (Domeneshop, One.com, GoDaddy …) → DNS-innstillinger → legg inn nøyaktig det Vercel viser.
4. Vent 5 min – 1 time. Når Vercel viser grønn hake, er HTTPS ordnet automatisk.
5. Gå tilbake til Supabase → *URL Configuration* og sjekk at Site URL er det ekte domenet.

---

## 4. Test fase 1

- [ ] Gå til domenet. Du ser «You are an Ironman.» og ingen demo-knapper.
- [ ] Logg inn som deg → du havner på **Hjem**. Fanene er Hjem · Trening · Soner · Progresjon · SoMe.
- [ ] Skriv `/ukeplan` bak domenet → du blir sendt tilbake til Hjem.
- [ ] Ruben logger inn → havner på **Ukeplan** (Ukeplan · Økter · Varsler · Miguel). `/hjem` sender ham tilbake.
- [ ] Feil passord 6 ganger på rad → samme melding «Feil e-post eller passord», og 6. gang slipper du ikke inn selv med riktig passord (sperren varer 15 min).
- [ ] Tannhjulet (mobil) / navnet ditt nede til venstre (PC) → Innstillinger → bytt Lys/Mørk/System → Logg ut.
- [ ] **iPhone:** åpne domenet i Safari → Del-knappen → *Legg til på Hjem-skjerm*. Ikonet er logoen, og appen åpner i fullskjerm, mørk.

Fungerer alt? Si fra, så starter vi fase 2 (Rubens ukeplan).

---

## 5. Fase 2 – Rubens ukeplan

Gjøres én gang. Filene kan kjøres på nytt uten å ødelegge noe.

1. Supabase → **SQL Editor** → *New query* → lim inn hele `supabase/fase2_kjor_denne.sql` → **Run**. (Den inneholder både 0002 og seed_plan.)
   Nederst skal du se omtrent: templates 12 · planned 312 · progression_rows 130 · blocks 7 · focus_days 182.
2. *New query* → lim inn `supabase/tests/rls_test.sql` → **Run**. Alle linjene skal si **PASS**.

### Test fase 2 (logg inn som Ruben)
- [ ] **Ukeplan** viser «Uke 1 · Grunnlag 1 · 26. okt – 1. nov» med økter hver dag. ‹ › blar uker (sveip på mobil).
- [ ] Svømmeøktene er skjult før januar, og linja «Svømming pauset til januar (skulder)» vises.
- [ ] Skriv i «Dagens fokus» på en dag, bytt uke og tilbake → teksten er lagret.
- [ ] Trykk på «Rolig langtur» → still hjulet, velg «+5 km», «Alle kommende uker» → neste uke viser 5 km mer.
- [ ] «+» på en dag → Sykkel → Ny økt → bygg med «+ Del» → «Bare denne dagen». Økta dukker opp.
- [ ] Dra en økt til en annen dag (PC). På mobil: trykk økta → velg dag under «Dag» → lagre.
- [ ] «Kopier uke til…» → «Neste uke» → Kopier. Merk: øktene i ukene du velger blir **erstattet**.
- [ ] **Økter**-fanen: «+ Ny økt» lagrer i biblioteket. Trykk en innebygd økt → endre notat/innendørsalternativ.

---

## Valgfritt: kjøre appen på Macen
Lag fila `.env.local` i Treningsapp-mappa (kopier `.env.example`) og fyll inn de tre verdiene. Fila lastes aldri opp. Da kan jeg teste mot din ekte database lokalt uten at du limer nøkler i chatten.

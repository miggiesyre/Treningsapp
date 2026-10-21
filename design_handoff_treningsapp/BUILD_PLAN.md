# Build plan: Treningsapp

## Stack (free tiers)
- **Next.js 15 (App Router) + TypeScript**, Tailwind optional. Use CSS variables for the tokens in the README.
- **Supabase**: Postgres, Auth, Row Level Security; `@supabase/ssr` for cookie sessions.
- **Vercel**: hosting, custom domain, HTTPS, cron, encrypted env vars.
- **Private GitHub repo** connected to Vercel. Previews come from branches; `main` deploys to production.
- **PWA**: `app/manifest.ts`, apple-touch-icon, `apple-mobile-web-app-capable`, theme colour #1A1A1C.

## Security rules (non-negotiable)
1. No secrets in code or the repo. `.env*` goes in `.gitignore`, and a `.env.example` lists the names only.
2. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` reach the browser. The anon key is safe to expose because RLS protects the data.
3. `SUPABASE_SERVICE_ROLE_KEY`, `STRAVA_CLIENT_SECRET`, `GARMIN_EMAIL`, `GARMIN_PASSWORD`, `CRON_SECRET` and `TOKEN_ENC_KEY` live only as Vercel env vars, marked **Sensitive**. Only server code may read them (route handlers, server actions, cron), never client components.
4. Supabase Auth: **disable public sign-ups**, create Miguel and Ruben through **Invite user**, and require email confirmation. Turn on **leaked-password protection**, and set a minimum length of at least 12.
5. Row Level Security is **enabled on every table** (see `phase1/schema.sql`). Tables without policies are closed by default.
6. Integration tokens (Strava refresh token, Garmin session) are stored AES-GCM-encrypted with `TOKEN_ENC_KEY`, in a table with RLS enabled and **no** user policies, so only the service role can read them.
7. Rate limiting:
   - Supabase Auth's built-in limits stay on; tighten them under Auth → Rate Limits.
   - The login server action also has a small per-IP limiter: 5 attempts per 15 minutes. Use Upstash Redis's free tier or a Postgres table.
8. Security headers in `next.config.ts`: HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a basic CSP. Vercel serves HTTPS only.
9. The role always comes from `profiles.role` in the database, never from the client.

## Roles and routing
- After login, middleware reads the session and fetches `profiles.role`:
  - `athlete` → `/hjem` (tabs: `/hjem`, `/trening`, `/progresjon`).
  - `coach` → `/ukeplan` (tabs: `/ukeplan`, `/okter`, `/varsler`, `/miguel`).
- A user who opens the other role's routes is redirected to their own home.

## Data model (summary; full SQL in phase1/schema.sql)

| Table | Contents |
|---|---|
| profiles | id = auth user, role, name |
| coach_athlete | links a coach to an athlete |
| settings | race name/date, plan start, swim paused until |
| blocks | name, goal, week_from–week_to |
| session_templates | "Mine økter": sport, name, parts JSON, exercises JSON, indoor_alt, short_version, note, main_param |
| planned_sessions | athlete, date, template, position, overrides (value, note, indoor_alt), optional flag |
| progression | per athlete, week and parameter key (longBike, brickRun, z3, thrPace, sets) → value |
| day_focus | per day, set by the coach |
| session_changes | moved / shortened / indoor / skipped, reason, to_date, coach decision |
| checkins | weight, sleep_score, sleep_hours, vo2max, hrv, resting_hr (all nullable), source, date |
| strength_logs | per set: exercise, set number, kg, reps |
| activities | Strava/Garmin activity, matched_session_id |
| tests | FTP / VO2 max |
| goals | km per week per sport |
| injuries | date, body part, status, comment |
| comments | per planned session |
| integration_secrets | encrypted tokens, service role only |

## Integrations

**Strava** (phase 4, the reliable backup):
- OAuth (scope `activity:read_all`), with the refresh token stored encrypted.
- A webhook at `/api/strava/webhook` (GET verify, POST event). The event is processed in a server function.
- Auto-match: same date plus the same sport, choosing the closest planned duration. Unmatched activities show up as "Ekstra økt".

**Garmin** (phase 4, personal use):
- There is no official public API for individuals. `python-garminconnect` / `garth` are **unofficial**, can break when Garmin changes its login, and may conflict with Garmin's terms. The owner accepts this for personal use.
- Run them as a **Vercel Python function** (`api/garmin/sync.py`) or in a small separate worker. Vercel Cron runs at 06:00 and every 30 minutes; the Hobby plan limits cron frequency, so 30-minute polling may need a GitHub Actions schedule calling the endpoint with `CRON_SECRET`.
- Credentials come from env vars, and the session token is cached encrypted in `integration_secrets` to avoid logging in every time.
- Fetch: sleep score and duration, weight, VO2 max, HRV, resting HR, new activities. Upsert into `checkins` with `source='garmin'`; manual values win on the same day.
- Push workouts: convert `session_templates.parts` into a Garmin structured workout (warm-up / interval with repeat / recovery / cool-down, with targets for power, pace, HR zone or cadence) and schedule it on the planned date. On failure, mark it in `settings.garmin_status`, and show the small warning "Garmin-synk feilet – bruker Strava og manuell innsjekk".

## Phases (stop and test after each)
1. **Setup:** repo, Next.js, Supabase project, schema + RLS, invited users, login, role routing, PWA shell, Vercel on the custom domain. → `phase1/PHASE1.md`
2. **Coach:** Ukeplan (week view, ‹ ›, drag & drop, "+" flow, Ny økt builder with wheels), Mine økter, Kopier uke til…, blocks, progression ("Øk hver uke med").
3. **Athlete:** Hjem (ring, check-in wheels, I dag, Denne uka), session page, Bytt økt (→ session_changes and coach notification), strength logger.
4. **Garmin + Strava sync.**
5. **Rest of the app:** Progresjon charts, injury log, Varsler (decision modal), comments with realtime (Supabase Realtime on `comments` and `session_changes`).
6. **Polish:**
   - Logo, and a login screen with the tagline "You are an Ironman."
   - Dark mode by default and real-date handling.
   - Seed data from Ruben's spreadsheet, which was **not included in this handoff**. Ask the owner for it, or use the example week from the prototype.

## Testing checklist per phase
- An RLS test: log in as Miguel and try to read another athlete's rows; this must return 0 rows. Ruben can read only his linked athletes.
- No secret strings in the bundle: `grep -r "service_role\|STRAVA_CLIENT_SECRET" .next/static` must be empty.
- Lighthouse PWA installable; works at 375 px and at ≥ 1280 px.

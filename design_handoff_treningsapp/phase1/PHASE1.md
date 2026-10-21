# Phase 1: setup, login, roles, RLS, deploy

Goal: Miguel and Ruben can log in on the custom domain over HTTPS, land on their own (still empty) home tab, and RLS is proven. Nothing else yet.

## 1. Accounts (owner does this; never paste keys into chat or code)
1. GitHub: create a **private** repo, `treningsapp`.
2. Supabase: create a new project in region **eu-north-1 (Stockholm)**, then:
   - Authentication → Providers → Email: on, "Confirm email" on.
   - Authentication → Settings: **disable "Allow new users to sign up"**.
   - Leaked password protection: on. Minimum password length: 12.
   - Auth → URL configuration: Site URL `https://<domain>`, and redirect URLs `https://<domain>/auth/callback` plus `http://localhost:3000/auth/callback`.
   - Rate limits: keep the defaults or tighten them (e.g. 5 sign-in attempts per 5 minutes per IP).
3. Vercel: import the repo and add the custom domain (DNS: A/ALIAS or CNAME as Vercel shows).

## 2. Scaffold
```bash
npx create-next-app@latest treningsapp --ts --app --eslint --src-dir --no-tailwind
cd treningsapp
npm i @supabase/supabase-js @supabase/ssr
```
`.gitignore` must contain `.env*` with an exception for `!.env.example`.

`.env.example` (names only, no values):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
- Locally: put the real values in `.env.local`, which is never committed.
- On Vercel: Project → Settings → Environment Variables. Mark `SUPABASE_SERVICE_ROLE_KEY` as **Sensitive** and use it only in server code.

## 3. Database
Run `schema.sql` in the Supabase SQL editor. Then, in Auth → Users, choose **Invite user** for Miguel and for Ruben, and run the commented insert statements at the bottom of the file with their UUIDs.

## 4. Supabase clients
- `src/lib/supabase/server.ts`: `createServerClient` from `@supabase/ssr`, using `cookies()` from `next/headers`.
- `src/lib/supabase/client.ts`: `createBrowserClient`, anon key only.
- Never import the service-role client into anything under `app/` that renders on the client. Keep it in `src/lib/supabase/admin.ts`, starting with `import 'server-only'`.

## 5. Middleware: session refresh and role routing
`src/middleware.ts`:
- Refresh the Supabase session (the standard `@supabase/ssr` middleware pattern).
- If there is no user and the path is not `/login` or `/auth/*`, redirect to `/login`.
- If there is a user, read `profiles.role`, once per request through the server client.
  - `athlete` may use `/hjem`, `/trening`, `/progresjon`, `/okt/*`; anything else redirects to `/hjem`.
  - `coach` may use `/ukeplan`, `/okter`, `/varsler`, `/miguel`; anything else redirects to `/ukeplan`.
- matcher: everything except `_next/static`, `_next/image`, icons, `manifest.webmanifest`.

## 6. Login
- `/login`: logo (large), the tagline "You are an Ironman.", and email + password fields.
  - Use a server action that calls `supabase.auth.signInWithPassword`.
  - Styled as in the prototype: inputs are 52 px tall with radius 14 on `--card`, and the button is ink-filled.
  - Error copy: "Feil e-post eller passord".
  - Include a "Glemt passord?" link that sends a reset email.
- Rate-limit inside the server action: 5 attempts per IP per 15 minutes. Use Upstash Redis's free tier, or a `login_attempts` table written with the service role. Return the same generic error message every time.
- `/auth/callback`: exchange the code for a session (used by the invite and reset links), then redirect to `/`. `/` redirects by role.
- Logg ut: a server action that calls `signOut()`, then redirects to `/login`.

## 7. App shell (empty screens, real navigation)
- `src/app/(athlete)/layout.tsx` and `src/app/(coach)/layout.tsx`:
  - Sidebar (≥ 900 px, 228 px wide, logo at the top, nav items, avatar + Innstillinger at the bottom).
  - Bottom tab bar on mobile (3 or 4 columns, a 22×3 indicator above the label, safe-area padding).
  - Exact tokens from the README, defined as CSS variables on `:root` and `[data-theme="dark"]`. Dark is the default; store the theme in `settings.theme`.
- Each tab page shows only its large title (34/700) for now.

## 8. PWA
- `src/app/manifest.ts`: name "Tri 70.3", `display: "standalone"`, `background_color` and `theme_color` #1A1A1C, icons 192/512 (from `assets/icon-512.png`).
- `layout.tsx` metadata:
  - `appleWebApp: { capable: true, title: 'Tri 70.3', statusBarStyle: 'black-translucent' }`.
  - `icons.apple: '/icon-180.png'`, `icons.icon: '/logo.svg'`.
- Viewport: `viewport-fit=cover`.

## 9. Security headers (`next.config.ts`)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- CSP: `default-src 'self'; connect-src 'self' https://<project>.supabase.co wss://<project>.supabase.co; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'`. Tighten this later with nonces.

## 10. Deploy and test
- Push to `main`; Vercel builds. Check the custom domain loads over HTTPS and that HTTP redirects.
- Test checklist:
  - [ ] Miguel logs in and lands on `/hjem`; he gets redirected away from `/ukeplan`.
  - [ ] Ruben logs in and lands on `/ukeplan`; he gets redirected away from `/hjem`.
  - [ ] Signing up through the API is refused (sign-ups disabled).
  - [ ] Six wrong passwords in a row produce the generic error, then a block.
  - [ ] In the browser console, as Miguel, `supabase.from('profiles').select()` returns only Miguel and Ruben, and `from('integration_secrets').select()` returns 0 rows.
  - [ ] `grep -r "service_role" .next/static` finds nothing.
  - [ ] Add to Home Screen on iPhone shows the logo icon and opens standalone in dark mode.

**Stop here** and let the owner test before Phase 2.

# Treningsapp

Training app for Miguel (Ironman 70.3 Venice-Jesolo, 24 Apr 2027) and coach Ruben.
Next.js 15 + TypeScript, Supabase (Postgres, Auth, RLS), Vercel. UI in Norwegian.

- Setup steps for the owner (Norwegian): [OPPSETT.md](OPPSETT.md)
- Design spec and phases: [design_handoff_treningsapp/](design_handoff_treningsapp/README.md) – the v8 prototype in `prototype/Treningsapp v8.dc.html` is the source of truth.
- Database: `supabase/migrations/` (run in order), `supabase/seed_users.sql`, `supabase/tests/rls_test.sql`.

## Structure
- `src/middleware.ts` – session refresh + role routing (role always read from `profiles`).
- `src/app/(athlete)` – Hjem, Trening, Soner, Progresjon, SoMe. `src/app/(coach)` – Ukeplan, Økter, Varsler, Miguel.
- `src/app/actions/auth.ts` – login (rate-limited per IP via `login_attempts`), reset, new password, logout, theme.
- `src/lib/supabase/admin.ts` – secret-key client, server only.

## Commands
```
npm run dev            # local, needs .env.local
npm run build
npm run check:secrets  # after build: no secrets in the browser bundle
```

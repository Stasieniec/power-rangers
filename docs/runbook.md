# Polymath — Runbook

## URLs

- Production: https://polymath-prod.workers.dev
- Staging: https://polymath.workers.dev
- D1 console: https://dash.cloudflare.com/d1
- Clerk dashboard: https://dashboard.clerk.com

## Local dev

1. `pnpm install`
2. Copy `.env.example` → `.env.local`, fill keys.
3. `pnpm dev` (port 3000) or `pnpm preview` (port 8787, with bindings).

## Deploy

- Staging: `pnpm deploy:staging` (or auto on push to `main`).
- Production: `pnpm deploy:prod`. Then `git tag -f demo && git push -f origin demo`.

## Database

- Generate migration: `pnpm db:generate`
- Apply (staging): `pnpm db:migrate:staging`
- Apply (prod): `pnpm db:migrate:prod`
- Browse: `pnpm db:studio`
- Direct: `wrangler d1 execute polymath-prod --remote --command="..."`

## Seed (production demo data)

```
SEED_SECRET=<value> pnpm seed:prod
```

Verifies ~30 seconds. Look for `{ ok: true, log: [...] }` in output.

## Pre-demo warm-up (T-30)

```
SEED_SECRET=<value> pnpm warm-up:prod
```

Pre-loads OpenAlex KV + AI-1 cache for the demo's known inputs.

## Demo-day fallbacks

Every page that runs live AI honors `?demo=fallback`:

- `/onboard?demo=fallback` → instant profile build (cached response)
- `/projects/new?demo=fallback` → instant question generation
- `/projects/p1/apply?demo=fallback` → instant match scoring
- `/projects/p2/report?demo=fallback` → instant translation cards

Setting the query once writes a 4-hour cookie; all subsequent AI calls in that session are short-circuited. To exit fallback mode, clear cookies or close incognito window.

## Demo-day checklist (T-60 minutes)

- [ ] `pnpm seed:prod` (resets D1 to clean demo state)
- [ ] Verify Alice's account is _not_ onboarded (check `/researchers` or `wrangler d1 execute polymath-prod --remote --command="SELECT * FROM researchers WHERE user_id='user_alice'"` returns nothing)
- [ ] `pnpm warm-up:prod` (T-30)
- [ ] Sign in to both browsers (one Alice, one MedScan); confirm dashboards load
- [ ] Test: open `/onboard?demo=fallback` once to set the cookie. Now all subsequent AI is instant.
- [ ] **Disable fallback before going on stage** (close that incognito window) — we want LIVE AI for the demo.
- [ ] Verify network is stable (run a test ORCID lookup)

## Failure recovery during demo

- AI hangs > 10s: silently swap to the fallback tab (which has `?demo=fallback` set).
- D1 errors: refresh once. If still failing, switch to staging (rare — same data is there).
- Clerk session expires: re-login is fast; don't panic.

## Post-demo

- Reset prod with another `pnpm seed:prod` if you'd like the demo accessible later.
- Tag the commit: `git tag demo-final && git push origin demo-final`.

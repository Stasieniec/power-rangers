# Polymath — Runbook

## URLs

- App: **https://polymath.power-rangers.workers.dev** (single environment)
- Cloudflare D1: https://dash.cloudflare.com/d1
- Clerk dashboard: https://dashboard.clerk.com (only relevant for real auth, not the demo path)

## Local dev

```bash
pnpm install
cp .env.example .env.local   # fill in CLERK_*, GEMINI_API_KEY, OPENALEX_EMAIL, SEED_SECRET
pnpm dev                      # http://localhost:3000 — Next dev server
pnpm preview                  # http://localhost:8787 — Cloudflare-emulated, with bindings
```

## Quality gates

```bash
pnpm typecheck   # strict TS
pnpm lint        # ESLint flat config
pnpm test        # vitest, 24 tests
pnpm build       # next build
```

All four must pass before any commit. Husky's pre-commit hook runs lint + prettier on staged files.

## Deploy

```bash
pnpm ship           # opennextjs-cloudflare build && wrangler deploy
```

(`pnpm deploy` collides with a built-in pnpm command; use `pnpm ship` or `pnpm run deploy`.)

The deploy uses the top-level wrangler config — single worker, single set of secrets, single D1/R2/KV.

## Database

```bash
pnpm db:generate    # generate Drizzle migration after schema change
pnpm db:migrate     # apply pending migrations to remote D1
pnpm db:studio      # browse data in your browser

# Direct queries
wrangler d1 execute polymath-staging --remote --command="SELECT id, role, display_name FROM users"
```

> The D1 database is named `polymath-staging` because that was the original wrangler.toml name from when there were two envs. We collapsed the envs but kept the database name to avoid migrating data. It's the only database — don't be confused by the suffix.

## Seed (populate demo data)

```bash
# Triggers /api/admin/seed on the worker. Wipes + repopulates D1.
SEED_SECRET=<value> curl -X POST \
  "https://polymath.power-rangers.workers.dev/api/admin/seed?secret=$SEED_SECRET" | jq

# or:
SEED_SECRET=<value> pnpm seed
```

The seed:

- Wipes all 14 tables.
- Inserts 6 researcher users (real names: Daphne Koller, Andrew Ng, Nigam Shah, Atul Butte, Pranav Rajpurkar, Eran Halperin), the MedScan company, 4 teams, 2 projects, 3 prior reports.
- Reads pre-bundled OpenAlex payloads (`scripts/fixtures/openalex-bundle.json`, ~219KB). Does NOT call OpenAlex from the worker — Cloudflare Workers' egress IPs get rate-limited aggressively by OpenAlex.
- Calls Gemini for: AI-2 summaries (6×), AI-1 questions (2×), AI-3 rationale (2×), AI-4 translation (3×). Total ~13 Gemini calls. Takes 60–90s.
- Returns `{ "ok": true, "log": [...] }` on success.

If it fails partway, just rerun. The wipe is the first step so it's idempotent.

## Demo-day flow

For the live walk-through, **do not use Clerk auth**. Use the demo door:

1. Visit `/demo`.
2. Click a persona — the worker sets `polymath-demo-user` cookie (httpOnly, 4h TTL) and redirects to `/dashboard`.
3. Auth-gated views (manage, alignment dashboard, report submission) all work transparently.
4. Click "Exit demo" in the nav (gold) when done.

The demo cookie only allows impersonation of the 7 hardcoded synthetic IDs in `lib/auth/current-user.ts`. Real Clerk users can never be impersonated.

## Pre-demo warm-up (T-30 minutes)

```bash
SEED_SECRET=<value> pnpm warm-up
```

Pre-runs the AI-1 call against the demo project's input. The first cold-start Gemini call from a Worker can be 10s+; warming gets it under 5s.

## Demo-day checklist

**T-60:**

- [ ] Re-seed if the database has been dirtied: `pnpm seed`
- [ ] Verify `/projects` shows MedScan's open project.
- [ ] Walk through `docs/demo-script.md` once, end to end. Time it.

**T-30:**

- [ ] Run `pnpm warm-up` to pre-fire AI-1.
- [ ] Open the laptop's browser to https://polymath.power-rangers.workers.dev/ in incognito. Don't navigate further.
- [ ] Have the sample business-plan paragraph in your clipboard (see demo-script).
- [ ] Phone hot-spot ready as backup wifi.

**T-5:**

- [ ] Final test of the demo door — click MedScan, see dashboard.
- [ ] **Click "Exit demo" before going on stage** so the demo flow starts fresh.

## Demo-day fallbacks

Every page that runs live AI honors `?demo=fallback`:

- `/onboard?demo=fallback` → instant profile build (cached response)
- `/projects/new?demo=fallback` → instant question generation
- `/projects/{id}/apply?demo=fallback` → instant match scoring
- `/projects/{id}/report?demo=fallback` → instant translation cards

Setting the query once writes a 4-hour cookie; all subsequent AI calls short-circuit. To exit fallback mode, clear cookies or close the window.

**Use only as recovery during a hang** — the live AI moments are the demo's main attraction.

## Failure recovery during demo

| Symptom                        | Action                                                              |
| ------------------------------ | ------------------------------------------------------------------- |
| AI-1 hangs > 8s                | URL bar: append `?demo=fallback`, reload, retry.                    |
| Demo door shows 500            | Reload `/demo`. If still broken, sign-up via Clerk works as backup. |
| `/projects` shows "0 projects" | Cut to slides. Re-run `pnpm seed` in the background.                |
| D1 transient error             | One refresh usually fixes it.                                       |
| Cookie sticky after exit demo  | Open a fresh incognito window.                                      |

## Architecture (one-liner reminders)

- **Auth:** unified `getCurrentDbUser()` in `lib/auth/current-user.ts`. Reads `polymath-demo-user` cookie first, falls back to Clerk. Used by every page + server action.
- **AI:** every Gemini call goes through `generate(schema, opts)` in `lib/ai/gemini.ts`. Validates with Zod. Retries 3× on 429/5xx/schema-mismatch.
- **OpenAlex:** pre-fetched at build time in `scripts/fixtures/openalex-bundle.json`. Workers don't hit OpenAlex live (rate-limited).
- **DB:** Drizzle schema in `lib/db/schema.ts`. 14 tables. Access via `getDb()` which reads the D1 binding.
- **Demo door:** `/demo` page → `enterDemoAs(userId)` action → cookie set → redirect to `/dashboard`. Middleware skips Clerk's `auth.protect()` when the cookie is present.

## Post-demo

- Reset DB if you want the live URL to match the demo afterwards: re-run `pnpm seed`.
- Tag the demo commit: `git tag demo-final && git push origin demo-final`.
- The `SEED_SECRET` is in `/tmp/polymath-seed-secret` (or in 1Password if we ever rotate).

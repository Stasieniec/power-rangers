# Polymath — Runbook

## Local dev

1. `pnpm install`
2. Copy `.env.example` to `.env.local`, fill in keys.
3. `pnpm dev` — Next.js dev server at http://localhost:3000.
4. `pnpm preview` — Cloudflare-emulated preview at http://localhost:8787.

## Deploys

- Staging: auto-deploys on merge to `main`.
- Production: `pnpm deploy:prod` or `gh workflow run deploy.yml -f env=production`.
- After deploy, tag the demo commit: `git tag demo && git push origin demo`.

## Database

- Generate migration after schema change: `pnpm db:generate`
- Apply to staging: `pnpm db:migrate:staging`
- Apply to production: `pnpm db:migrate:prod`
- Browse: `pnpm db:studio`
- Direct query: `wrangler d1 execute polymath-staging --command="SELECT ..." --remote`

## Demo procedure (TO BE FILLED IN BY PLAN 7)

## Demo-day fallbacks

Every live AI moment supports `?demo=fallback` query param. (Wired in Plan 7.)

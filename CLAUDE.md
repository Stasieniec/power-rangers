# Polymath — agent context

This file is read by Claude Code (and similar agents) at the start of a session. Keep it short and current.

## Stack

- Next.js 15 App Router on Cloudflare Workers via `@opennextjs/cloudflare`
- D1 (Drizzle), R2, KV bound at the Worker level
- Clerk for auth (`middleware.ts`)
- Gemini 3 Flash via `lib/ai/gemini.ts` — every AI call goes through the typed `generate(schema, opts)` wrapper
- Tailwind v4 with `@theme` tokens in `app/globals.css`
- shadcn/ui primitives in `components/ui/*` (overridden, committed)

## Conventions

- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Server actions for mutations. Route handlers only for webhooks and public read APIs.
- Drizzle schema in `lib/db/schema.ts` is the source of truth for the data model. Never edit migrations directly; regenerate with `pnpm db:generate`.
- All AI outputs validated by Zod schemas in `lib/ai/schemas.ts`.
- IDs are UUID v7 (`uuidv7()`).
- Time is `unixepoch() * 1000` (ms since epoch).

## Don'ts

- Don't add Node-only deps without verifying Worker compatibility.
- Don't bypass the Gemini wrapper for raw LLM calls.
- Don't hand-write migrations.
- Don't add tests outside `tests/lib/ai/*`, `tests/lib/openalex/*`, `tests/lib/match/*` unless explicitly planned (per spec §9).

## Plans

Active plans live in `docs/superpowers/plans/`. Read the relevant one before changes. The design spec is `docs/superpowers/specs/2026-04-29-polymath-design.md`.

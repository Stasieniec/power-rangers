# Polymath — Design Spec

**Date:** 2026-04-29
**Team:** Power Rangers (4 people)
**Timeline:** ~1.5 weeks to demo
**Status:** Approved, ready for implementation planning

---

## 1. Product summary

**Polymath** is a two-sided platform that turns business problems into structured research competitions. Companies post end-goals; an AI translation layer converts them into research questions. Research teams — built from real publication data — compete for projects. A weekly-report alignment dashboard translates technical progress back into business language.

**Three pillars** (from the pitch deck):

1. **Project Posting** — companies submit a business plan + end-goal; AI generates research questions.
2. **Application Process** — research teams form, profiles auto-build from publications, teams apply with AI-scored match.
3. **Communication & Alignment Environment** — weekly research reports translated into business-language dashboard cards.

**Hero AI moments** (judges will see these live):

- **A** — Business plan → research questions (Pillar 1)
- **B** — Researcher profile auto-build from OpenAlex (Pillar 2)
- **D** — Match scoring + rationale (Pillar 2)
- **C** — Weekly report → business translation cards (Pillar 3, included as a third pillar but secondary on demo)

**Hackathon judging targets:**

| Criterion                | Points | How we earn                                                                                                                          |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Innovation & Ingenuity   | 30     | Four creative AI moments, real concept-overlap math under the matching rationale, bidirectional translation as the platform's thesis |
| Technical Implementation | 30     | Cloudflare-native stack (Workers + D1 + R2 + KV), live OpenAlex integration, typed end-to-end, real signal feeding AI rationale      |
| Impact & Utility         | 20     | Cross-environment integration with OpenAlex; a real workflow companies and researchers could use                                     |
| Quality of Communication | 20     | Editorial visual identity, polished demo script, the platform itself reads professionally                                            |

---

## 2. Tech stack

| Concern         | Pick                                                                          |
| --------------- | ----------------------------------------------------------------------------- |
| Framework       | Next.js 15 (App Router, RSC, server actions)                                  |
| Runtime         | Cloudflare Workers via `@opennextjs/cloudflare`                               |
| Language        | TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Styling         | Tailwind v4 (CSS-first, `@theme` block)                                       |
| UI primitives   | shadcn/ui (overrides committed in `components/ui/*`)                          |
| Database        | Cloudflare D1 (SQLite) via Drizzle ORM                                        |
| Object storage  | Cloudflare R2 (logos, report attachments)                                     |
| Cache           | Cloudflare KV (OpenAlex responses, AI idempotency)                            |
| Auth            | Clerk (`@clerk/nextjs` middleware)                                            |
| AI              | Gemini 3 Flash (REST from Workers, JSON response mode)                        |
| Validation      | Zod (forms, AI outputs, API boundaries)                                       |
| External data   | OpenAlex API (publications, concepts)                                         |
| Package manager | pnpm                                                                          |

**Architecture:** single Next.js app deployed to Workers. All AI calls happen server-side from server actions. D1/R2/KV accessed via Workers bindings. No separate API service.

---

## 3. Sitemap & page inventory

Two roles selected at signup: **company** and **researcher**. Most pages are role-gated; some are public so deep-links work for judges.

### Public

- `/` — Landing. Hero, three-pillar explainer, demo CTA.
- `/projects` — Browseable list of open projects.
- `/projects/[id]` — Public project page: end-goal, research questions, applicant count.
- `/teams/[id]` — Public team page: members + aggregate expertise.
- `/researchers/[id]` — Public researcher profile: publications, expertise tags, current team.

### Company (auth)

- `/dashboard` — list of their projects + recent applications.
- `/projects/new` — 3-step wizard: business plan → AI question generation → review/edit → publish.
- `/projects/[id]/manage` — application list with match scores + AI rationale; accept one team.
- `/projects/[id]/dashboard` — alignment dashboard (per-question progress + translation cards).

### Researcher (auth)

- `/onboard` — paste ORCID or "Use a demo researcher"; profile auto-builds from OpenAlex.
- `/dashboard` — researcher's teams + projects + invites.
- `/teams/new` — create a team.
- `/teams/[id]` — manage team: invite link, member profiles, aggregate expertise.
- `/projects/[id]/apply` — submit application (gated to team leads of teams without a pending app).
- `/projects/[id]/report` — submit a weekly report (gated to accepted-team members).

### Shared

- `/invite/[code]` — accept a team invite.

**Total: ~14 unique routes.**

---

## 4. Data model (D1 / SQLite via Drizzle)

All tables: `id TEXT PRIMARY KEY` (UUID v7), `created_at INTEGER` (epoch ms), `updated_at INTEGER` where mutable.

### Users & profiles

- **`users`** — Clerk mirror. `clerk_id` (unique), `email`, `role` (`company` | `researcher`), `display_name`. Inserted via Clerk webhook + read-through upsert in server actions (covers webhook lag).
- **`companies`** — `owner_user_id` (FK), `name`, `description`, `website`, `logo_url` (R2). One per company user.
- **`researchers`** — `user_id` (FK), `openalex_id` (nullable), `orcid` (nullable), `affiliation`, `headline`, `ai_summary`. Created during `/onboard`.
- **`publications`** — `researcher_id`, `openalex_work_id`, `title`, `year`, `venue`, `abstract`, `citation_count`, `doi`. Populated from OpenAlex.
- **`researcher_concepts`** — `researcher_id`, `concept` (string), `score` (REAL 0-1). Cached from OpenAlex; drives matching.

### Teams

- **`teams`** — `name`, `description`, `created_by_user_id`.
- **`team_members`** — `team_id`, `user_id`, `role` (`lead` | `member`), `joined_at`. Composite unique `(team_id, user_id)`.
- **`team_invites`** — `team_id`, `code` (random URL-safe), `invited_email` (nullable), `expires_at`, `used_by_user_id` (nullable).

### Projects

- **`projects`** — `company_id`, `title`, `business_plan` (markdown), `end_goal`, `status` (`draft` | `open` | `in_progress` | `completed`), `accepted_team_id` (nullable).
- **`research_questions`** — `project_id`, `question`, `rationale`, `order_index`, `ai_generated` (bool default true), `concepts` (JSON array of OpenAlex concept labels with weights — used for matching).

### Applications

- **`applications`** — `project_id`, `team_id`, `status` (`pending` | `accepted` | `rejected`), `match_score` (INTEGER 0-100), `match_rationale` (text, AI), `pitch` (text). Composite unique `(project_id, team_id)`.

### Reports & alignment

- **`reports`** — `project_id`, `team_id`, `week_of` (date), `raw_markdown`, `submitted_by_user_id`.
- **`report_findings`** — `report_id`, `research_question_id`, `finding` (technical, AI), `business_translation` (AI), `impact_note` (AI). One row per finding mapped to a question.
- **`report_files`** — `report_id`, `r2_key`, `filename`, `size`.

### Storage map

- **D1**: all relational data above.
- **R2**: company logos, team avatars, report attachments.
- **KV**: OpenAlex response cache (key: `oa:author:<orcid>`), AI idempotency (key: `ai:<call-name>:<input-hash>`), per-user AI rate-limit counters.

### Explicitly not in schema

- No real-time chat tables, no notifications, no payments.
- No `companies` ↔ `users` many-to-many (one user owns one company in MVP).
- No soft-delete columns.

---

## 5. AI integration map

All four moments call Gemini 3 Flash via a single wrapper (`lib/ai/gemini.ts`) that enforces JSON output via response schema and validates with Zod. Every call is idempotent (KV cache keyed on input hash) unless explicitly bypassed by a "regenerate" button.

### AI-1: Business plan → research questions (Pillar 1, Hero A)

- **Trigger:** `/projects/new` step 2 submission.
- **Input:** `{title, business_plan, end_goal}`.
- **Output:** `{questions: [{question, rationale, order_index, concepts: [{label, weight}]}]}`. Typically 4-7 questions. Concepts are tagged from a controlled vocabulary (we pass OpenAlex's top-level concept list as part of the prompt for vocabulary alignment with Pillar 2).
- **Prompt strategy:** system prompt frames Gemini as "research strategist." Two worked examples in the prompt. Strict JSON schema.
- **UX:** skeleton placeholders during generation; user can edit any question inline before publishing; "regenerate" bypasses cache.
- **Latency budget:** <8s to first paint.
- **Failure mode:** error toast + manual-entry fallback (questions can be hand-typed; publish still works).

### AI-2: Researcher profile build (Pillar 2, Hero B)

Two stitched pieces, both visible during the demo:

**2a — OpenAlex fetch:**

- Input: ORCID (preferred) or `(name + affiliation)`.
- `GET https://api.openalex.org/authors?filter=orcid:<orcid>` (or full-text search).
- Pull last ~20 works via `/works?filter=author.id:<oa-id>&per-page=20&sort=publication_date:desc`.
- Cache to KV by ORCID for 24h.
- Polite-pool header: `mailto:<OPENALEX_EMAIL>`.

**2b — Gemini summarization:**

- Input: author's concept list (already weighted by OpenAlex) + top 5 publication titles/abstracts.
- Output: `{headline: string, summary: string, expertise_tags: [{label, weight}]}`.
- Headline → profile header. Summary → tooltip/profile body. Tags → matching signal.

- **UX:** progressive skeleton — "fetching publications…" then "analyzing expertise…". Total ~5-7s.
- **Failure mode:** OpenAlex miss → manual paper-paste flow (user pastes 2-3 paper links/titles, Gemini works from those).

### AI-3: Match scoring + rationale (Pillar 2, Hero D)

- **Trigger:** team submits application at `/projects/[id]/apply`.
- **Input:** `{project_research_questions (with concepts), team_aggregate_concepts, top_publications_per_member, team_pitch}`.
- **Output:** `{match_score: 0-100, rationale: string, per_question_alignment: [{question_id, score, why}]}`.
- **Scoring math (defensible, not hand-wavey):**
  - Compute weighted concept overlap between project questions and team aggregate concepts (cosine over score-weighted vectors, controlled vocabulary from OpenAlex).
  - This produces a base score 0-100.
  - Gemini is given the base score + the data and writes the rationale, can adjust ±10 with justification (e.g. "the team's pitch addresses the methodological gap not visible in their publications").
  - Final score = clamp(base ± Gemini adjustment, 0, 100).
- **Why this matters for judges:** the AI is _explaining real signal_, not generating a vibes-based number. Solid Innovation + Technical points.
- **UX:** scoring at submit (synchronous, ~6s with skeleton). Rendered on `/projects/[id]/manage` cards.

### AI-4: Weekly report → business translation (Pillar 3)

- **Trigger:** report submission at `/projects/[id]/report`.
- **Input:** `{report_markdown, research_questions, project_end_goal, prior_findings_summary}`.
- **Output:** `{findings: [{research_question_id, finding, business_translation, impact_note}]}`. One per question with progress this week; questions without progress are omitted.
- **UX:** dashboard updates with new translation cards; cards animate in (300ms fade-up, 60ms stagger).
- **Failure mode:** raw report stored regardless; cards just don't render. Report is still readable.

### Cross-cutting

- **Single Gemini wrapper** (`lib/ai/gemini.ts`): `generate<T>(schema: ZodSchema<T>, system: string, prompt: string, opts): Promise<T>`. All AI calls go through it.
- **Idempotency:** every call hashes input and checks KV. "Regenerate" buttons bypass cache.
- **Rate limit:** per-user, 10 generations/hour via KV counter. Cheap insurance.
- **No streaming for MVP**: skeleton UIs feel almost as good and JSON-mode + streaming is finicky.

---

## 6. Demo seed & narrative script

3:30 demo, two browser windows: **Alice (researcher)** and **MedScan (company)**. Most state is seeded; three live AI moments + one optional fourth run on demo day.

### Seeded fixtures (loaded by `pnpm db:seed`)

**Companies:**

- `MedScan Diagnostics` — pre-onboarded. Owns two projects:
  - **P1: "Late-stage clinical trial outcome prediction"** (`status: open`). AI research questions pre-generated. Two competing applications already submitted by seeded teams (with real match scores).
  - **P2: "Patient drop-off risk modeling"** (`status: in_progress`). Accepted team `BioFlux Lab`. Three weekly reports already submitted with translation cards rendered.

**Researchers (Clerk accounts pre-created):**

- `Alice Lead` — account exists, `/onboard` deliberately not completed (we run it live).
- `Bob Member` — fully onboarded with real ORCID, on Convex Lab.
- 4 others populating competing teams + BioFlux Lab. All real ORCIDs, all profiles fetched at seed time and frozen.

**Teams:**

- `Convex Lab` (Alice + Bob) — applies to P1 live.
- `Lattice Sciences`, `Helix Group` — pre-applied to P1.
- `BioFlux Lab` — accepted on P2.

**Reports:** 3 weekly reports on P2 with `report_findings` rows AI-translated at seed time.

### Demo script (3:30)

| Time | Screen                             | What happens                                         | Live AI                  |
| ---- | ---------------------------------- | ---------------------------------------------------- | ------------------------ |
| 0:00 | `/`                                | 10s positioning                                      | —                        |
| 0:10 | Sign in as Alice → `/onboard`      | Paste ORCID (or "demo researcher")                   | **Hero B**               |
| 0:50 | `/teams/convex-lab`                | Show team with Bob, aggregate expertise              | —                        |
| 1:00 | `/projects/p1`                     | Browse to MedScan's project, read AI questions       | —                        |
| 1:25 | `/projects/p1/apply`               | Submit pitch                                         | **Hero D** (match score) |
| 1:55 | Switch to MedScan window           | Already on dashboard                                 | —                        |
| 2:00 | `/projects/new`                    | Paste different business plan → questions            | **Hero A**               |
| 2:30 | `/projects/p1/manage`              | See 3 applications, Convex Lab on top                | —                        |
| 2:50 | Accept Convex Lab                  | —                                                    | —                        |
| 3:00 | `/projects/p2/dashboard`           | Show prior translation cards                         | —                        |
| 3:20 | (optional) submit 4th report on P2 | Cards animate in                                     | **Pillar C**             |
| 3:30 | Wrap                               | "Three pillars, four AI moments, real publications." | —                        |

### Pre-baked vs live

- **Pre-baked at seed:** all OpenAlex profiles, P1's research questions, the 2 competitor applications + scores, all 3 prior reports' translation cards.
- **Live on demo day:** Alice's onboarding (B), Alice's team's match (D), MedScan's new-project (A), optional new-report (C).

### Demo-day fallbacks

- Every live AI moment has a `?demo=fallback` query param that returns a pre-recorded response. Invisible unless the network/API fails.
- 30 minutes before showtime: a "warm-up" script pre-runs the demo's AI calls so they hit cache during the actual demo.

---

## 7. Visual system

Editorial polish on a modern-tech chassis. _Linear × Stripe Press × an arXiv preprint._

### Typography

- **Display (h1, hero, marketing):** **Fraunces** — variable serif. Hero uses `opsz: 144`, soft setting. Editorial.
- **UI sans (body, nav, forms):** **Inter** — variable, `wght: 400-600`, tracking `-0.011em` on headings.
- **Monospace (data, IDs, scores, dates):** **JetBrains Mono** — `wght: 400`.

**Hierarchy rule:**

- Numbers a researcher cares about (citations, match %, year) → monospace.
- Editorial content (project titles, hero, research questions) → serif.
- Everything else → sans.

### Color tokens (CSS variables; `app/globals.css` `@theme`)

Dark-first; light mode is a stretch.

| Token        | Hex       | Use                          |
| ------------ | --------- | ---------------------------- |
| `--ink`      | `#0A0E1A` | Primary surface              |
| `--ink-2`    | `#111626` | Elevated surface, cards      |
| `--ink-3`    | `#1A2236` | Inputs, dividers             |
| `--paper`    | `#F5F2EC` | Light blocks, quote cards    |
| `--text`     | `#E8E6E1` | Primary text                 |
| `--text-dim` | `#8B92A5` | Secondary                    |
| `--cyan`     | `#3FCEDB` | Actions, scores ≥80          |
| `--cyan-dim` | `#1A6E78` | Hover/pressed                |
| `--gold`     | `#D4A547` | Drop-caps, "accepted" status |
| `--rose`     | `#E26D7A` | Errors, low scores           |

### Layout & spacing

- 8-pt grid for all spacing.
- Max width: `1200px` on dashboards, `720px` on text-heavy pages (project detail, profile, reports — they read like articles).
- Line-height: `1.5–1.75` body, `1.15` display.
- Single editorial column on profiles/projects/reports; sidebar metadata, no two-column dashboard sprawl.

### Component personality (shadcn baseline + overrides)

- **Cards:** 1px hairline border in `--ink-3`, subtle inset shadow, padding `24-32px`. No glow, no glass.
- **Buttons:** 4px radius, bold-medium weight, full cap-height. Primary: `--cyan` fill. Secondary: bordered. Tertiary: text + underline-on-hover.
- **Inputs:** 48px tall, serif labels above, monospace on numerical inputs. `--cyan` 60% focus ring.
- **Match score chip:** monospace number + 4-segment bar (Bloomberg terminal, not circular dial). AI rationale next to it in serif italic — that contrast is the brand.
- **Research question card:** gold serif drop-cap on the question, sans rationale, citation-style numerals.

### Motion

- Skeleton placeholders during AI generation, **always**. Never blank screens.
- Translation cards: fade-up 300ms ease-out, 60ms stagger.
- No page transitions, no parallax, no springy buttons. Restraint.

### Iconography & imagery

- Lucide icons, 1.5px stroke, sparingly.
- Custom thin-line SVG accents in `--cyan-dim` 30% opacity (echoing pitch-deck circuit motif), decorative only.
- No stock photos.
- Avatars: serif initials on `--ink-2` if no photo.
- Company logos: R2-uploaded; fallback is 2-letter serif monogram.

---

## 8. Repository & infrastructure

### Directory layout

```
polymath/
├─ app/
│  ├─ (marketing)/               # public, no auth
│  ├─ (app)/                     # auth-required, role-aware
│  ├─ api/
│  │  ├─ webhooks/clerk/route.ts
│  │  └─ openalex/...            # thin proxy with KV cache
│  └─ globals.css                # Tailwind v4 + @theme
├─ components/
│  ├─ ui/                        # shadcn primitives (overridden)
│  ├─ marketing/
│  ├─ profile/
│  ├─ project/
│  ├─ dashboard/
│  └─ shell/
├─ lib/
│  ├─ ai/
│  │  ├─ gemini.ts               # single Gemini wrapper
│  │  ├─ schemas.ts              # Zod schemas for AI outputs
│  │  └─ prompts/
│  │     ├─ generate-questions.ts
│  │     ├─ summarize-researcher.ts
│  │     ├─ score-match.ts
│  │     └─ translate-report.ts
│  ├─ openalex/
│  ├─ db/
│  │  ├─ schema.ts               # Drizzle (mirrors §4)
│  │  ├─ client.ts
│  │  └─ queries/
│  ├─ auth/
│  └─ utils/
├─ drizzle/                      # generated migrations
├─ scripts/
│  ├─ seed.ts
│  └─ db-reset.ts
├─ public/
├─ docs/
│  ├─ superpowers/specs/
│  └─ runbook.md
├─ .github/workflows/
│  ├─ ci.yml
│  └─ deploy.yml
├─ wrangler.toml
├─ open-next.config.ts
├─ next.config.ts
├─ tsconfig.json
├─ package.json
├─ .env.example
├─ README.md
└─ CLAUDE.md
```

### Environments & bindings

Two environments from day one: `staging` (auto-deploy on merge to `main`) and `production` (deploy on tag). Demo runs from production.

`wrangler.toml` bindings:

- `D1_DB` — primary database.
- `R2_UPLOADS` — file uploads.
- `KV_CACHE` — OpenAlex responses, AI idempotency.

Secrets: `GEMINI_API_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `OPENALEX_EMAIL`.

### Tooling

- ESLint flat config + Prettier + `@typescript-eslint` strict.
- Husky + lint-staged: typecheck + lint changed files on commit.
- Conventional commits (commitlint).
- PR template (typecheck pass, screenshots if UI, AI prompt updated if applicable).
- CODEOWNERS — one person assigned per `lib/ai/`, `lib/db/`, `components/`, `app/`.

### Branch strategy

- `main` protected, deploys to staging, requires 1 review.
- Feature branches: `feat/<short-name>`, squash-merge.
- `demo` git tag freezes the demo-day commit.

### Day-one setup checklist (before feature work)

1. `pnpm create next-app polymath --ts --tailwind --app --no-eslint`.
2. Add `@opennextjs/cloudflare`, configure `wrangler.toml`, deploy "hello world" to staging.
3. Provision D1, apply empty migration, confirm binding works in deployed env.
4. Provision R2 + KV.
5. Set up Clerk (both envs), wire middleware, deploy gated `/dashboard` skeleton.
6. Set up Gemini API key, write `lib/ai/gemini.ts` + a server-action smoke test.
7. Commit `CLAUDE.md` + `docs/runbook.md` skeletons.

~Half a day of setup before vertical feature work. Worth it.

### Risk register

| Risk                                               | Mitigation                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| OpenNext on Workers — Node-only npm packages break | Audit imports; prefer Workers-native libs (Drizzle, Hono) and stdlib |
| Gemini 3 Flash quotas during rehearsal             | KV idempotency + warm-up script before showtime                      |
| Clerk webhook lag (1-3s on user creation)          | Server actions read-through Clerk API and upsert if missing          |
| D1 cold start                                      | Health-check query on landing render                                 |
| OpenAlex rate limit (10 req/s polite pool)         | `OPENALEX_EMAIL` header + KV cache                                   |

---

## 9. Out of scope

### Not building

- Real-time chat (the translation cards _are_ the comms layer).
- Notifications (email or in-app bell).
- Payments / billing / contracts.
- Light mode.
- Mobile-responsive past tablet width (`~768px` sane minimum, no mobile flows designed).
- Theming Clerk's signup UI.
- Multi-tenant company orgs (one user → one company).
- Project editing after publish (frozen on publish; regenerate before publish only).
- Application withdrawal / re-application.
- Public researcher search / discovery index.
- Rich-text editor for reports (plain markdown + file upload).
- Analytics / admin views.
- i18n (English only).
- E2E test suite (unit tests on AI wrappers + match math; manual smoke-testing per runbook for the rest).
- Storybook / component playground.
- Accessibility audit past keyboard nav + color contrast basics.

### Faked gracefully

- 2 competing seeded applications on P1 (with seed-time computed match scores).
- 3 prior weekly reports on P2 (with seed-time AI-translated cards).
- Some researcher OpenAlex profiles pre-fetched and frozen at seed.
- Demo-day fallback responses on every live AI moment.

### Stretch (only if time at end of week 1.5)

- Light mode.
- Team page "research feed" — recent OpenAlex publications across team members.
- Match-score explainability overlay — visual concept-overlap heatmap behind the AI rationale.

---

## 10. Definition of done

The MVP is demo-ready when:

- Both seed scripts run cleanly on a fresh D1.
- All four AI moments (A, B, C, D) work end-to-end in production (staging Cloudflare env).
- The 3:30 demo script runs without error on a live laptop, twice in a row.
- Demo-day fallbacks work when `?demo=fallback` is set.
- Lighthouse score on landing ≥ 90 on Performance and Accessibility.
- Unit tests pass for `lib/ai/gemini.ts` (mocked Gemini), `lib/openalex/*`, and the match-scoring math.
- Runbook (`docs/runbook.md`) documents demo procedure including warm-up.
- `demo` git tag points at the production-deployed commit.

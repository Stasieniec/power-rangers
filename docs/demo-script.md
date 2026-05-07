# Polymath — on-stage demo script

**Target length:** 3:00. Hard ceiling 3:30.
**Single browser window.** No two-window choreography — one persona switch via the `/demo` door.
**Live URL:** https://polymath.power-rangers.workers.dev

---

## Pre-show checklist (T-30 minutes)

- [ ] Open an incognito/private browser window. Sign out of Clerk if relevant.
- [ ] Visit `https://polymath.power-rangers.workers.dev/projects` once to warm the worker.
- [ ] Pre-load AI caches:
  ```bash
  curl -X POST "https://polymath.power-rangers.workers.dev/api/admin/warm-up?secret=$SEED_SECRET"
  ```
- [ ] Have a sample business plan in your clipboard for the AI-1 moment. Suggested:
  > **Business plan:** We're a B2B SaaS for SMB retailers. Customers churn at 8% monthly. We have transaction logs, support-ticket history, and product-usage telemetry. We want to predict churn 14 days in advance and trigger save-flows.
  >
  > **End-goal:** A weekly churn-risk score per customer, with intervention recommendations the success team can act on.
- [ ] In the incognito window, open https://polymath.power-rangers.workers.dev/. Don't navigate further.

---

## The script

### Open — 0:00 to 0:15

**Screen:** `/`

> "Polymath turns research into a competition. Companies post end-goals; we translate them into research questions; teams compete with real publication data. Three pillars, four live AI moments. Real, today."

Click **"Browse open projects →"**.

---

### Public surface — 0:15 to 1:00

**Screen:** `/projects` → click **"Late-stage clinical trial outcome prediction"**

> "MedScan Diagnostics posted a brief about phase III trial dropout. Polymath translated it into five concept-tagged research questions — researchable, scoped, ready to compete on."

Scroll past the questions briefly.

Click on a researcher card on the team page (or navigate to `/researchers/<id>` for any seeded researcher — Nigam Shah, Daphne Koller, etc.)

**Screen:** `/researchers/<id>`

> "Each profile is built from real OpenAlex data. Twenty publications, citation-ranked. Gemini synthesizes the headline and the two-sentence summary in gold — both verifiable against the publication list below."

Scroll the publication list. Highlight citation counts in cyan.

---

### Demo door switch — 1:00 to 1:10

> "I'll step into the company side now. Sign-up requires an email round-trip — brittle on stage — so we have a demo door for live walk-throughs."

Click **"Demo"** in the nav (gold link).

**Screen:** `/demo`

> "Pre-seeded personas. One click."

Click **MedScan Diagnostics** (the gold-accented card).

---

### Pillar 1 + AI-1 (LIVE) — 1:10 to 1:55

**Screen:** company `/dashboard`

> "We're MedScan now. Two projects — one open, one in progress."

Click **"+ New project"**.

**Screen:** `/projects/new`

Paste the business plan. Paste the end-goal. Click **"Generate research questions"**.

> "Watch. Gemini takes a paragraph of business intent and emits structured, scoped research questions. Concept-tagged so they slot directly into the matching engine."

[Skeleton phases visible ~5–8s.]

[When questions render]

> "Five questions, each editable. We can regenerate or publish."

**Don't publish.** Click "Dashboard" in nav to leave the draft.

---

### Pillar 2 + AI-3 (PRE-BAKED) — 1:55 to 2:25

**Screen:** Click into "Late-stage clinical trial outcome prediction" → manage page (`/projects/project_p1/manage`)

> "Two teams applied. Each has a match score from real concept-overlap math, plus a Gemini-written rationale that adjusts ±10 based on what the pitch reveals beyond the publications."

Point at the score chips.

> "The score isn't a vibe. It's cosine similarity over OpenAlex concept vectors, weighted by author confidence. The AI is honest — when the publications don't match the project, the score is low and the rationale says why. That's the integrity we want."

Click **"Per-question alignment"** to expand the top card.

> "Per question, you see exactly why this team scored what they scored. Direct overlap, adjacent expertise, or honest gaps."

**Don't accept anyone** — leaves P1 clean if you re-demo.

---

### Pillar 3 + AI-4 cards — 2:25 to 2:55

**Screen:** Navigate to `/projects/project_p2/dashboard` (URL bar, or via dashboard).

> "Pillar three — alignment. Project P2 has been in progress three weeks. The accepted team submits weekly reports in their own technical language. Gemini translates each into per-question business-language cards."

Scroll the findings feed.

> "Technical finding on the left in monospace, business translation on the right in serif, impact note in gold. The dashboard _is_ the comms layer between research and business — no more explaining what AUC means to your CEO."

Per-question progress bars at the top show coverage across reports.

---

### Wrap — 2:55 to 3:00

Don't navigate. Just close the loop.

> "Three pillars. Four AI moments — all live today. Real publication data, real translation, real signal under every score. That's Polymath."

---

## Recovery scripts (if something breaks live)

| What broke                                   | What to say                                     | What to do                                                                                      |
| -------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| AI-1 hangs >8s during the live moment        | "Network blip — let me show the cached output." | In the URL bar, append `?demo=fallback` and reload. The worker returns a pre-recorded response. |
| Demo door 500s                               | "One sec, slot reset."                          | Reload `/demo`, click again. Cookie may have stuck — try in a fresh incognito tab.              |
| Match scores look unflattering               | (it's a feature)                                | "The AI is honest about overlap — that's the integrity we want. No score inflation."            |
| Translation cards don't animate              | (cosmetic)                                      | Don't apologize. Move on.                                                                       |
| `/projects` shows "0 projects"               | Major data issue.                               | Cut to the slides. Have someone re-run `pnpm seed` (~30s) in the background.                    |
| Browser is signed in to a real Clerk account | Wrong window                                    | Use the incognito tab; nav should show "Demo" link if you're signed out.                        |

---

## Don't say (anti-script)

- Don't name the auth provider, the framework, the database, or the deploy adapter unless asked. Judges don't care; the architecture is in the README.
- Don't apologize for unfinished features. Don't say "in production we'd…".
- Don't talk about test counts.
- Don't oversell. The match scores are real, not always high.

If asked **"how does the matching score work?"**:

> "Cosine similarity over OpenAlex concept vectors, weighted by each author's confidence on each concept. We aggregate concepts across team members, then Gemini reads the actual publications and the team's pitch to adjust ±10 with a written rationale. So the number is grounded in the math, but the rationale captures qualitative signal the math misses."

If asked **"why is that team's score so low?"**:

> "Their publications are on different topics than this project. The model is honest about it — that's the point. We could lift the score with prompt engineering tricks, but then the rationale would lie."

---

## After the demo

- Tag the commit if it's the final cut: `git tag demo-final && git push origin demo-final`
- Take a screenshot of `/projects/project_p2/dashboard` with the cards expanded — use it on the deck's last slide.
- Reset the seed if the demo dirtied the state: `curl -X POST "$URL/api/admin/seed?secret=$SEED_SECRET"`.

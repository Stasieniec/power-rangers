# Plan 5 — Applications & Matching

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teams apply to open projects. The platform computes a real concept-overlap score between project research questions and team members' aggregate expertise, then asks Gemini to write a rationale and adjust the score within ±10. Companies see ranked applications with score + rationale; they accept one team and the project transitions to `in_progress`. This is **Hero Moment D** — and the most defensible piece of "creative AI" because the score has real signal under it.

**Architecture:** A pure-function `lib/match/score.ts` computes weighted concept overlap (cosine over score-weighted vectors). The apply action: 1) computes base score, 2) gathers context, 3) calls Gemini for rationale + adjustment, 4) writes the application with final score + per-question alignment.

**Tech Stack:** Next.js server actions, Gemini, Drizzle, Vitest (TDD on the math).

**Depends on:** Plans 0-4. Researchers are onboarded, teams exist, projects are published with concept-tagged research questions.

---

## File structure laid down by this plan

```
lib/
├─ match/
│  └─ score.ts                            # pure scoring math
├─ ai/prompts/
│  └─ score-match.ts                      # AI-3
└─ actions/
   ├─ applications.ts                     # apply, acceptTeam
   └─ shared.ts                           # role guards used by both

app/(app)/projects/[id]/
├─ apply/
│  ├─ page.tsx
│  └─ _components/
│     ├─ team-picker.tsx
│     └─ apply-form.tsx
└─ manage/
   ├─ page.tsx
   └─ _components/
      ├─ application-card.tsx
      └─ accept-button.tsx

components/match/
├─ score-chip.tsx                          # the Bloomberg-style chip
└─ alignment-bars.tsx                      # per-question alignment

tests/lib/match/
└─ score.test.ts
```

---

## Task 1: Concept-overlap scoring math (TDD)

**Files:**

- Create: `lib/match/score.ts`, `tests/lib/match/score.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/lib/match/score.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { conceptVector, cosine, scoreMatch } from "@/lib/match/score";

describe("conceptVector", () => {
  it("aggregates labels with summed weights", () => {
    const v = conceptVector([
      { label: "ml", weight: 0.5 },
      { label: "ml", weight: 0.5 },
      { label: "stats", weight: 0.7 },
    ]);
    expect(v.get("ml")).toBeCloseTo(1.0);
    expect(v.get("stats")).toBeCloseTo(0.7);
  });

  it("lowercases labels for case-insensitive match", () => {
    const v = conceptVector([
      { label: "Machine Learning", weight: 0.6 },
      { label: "machine learning", weight: 0.4 },
    ]);
    expect(v.size).toBe(1);
    expect(v.get("machine learning")).toBeCloseTo(1.0);
  });
});

describe("cosine", () => {
  it("returns 1 for identical vectors", () => {
    const a = new Map([["x", 1]]);
    const b = new Map([["x", 1]]);
    expect(cosine(a, b)).toBeCloseTo(1);
  });
  it("returns 0 for disjoint vectors", () => {
    const a = new Map([["x", 1]]);
    const b = new Map([["y", 1]]);
    expect(cosine(a, b)).toBe(0);
  });
  it("handles partial overlap", () => {
    const a = new Map([
      ["x", 1],
      ["y", 1],
    ]);
    const b = new Map([
      ["x", 1],
      ["z", 1],
    ]);
    expect(cosine(a, b)).toBeCloseTo(0.5);
  });
  it("returns 0 when either vector is empty", () => {
    expect(cosine(new Map(), new Map([["x", 1]]))).toBe(0);
    expect(cosine(new Map([["x", 1]]), new Map())).toBe(0);
  });
});

describe("scoreMatch", () => {
  it("computes 100 for perfectly overlapping concepts", () => {
    const result = scoreMatch({
      questions: [
        {
          id: "q1",
          concepts: [{ label: "ml", weight: 1 }],
        },
      ],
      teamConcepts: [{ label: "ml", weight: 1 }],
    });
    expect(result.baseScore).toBe(100);
    expect(result.perQuestion[0]?.score).toBe(100);
  });

  it("computes 0 for fully disjoint concepts", () => {
    const result = scoreMatch({
      questions: [
        {
          id: "q1",
          concepts: [{ label: "ml", weight: 1 }],
        },
      ],
      teamConcepts: [{ label: "biology", weight: 1 }],
    });
    expect(result.baseScore).toBe(0);
  });

  it("averages across multiple questions", () => {
    const result = scoreMatch({
      questions: [
        { id: "q1", concepts: [{ label: "ml", weight: 1 }] },
        { id: "q2", concepts: [{ label: "biology", weight: 1 }] },
      ],
      teamConcepts: [{ label: "ml", weight: 1 }],
    });
    // q1 → 100, q2 → 0, avg = 50
    expect(result.baseScore).toBe(50);
    expect(result.perQuestion).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run (expect failure)**

```bash
pnpm test tests/lib/match/score.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/match/score.ts`**

```typescript
export interface ConceptWeight {
  label: string;
  weight: number;
}

export interface QuestionInput {
  id: string;
  concepts: ConceptWeight[];
}

export interface ScoreInput {
  questions: QuestionInput[];
  teamConcepts: ConceptWeight[];
}

export interface PerQuestionScore {
  questionId: string;
  score: number;
}

export interface ScoreResult {
  baseScore: number; // 0-100
  perQuestion: PerQuestionScore[];
}

export function conceptVector(items: ConceptWeight[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const item of items) {
    const key = item.label.toLowerCase().trim();
    m.set(key, (m.get(key) ?? 0) + item.weight);
  }
  return m;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const v of a.values()) normA += v * v;
  for (const v of b.values()) normB += v * v;
  for (const [k, v] of a) {
    const bv = b.get(k);
    if (bv) dot += v * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

export function scoreMatch(input: ScoreInput): ScoreResult {
  const teamVec = conceptVector(input.teamConcepts);
  const perQuestion: PerQuestionScore[] = [];
  let total = 0;
  for (const q of input.questions) {
    const qVec = conceptVector(q.concepts);
    const score = Math.round(cosine(qVec, teamVec) * 100);
    perQuestion.push({ questionId: q.id, score });
    total += score;
  }
  const baseScore = input.questions.length === 0 ? 0 : Math.round(total / input.questions.length);
  return { baseScore, perQuestion };
}
```

- [ ] **Step 4: Run tests (expect pass)**

```bash
pnpm test tests/lib/match/score.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(match): add concept-overlap scoring math + tests"
```

---

## Task 2: AI-3 prompt for match rationale

**Files:**

- Create: `lib/ai/prompts/score-match.ts`, `tests/lib/ai/prompts/score-match.test.ts`

- [ ] **Step 1: Define a richer Zod schema for AI-3 output**

This already exists in `lib/ai/schemas.ts` (`matchResultSchema`). We need to extend it to include the _adjustment_ field. Modify `lib/ai/schemas.ts`:

```typescript
// Replace matchResultSchema with:
export const matchRationaleSchema = z.object({
  rationale: z.string().min(20),
  adjustment: z.number().int().min(-10).max(10),
  per_question_alignment: z.array(
    z.object({
      question_id: z.string(),
      score: z.number().int().min(0).max(100),
      why: z.string().min(5),
    })
  ),
});
```

(And update any Plan 0 references if there were any. There are none — schemas were forward-declared.)

- [ ] **Step 2: Create the prompt module**

`lib/ai/prompts/score-match.ts`:

```typescript
import { generate } from "@/lib/ai/gemini";
import { matchRationaleSchema } from "@/lib/ai/schemas";
import type { z } from "zod";

const SYSTEM = `You are an evaluator for a research-team-to-project matching platform.

You are given:
- A project's research questions, each tagged with concept labels and weights.
- A team's aggregate concept profile, drawn from their members' OpenAlex publications.
- Each member's top 3 publications (titles + brief abstracts).
- The team's pitch.
- A *base score* (0-100) computed from cosine similarity of the concept vectors.

Your job:
1. Write a 2-3 sentence rationale for why this team is or isn't a fit. Cite specific publications or concepts.
2. Score each research question (0-100) based on alignment with the team's expertise, with a one-line justification.
3. Suggest an *adjustment* in the range [-10, 10] that should be applied to the base score, justified by the team's pitch covering gaps the publications don't, OR conversely, a publication-strong team whose pitch reveals misunderstanding.

Be honest. Don't inflate. The base score already reflects publication-concept overlap; your job is to capture the qualitative signal it misses.

Output strict JSON matching the response schema. No prose.`;

export interface ScoreMatchInput {
  baseScore: number;
  pitch: string;
  questions: { id: string; question: string; concepts: { label: string; weight: number }[] }[];
  teamConcepts: { label: string; weight: number }[];
  members: {
    name: string;
    topPublications: { title: string; abstract: string | null; year: number | null }[];
  }[];
}

export type ScoreMatchOutput = z.infer<typeof matchRationaleSchema>;

export async function scoreMatchRationale(input: ScoreMatchInput): Promise<ScoreMatchOutput> {
  const prompt = `BASE SCORE (concept-overlap, 0-100): ${input.baseScore}

RESEARCH QUESTIONS:
${input.questions
  .map(
    (q) =>
      `- [${q.id}] ${q.question}\n  concepts: ${q.concepts.map((c) => `${c.label}(${c.weight.toFixed(2)})`).join(", ")}`
  )
  .join("\n")}

TEAM AGGREGATE CONCEPTS (top by weight):
${input.teamConcepts
  .slice(0, 15)
  .map((c) => `- ${c.label}: ${c.weight.toFixed(2)}`)
  .join("\n")}

TEAM MEMBERS:
${input.members
  .map(
    (m) =>
      `${m.name}\n${m.topPublications
        .map(
          (p, i) =>
            `  [${i + 1}] (${p.year ?? "n.d."}) ${p.title}${p.abstract ? `\n      ${p.abstract.slice(0, 240)}` : ""}`
        )
        .join("\n")}`
  )
  .join("\n\n")}

TEAM PITCH:
${input.pitch}

Produce your evaluation now.`;

  return generate(matchRationaleSchema, { system: SYSTEM, prompt });
}
```

- [ ] **Step 3: Test**

`tests/lib/ai/prompts/score-match.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/gemini", () => ({
  generate: vi.fn(async () => ({
    rationale:
      "Strong on graph methods and causal inference; pitch shows clear understanding of the time-series constraint.",
    adjustment: 4,
    per_question_alignment: [
      { question_id: "q1", score: 88, why: "Direct match in publications." },
      { question_id: "q2", score: 65, why: "Adjacent but not core." },
    ],
  })),
  GeminiError: class extends Error {},
}));

import { scoreMatchRationale } from "@/lib/ai/prompts/score-match";
import { generate } from "@/lib/ai/gemini";

describe("scoreMatchRationale", () => {
  it("calls generate and returns parsed result", async () => {
    const out = await scoreMatchRationale({
      baseScore: 72,
      pitch: "We are excited to apply.",
      questions: [
        { id: "q1", question: "How predict churn?", concepts: [{ label: "ml", weight: 0.7 }] },
        {
          id: "q2",
          question: "What interventions?",
          concepts: [{ label: "experimental design", weight: 0.6 }],
        },
      ],
      teamConcepts: [{ label: "ml", weight: 0.8 }],
      members: [
        {
          name: "Alice",
          topPublications: [{ title: "Predicting churn", year: 2024, abstract: null }],
        },
      ],
    });
    expect(out.adjustment).toBe(4);
    expect(out.per_question_alignment).toHaveLength(2);
    const args = (generate as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![1] as {
      prompt: string;
    };
    expect(args.prompt).toContain("BASE SCORE");
    expect(args.prompt).toContain("Alice");
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ai): add scoreMatchRationale (AI-3) prompt + test"
```

---

## Task 3: Apply server action

**Files:**

- Create: `lib/actions/applications.ts`

- [ ] **Step 1: Create `lib/actions/applications.ts`**

```typescript
"use server";

import { v7 as uuidv7 } from "uuid";
import { eq, and, inArray, desc } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { syncUser } from "@/lib/auth/sync-user";
import {
  applications,
  projects,
  researchQuestions,
  teams,
  teamMembers,
  researchers,
  researcherConcepts,
  publications,
  companies,
  users,
} from "@/lib/db/schema";
import { scoreMatch } from "@/lib/match/score";
import { scoreMatchRationale } from "@/lib/ai/prompts/score-match";

export async function applyToProject(input: {
  projectId: string;
  teamId: string;
  pitch: string;
}): Promise<
  { ok: true; applicationId: string; matchScore: number } | { ok: false; error: string }
> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const db = getDb();

  // Validate the user is the lead of the team
  const lead = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, input.teamId),
      eq(teamMembers.userId, user.id),
      eq(teamMembers.role, "lead")
    ),
  });
  if (!lead) return { ok: false, error: "only the team lead can apply" };

  // Validate project is open
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (!project) return { ok: false, error: "project not found" };
  if (project.status !== "open")
    return { ok: false, error: "project is not accepting applications" };

  // No duplicate apps from same team
  const dup = await db.query.applications.findFirst({
    where: and(eq(applications.projectId, input.projectId), eq(applications.teamId, input.teamId)),
  });
  if (dup) return { ok: false, error: "team has already applied" };

  // Load research questions with their concepts
  const qs = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, input.projectId));

  // Load team members and their concepts
  const members = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      researcherId: researchers.id,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .leftJoin(researchers, eq(researchers.userId, users.id))
    .where(eq(teamMembers.teamId, input.teamId));

  const researcherIds = members.map((m) => m.researcherId).filter((x): x is string => Boolean(x));

  const concepts =
    researcherIds.length === 0
      ? []
      : await db
          .select()
          .from(researcherConcepts)
          .where(inArray(researcherConcepts.researcherId, researcherIds));

  // Aggregate team concepts
  const teamConcepts = aggregateConcepts(concepts);

  // Compute base score
  const questionInputs = qs.map((q) => ({
    id: q.id,
    concepts: JSON.parse(q.concepts) as { label: string; weight: number }[],
  }));
  const matchResult = scoreMatch({
    questions: questionInputs,
    teamConcepts,
  });

  // Pull top 3 publications per member for the AI prompt
  const memberContexts: {
    name: string;
    topPublications: { title: string; abstract: string | null; year: number | null }[];
  }[] = [];
  for (const m of members) {
    if (!m.researcherId) {
      memberContexts.push({ name: m.displayName, topPublications: [] });
      continue;
    }
    const pubs = await db
      .select()
      .from(publications)
      .where(eq(publications.researcherId, m.researcherId))
      .orderBy(desc(publications.citationCount))
      .limit(3);
    memberContexts.push({
      name: m.displayName,
      topPublications: pubs.map((p) => ({
        title: p.title,
        abstract: p.abstract,
        year: p.year,
      })),
    });
  }

  // AI rationale + adjustment
  let aiResult;
  try {
    aiResult = await scoreMatchRationale({
      baseScore: matchResult.baseScore,
      pitch: input.pitch,
      questions: qs.map((q) => ({
        id: q.id,
        question: q.question,
        concepts: JSON.parse(q.concepts) as { label: string; weight: number }[],
      })),
      teamConcepts,
      members: memberContexts,
    });
  } catch (e) {
    console.error("AI-3 failed", e);
    aiResult = {
      rationale: "Match rationale could not be generated. Score is based on concept overlap only.",
      adjustment: 0,
      per_question_alignment: matchResult.perQuestion.map((p) => ({
        question_id: p.questionId,
        score: p.score,
        why: "Concept-overlap fallback.",
      })),
    };
  }

  const finalScore = Math.max(0, Math.min(100, matchResult.baseScore + aiResult.adjustment));

  const applicationId = uuidv7();
  await db.insert(applications).values({
    id: applicationId,
    projectId: input.projectId,
    teamId: input.teamId,
    status: "pending",
    matchScore: finalScore,
    matchRationale: aiResult.rationale,
    perQuestionAlignment: JSON.stringify(aiResult.per_question_alignment),
    pitch: input.pitch.trim(),
  });

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/manage`);
  revalidatePath(`/dashboard`);
  return { ok: true, applicationId, matchScore: finalScore };
}

export async function acceptTeam(input: {
  projectId: string;
  applicationId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const db = getDb();
  const [project] = await db
    .select({ id: projects.id, ownerUserId: companies.ownerUserId, status: projects.status })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (!project || project.ownerUserId !== user.id) return { ok: false, error: "project not found" };
  if (project.status !== "open")
    return { ok: false, error: "project is not accepting applications" };

  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, input.applicationId))
    .limit(1);
  if (!app || app.projectId !== input.projectId)
    return { ok: false, error: "application not found" };

  await db
    .update(projects)
    .set({
      acceptedTeamId: app.teamId,
      status: "in_progress",
      updatedAt: Date.now(),
    })
    .where(eq(projects.id, input.projectId));
  await db
    .update(applications)
    .set({ status: "accepted" })
    .where(eq(applications.id, input.applicationId));
  // Reject all others on this project
  await db
    .update(applications)
    .set({ status: "rejected" })
    .where(and(eq(applications.projectId, input.projectId), eq(applications.status, "pending")));

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/manage`);
  revalidatePath(`/projects/${input.projectId}/dashboard`);
  return { ok: true };
}

function aggregateConcepts(
  rows: { concept: string; score: number }[]
): { label: string; weight: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const key = r.concept;
    m.set(key, (m.get(key) ?? 0) + r.score);
  }
  if (m.size === 0) return [];
  const max = Math.max(...m.values());
  return [...m.entries()]
    .map(([label, total]) => ({ label, weight: total / max }))
    .sort((a, b) => b.weight - a.weight);
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(applications): add applyToProject + acceptTeam actions"
```

---

## Task 4: `/projects/[id]/apply` page

**Files:**

- Create: `app/(app)/projects/[id]/apply/page.tsx`, `app/(app)/projects/[id]/apply/_components/team-picker.tsx`, `app/(app)/projects/[id]/apply/_components/apply-form.tsx`, `lib/db/queries/eligible-teams.ts`

- [ ] **Step 1: Create eligible-teams query**

```typescript
import { eq, and, notInArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { teams, teamMembers, applications } from "@/lib/db/schema";

export async function getEligibleTeamsForProject(userId: string, projectId: string) {
  const db = getDb();
  // Teams where user is lead
  const myLeadTeams = await db
    .select({ id: teams.id, name: teams.name })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.role, "lead")));

  if (myLeadTeams.length === 0) return [];

  // Filter out teams that already applied
  const existingApps = await db
    .select({ teamId: applications.teamId })
    .from(applications)
    .where(eq(applications.projectId, projectId));
  const appliedSet = new Set(existingApps.map((a) => a.teamId));

  return myLeadTeams.filter((t) => !appliedSet.has(t.id));
}
```

- [ ] **Step 2: Create the apply form**

`apply/_components/apply-form.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { applyToProject } from "@/lib/actions/applications";

interface Team {
  id: string;
  name: string;
}

export function ApplyForm({
  projectId,
  teams,
}: {
  projectId: string;
  teams: Team[];
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [pitch, setPitch] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "submitting" | "scoring">("form");
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) return;
    setError(null);
    setPhase("submitting");
    startTransition(async () => {
      const phaseTimer = setTimeout(() => setPhase("scoring"), 1500);
      const res = await applyToProject({ projectId, teamId, pitch });
      clearTimeout(phaseTimer);
      if (!res.ok) {
        setError(res.error);
        setPhase("form");
        return;
      }
      router.push(`/teams/${teamId}`);
    });
  }

  if (teams.length === 0) {
    return (
      <p className="text-text-dim">
        You don't have any eligible teams to apply with — either you're not a
        team lead, or all your teams have already applied to this project.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <Label htmlFor="team">Apply with</Label>
        <select
          id="team"
          required
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="mt-2 h-12 w-full rounded-sm border border-ink-3 bg-ink-3/40 px-4 text-text"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="pitch">Pitch (1-3 sentences)</Label>
        <p className="mt-1 text-xs text-text-dim">
          Why your team is a fit. The pitch is shown to the company alongside
          your AI-computed match score.
        </p>
        <textarea
          id="pitch"
          required
          rows={5}
          minLength={20}
          maxLength={800}
          className="mt-2 w-full rounded-sm border border-ink-3 bg-ink-3/40 px-4 py-3 text-text"
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
        />
      </div>

      {phase !== "form" && (
        <div className="rounded-md border border-cyan/30 bg-cyan/5 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan">
            {phase === "submitting"
              ? "Computing concept overlap…"
              : "Asking Gemini for match rationale…"}
          </p>
          <div className="mt-4 h-3 w-3/4 animate-pulse rounded bg-ink-3" />
        </div>
      )}

      {error && <p className="text-sm text-rose">{error}</p>}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create the page**

`apply/page.tsx`:

```typescript
import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { syncUser } from "@/lib/auth/sync-user";
import { getProjectDetail } from "@/lib/db/queries/projects";
import { getEligibleTeamsForProject } from "@/lib/db/queries/eligible-teams";
import { ApplyForm } from "./_components/apply-form";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);
  if (user.role !== "researcher") redirect("/dashboard");

  const project = await getProjectDetail(id);
  if (!project) notFound();
  if (project.status !== "open") redirect(`/projects/${id}`);

  const teams = await getEligibleTeamsForProject(user.id, id);

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          Apply
        </p>
        <h1 className="mt-3 font-display text-4xl">{project.title}</h1>
        <p className="mt-3 text-text-dim">
          {project.companyName} · {project.questions.length} research questions
        </p>

        <div className="mt-12">
          <ApplyForm projectId={project.id} teams={teams} />
        </div>
      </Container>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(applications): add /projects/[id]/apply"
```

---

## Task 5: Score chip + alignment bars (visual primitives)

**Files:**

- Create: `components/match/score-chip.tsx`, `components/match/alignment-bars.tsx`

- [ ] **Step 1: Create `components/match/score-chip.tsx`**

```typescript
import { cn } from "@/lib/utils";

export function ScoreChip({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const segments = 4;
  const filled = Math.round((score / 100) * segments);
  const colorClass =
    score >= 80
      ? "text-cyan"
      : score >= 60
        ? "text-text"
        : score >= 40
          ? "text-gold"
          : "text-rose";
  const sizeClass = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  }[size];
  return (
    <div className="flex items-center gap-3">
      <span className={cn("font-mono leading-none", sizeClass, colorClass)}>
        {score}
      </span>
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-4 w-1.5 rounded-sm",
              i < filled ? "bg-cyan" : "bg-ink-3"
            )}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/match/alignment-bars.tsx`**

```typescript
interface Item {
  question_id: string;
  score: number;
  why: string;
}

export function AlignmentBars({
  items,
  questionMap,
}: {
  items: Item[];
  questionMap: Record<string, { question: string; index: number }>;
}) {
  return (
    <ol className="space-y-3">
      {items.map((it) => {
        const q = questionMap[it.question_id];
        if (!q) return null;
        return (
          <li
            key={it.question_id}
            className="grid grid-cols-[64px_1fr_120px] items-center gap-4 rounded-sm border border-ink-3 bg-ink p-3"
          >
            <span className="font-mono text-xs text-text-dim">
              Q{String(q.index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm">{q.question}</p>
              <p className="mt-1 truncate text-xs text-text-dim">{it.why}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-ink-3">
                <div
                  className="h-full rounded-full bg-cyan"
                  style={{ width: `${it.score}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-xs">
                {it.score}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(match): add score chip + alignment bars"
```

---

## Task 6: `/projects/[id]/manage` page (company side)

**Files:**

- Create: `app/(app)/projects/[id]/manage/page.tsx`, `app/(app)/projects/[id]/manage/_components/application-card.tsx`, `app/(app)/projects/[id]/manage/_components/accept-button.tsx`, `lib/db/queries/applications-list.ts`

- [ ] **Step 1: Create the query**

```typescript
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { applications, teams, projects, companies, researchQuestions } from "@/lib/db/schema";

export async function getApplicationsForProject(projectId: string, userId: string) {
  const db = getDb();
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      acceptedTeamId: projects.acceptedTeamId,
      ownerUserId: companies.ownerUserId,
    })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project || project.ownerUserId !== userId) return null;

  const apps = await db
    .select({
      id: applications.id,
      teamId: applications.teamId,
      teamName: teams.name,
      status: applications.status,
      matchScore: applications.matchScore,
      rationale: applications.matchRationale,
      perQuestion: applications.perQuestionAlignment,
      pitch: applications.pitch,
      createdAt: applications.createdAt,
    })
    .from(applications)
    .innerJoin(teams, eq(teams.id, applications.teamId))
    .where(eq(applications.projectId, projectId))
    .orderBy(desc(applications.matchScore));

  const questions = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, projectId))
    .orderBy(researchQuestions.orderIndex);

  return { project, applications: apps, questions };
}
```

- [ ] **Step 2: Create accept button**

`manage/_components/accept-button.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptTeam } from "@/lib/actions/applications";

export function AcceptButton({
  projectId,
  applicationId,
}: {
  projectId: string;
  applicationId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await acceptTeam({ projectId, applicationId });
      if (!res.ok) setError(res.error);
      else router.push(`/projects/${projectId}/dashboard`);
    });
  }

  return (
    <>
      <Button onClick={go} disabled={pending}>
        {pending ? "Accepting…" : "Accept this team →"}
      </Button>
      {error && <p className="mt-2 text-sm text-rose">{error}</p>}
    </>
  );
}
```

- [ ] **Step 3: Create application card**

`manage/_components/application-card.tsx`:

```typescript
import Link from "next/link";
import { ScoreChip } from "@/components/match/score-chip";
import { AlignmentBars } from "@/components/match/alignment-bars";
import { AcceptButton } from "./accept-button";

interface Application {
  id: string;
  teamId: string;
  teamName: string;
  status: "pending" | "accepted" | "rejected";
  matchScore: number;
  rationale: string;
  perQuestion: string;
  pitch: string;
  createdAt: number;
}

interface Question {
  id: string;
  question: string;
  orderIndex: number;
}

export function ApplicationCard({
  app,
  projectId,
  questions,
  canAccept,
}: {
  app: Application;
  projectId: string;
  questions: Question[];
  canAccept: boolean;
}) {
  const questionMap = Object.fromEntries(
    questions.map((q) => [q.id, { question: q.question, index: q.orderIndex }])
  );
  const items = JSON.parse(app.perQuestion) as {
    question_id: string;
    score: number;
    why: string;
  }[];

  return (
    <article className="rounded-md border border-ink-3 bg-ink-2 p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <Link
            href={`/teams/${app.teamId}`}
            className="font-display text-2xl hover:text-cyan"
          >
            {app.teamName}
          </Link>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-text-dim">
            {app.status} · applied{" "}
            {new Date(app.createdAt).toLocaleDateString()}
          </p>
        </div>
        <ScoreChip score={app.matchScore} size="md" />
      </div>

      <p className="mt-6 font-display italic text-lg leading-relaxed text-text">
        “{app.rationale}”
      </p>

      <details className="mt-6">
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-cyan">
          Per-question alignment
        </summary>
        <div className="mt-4">
          <AlignmentBars items={items} questionMap={questionMap} />
        </div>
      </details>

      <details className="mt-4">
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-cyan">
          Team's pitch
        </summary>
        <p className="mt-3 text-sm text-text">{app.pitch}</p>
      </details>

      {canAccept && app.status === "pending" && (
        <div className="mt-6 border-t border-ink-3 pt-4">
          <AcceptButton projectId={projectId} applicationId={app.id} />
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 4: Create the page**

```typescript
import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { syncUser } from "@/lib/auth/sync-user";
import { getApplicationsForProject } from "@/lib/db/queries/applications-list";
import { ApplicationCard } from "./_components/application-card";

export default async function ManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const data = await getApplicationsForProject(id, user.id);
  if (!data) notFound();

  return (
    <main className="py-16">
      <Container>
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          {data.applications.length} application
          {data.applications.length === 1 ? "" : "s"}
        </p>
        <h1 className="mt-3 font-display text-4xl">{data.project.title}</h1>
        <p className="mt-2 font-mono text-sm text-text-dim">
          status: {data.project.status}
        </p>

        <div className="mt-12 space-y-6">
          {data.applications.length === 0 ? (
            <p className="text-text-dim">
              No applications yet. Share the project link to get teams applying.
            </p>
          ) : (
            data.applications.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                projectId={data.project.id}
                questions={data.questions.map((q) => ({
                  id: q.id,
                  question: q.question,
                  orderIndex: q.orderIndex,
                }))}
                canAccept={data.project.status === "open"}
              />
            ))
          )}
        </div>
      </Container>
    </main>
  );
}
```

- [ ] **Step 5: End-to-end smoke-test**

Two browsers:

- Researcher with onboarded profile and a team → `/projects/<open-id>/apply` → submit pitch → loading skeleton (Computing concept overlap → Asking Gemini) → redirect to `/teams/<team-id>` showing the new application listed (in dashboard).
- Company → `/projects/<id>/manage` → see the new application with score, rationale, and per-question alignment expandable.
- Company clicks Accept → status flips, project redirects to `/dashboard` (alignment dashboard arrives in Plan 6).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(applications): add /projects/[id]/manage with rankings + accept"
```

---

## Definition of done for Plan 5

- [ ] Researchers can apply with their lead team via `/projects/[id]/apply`.
- [ ] Concept-overlap math runs and yields a 0-100 base score.
- [ ] AI-3 produces rationale + adjustment + per-question alignment; final score = clamp(base + adjustment, 0, 100).
- [ ] If AI-3 fails, fallback rationale uses concept-overlap text and adjustment 0.
- [ ] `/projects/[id]/manage` lists applications ranked by score, with chip + rationale + alignment bars + pitch.
- [ ] Accepting one team flips project to `in_progress`, marks others rejected, sets `accepted_team_id`.
- [ ] Math + AI tests still pass (`pnpm test`).
- [ ] Latency for AI-3: <8s with skeleton phases visible.

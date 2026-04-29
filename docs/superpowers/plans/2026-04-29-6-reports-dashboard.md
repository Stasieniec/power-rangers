# Plan 6 — Reports & Alignment Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Researchers on accepted teams submit weekly markdown reports. Gemini translates each report into per-research-question business-language cards. The company sees an alignment dashboard showing per-question progress + a feed of translation cards that animate in. This is **Pillar C** of the design.

**Architecture:** A submit form on `/projects/[id]/report` (researcher) → server action that calls AI-4 → writes `reports` + `report_findings`. The dashboard at `/projects/[id]/dashboard` aggregates findings per question and renders a feed of cards.

**Tech Stack:** Next.js server actions, Gemini, Drizzle, Tailwind keyframes for the card animation.

**Depends on:** Plans 0-5. A project must be `in_progress` (Plan 5) before reports can be submitted.

---

## File structure laid down by this plan

```
lib/
├─ ai/prompts/
│  └─ translate-report.ts                  # AI-4
├─ actions/
│  └─ reports.ts                           # submitReport
└─ db/queries/
   └─ alignment-dashboard.ts

app/(app)/projects/[id]/
├─ report/
│  ├─ page.tsx
│  └─ _components/
│     └─ report-form.tsx
└─ dashboard/
   ├─ page.tsx
   └─ _components/
      ├─ question-progress.tsx
      └─ translation-card.tsx

tests/lib/ai/prompts/
└─ translate-report.test.ts
```

---

## Task 1: AI-4 prompt + tests

**Files:**

- Create: `lib/ai/prompts/translate-report.ts`, `tests/lib/ai/prompts/translate-report.test.ts`

- [ ] **Step 1: Create the prompt module**

```typescript
import { generate } from "@/lib/ai/gemini";
import { reportFindingsSchema } from "@/lib/ai/schemas";
import type { z } from "zod";

const SYSTEM = `You translate weekly research progress reports into business-language updates that map to specific research questions.

You receive:
- The project's end-goal (business intent).
- The list of research questions with IDs.
- Optional summary of findings from prior weeks.
- This week's free-form markdown report from the research team.

You produce a list of "findings", each:
- "research_question_id": the ID of the question this finding addresses (must be in the provided list).
- "finding": the technical result, one or two sentences, in the researchers' own terms (drawn directly from the report).
- "business_translation": one or two sentences in plain business language explaining what this means for the company's goal. Avoid jargon. No metrics the report doesn't actually contain.
- "impact_note": a short phrase about timeline, cost, or risk implications. Examples: "+1 week to timeline", "Suggests pivot on Q3", "On track", "No impact yet — exploratory".

Rules:
- Only emit findings that the report actually supports.
- Skip questions with no progress this week — don't fabricate.
- Maintain the report's level of certainty; don't claim more than it does.
- Output strict JSON matching the response schema.`;

export interface TranslateReportInput {
  endGoal: string;
  questions: { id: string; question: string }[];
  priorFindingsSummary: string | null;
  reportMarkdown: string;
}

export type TranslateReportOutput = z.infer<typeof reportFindingsSchema>;

export async function translateReport(input: TranslateReportInput): Promise<TranslateReportOutput> {
  const prompt = `END-GOAL:
${input.endGoal}

RESEARCH QUESTIONS:
${input.questions.map((q) => `- [${q.id}] ${q.question}`).join("\n")}

${
  input.priorFindingsSummary ? `PRIOR FINDINGS SUMMARY:\n${input.priorFindingsSummary}\n\n` : ""
}THIS WEEK'S REPORT:
${input.reportMarkdown}

Translate the report now.`;

  return generate(reportFindingsSchema, { system: SYSTEM, prompt });
}
```

- [ ] **Step 2: Test the wrapper**

`tests/lib/ai/prompts/translate-report.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/gemini", () => ({
  generate: vi.fn(async () => ({
    findings: [
      {
        research_question_id: "q1",
        finding: "Achieved 0.87 AUC on the held-out churn cohort using XGBoost.",
        business_translation:
          "Our model can identify high-risk customers about 87% as accurately as a perfect oracle.",
        impact_note: "On track",
      },
    ],
  })),
  GeminiError: class extends Error {},
}));

import { translateReport } from "@/lib/ai/prompts/translate-report";
import { generate } from "@/lib/ai/gemini";

describe("translateReport", () => {
  it("emits findings keyed by research_question_id", async () => {
    const out = await translateReport({
      endGoal: "Predict churn",
      questions: [{ id: "q1", question: "How predict churn?" }],
      priorFindingsSummary: null,
      reportMarkdown: "## Week 1\nTrained XGBoost, AUC 0.87.",
    });
    expect(out.findings[0]?.research_question_id).toBe("q1");
    const args = (generate as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![1] as {
      prompt: string;
    };
    expect(args.prompt).toContain("Week 1");
    expect(args.prompt).toContain("Predict churn");
  });

  it("includes prior findings summary if provided", async () => {
    await translateReport({
      endGoal: "x",
      questions: [{ id: "q1", question: "x" }],
      priorFindingsSummary: "Last week: identified feature set.",
      reportMarkdown: "Week 2",
    });
    const args = (generate as unknown as { mock: { calls: unknown[][] } }).mock.calls[1]![1] as {
      prompt: string;
    };
    expect(args.prompt).toContain("PRIOR FINDINGS SUMMARY");
    expect(args.prompt).toContain("identified feature set");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ai): add translateReport (AI-4) prompt + test"
```

---

## Task 2: Submit-report server action

**Files:**

- Create: `lib/actions/reports.ts`

- [ ] **Step 1: Create `lib/actions/reports.ts`**

```typescript
"use server";

import { v7 as uuidv7 } from "uuid";
import { eq, and, desc } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { syncUser } from "@/lib/auth/sync-user";
import { reports, reportFindings, projects, researchQuestions, teamMembers } from "@/lib/db/schema";
import { translateReport } from "@/lib/ai/prompts/translate-report";

export async function submitReport(input: {
  projectId: string;
  weekOf: string; // YYYY-MM-DD
  reportMarkdown: string;
}): Promise<{ ok: true; reportId: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (!project) return { ok: false, error: "project not found" };
  if (project.status !== "in_progress") return { ok: false, error: "project must be in progress" };
  if (!project.acceptedTeamId) return { ok: false, error: "no accepted team" };

  // verify the user is on the accepted team
  const member = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, project.acceptedTeamId), eq(teamMembers.userId, user.id)),
  });
  if (!member) return { ok: false, error: "not on the accepted team" };

  const reportId = uuidv7();
  await db.insert(reports).values({
    id: reportId,
    projectId: input.projectId,
    teamId: project.acceptedTeamId,
    weekOf: input.weekOf,
    rawMarkdown: input.reportMarkdown,
    submittedByUserId: user.id,
  });

  // Build prior summary from latest 3 prior reports' translations
  const priorFindings = await db
    .select()
    .from(reportFindings)
    .innerJoin(reports, eq(reports.id, reportFindings.reportId))
    .where(eq(reports.projectId, input.projectId))
    .orderBy(desc(reports.createdAt))
    .limit(15);
  const priorSummary =
    priorFindings.length === 0
      ? null
      : priorFindings
          .map((r) => `(${r.reports.weekOf}) ${r.report_findings.businessTranslation}`)
          .join("\n");

  const qs = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, input.projectId))
    .orderBy(researchQuestions.orderIndex);

  // Run AI-4. On failure, save report without findings.
  try {
    const aiOut = await translateReport({
      endGoal: project.endGoal,
      questions: qs.map((q) => ({ id: q.id, question: q.question })),
      priorFindingsSummary: priorSummary,
      reportMarkdown: input.reportMarkdown,
    });
    if (aiOut.findings.length > 0) {
      await db.insert(reportFindings).values(
        aiOut.findings
          .filter((f) => qs.some((q) => q.id === f.research_question_id))
          .map((f) => ({
            id: uuidv7(),
            reportId,
            researchQuestionId: f.research_question_id,
            finding: f.finding,
            businessTranslation: f.business_translation,
            impactNote: f.impact_note,
          }))
      );
    }
  } catch (e) {
    console.error("translateReport failed", e);
  }

  revalidatePath(`/projects/${input.projectId}/dashboard`);
  return { ok: true, reportId };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(reports): add submitReport server action with AI-4"
```

---

## Task 3: `/projects/[id]/report` page

**Files:**

- Create: `app/(app)/projects/[id]/report/page.tsx`, `app/(app)/projects/[id]/report/_components/report-form.tsx`

- [ ] **Step 1: Create the form**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitReport } from "@/lib/actions/reports";

const TEMPLATE = `## What we did this week

-
-

## What we found

-
-

## Blockers / risks

-

## Next week's focus

-
`;

export function ReportForm({ projectId }: { projectId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [weekOf, setWeekOf] = useState(today);
  const [content, setContent] = useState(TEMPLATE);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitReport({
        projectId,
        weekOf,
        reportMarkdown: content,
      });
      if (!res.ok) setError(res.error);
      else router.push(`/projects/${projectId}/dashboard`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="max-w-xs">
        <Label htmlFor="week">Week of</Label>
        <Input
          id="week"
          type="date"
          required
          className="mt-2 font-mono"
          value={weekOf}
          onChange={(e) => setWeekOf(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="report">Report (markdown)</Label>
        <p className="mt-1 text-xs text-text-dim">
          Write in your own terms. Polymath will translate findings for the
          company side.
        </p>
        <textarea
          id="report"
          required
          rows={18}
          minLength={50}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-2 w-full rounded-sm border border-ink-3 bg-ink-3/40 px-4 py-3 font-mono text-sm text-text"
        />
      </div>

      {pending && (
        <div className="rounded-md border border-cyan/30 bg-cyan/5 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan">
            Translating findings into business language…
          </p>
          <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-ink-3" />
        </div>
      )}

      {error && <p className="text-sm text-rose">{error}</p>}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Submitting…" : "Submit report"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create the page**

```typescript
import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { Container } from "@/components/shell/container";
import { syncUser } from "@/lib/auth/sync-user";
import { getDb } from "@/lib/db/client";
import { projects, teamMembers } from "@/lib/db/schema";
import { ReportForm } from "./_components/report-form";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!project) notFound();
  if (project.status !== "in_progress" || !project.acceptedTeamId)
    redirect(`/projects/${id}`);

  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, project.acceptedTeamId),
      eq(teamMembers.userId, user.id)
    ),
  });
  if (!member) redirect(`/projects/${id}`);

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          Weekly report
        </p>
        <h1 className="mt-3 font-display text-4xl">{project.title}</h1>
        <div className="mt-12">
          <ReportForm projectId={id} />
        </div>
      </Container>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(reports): add /projects/[id]/report submission page"
```

---

## Task 4: Alignment dashboard query

**Files:**

- Create: `lib/db/queries/alignment-dashboard.ts`

- [ ] **Step 1: Create query**

```typescript
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  projects,
  researchQuestions,
  reports,
  reportFindings,
  teams,
  companies,
} from "@/lib/db/schema";

export async function getAlignmentDashboard(projectId: string, userId: string) {
  const db = getDb();
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      endGoal: projects.endGoal,
      status: projects.status,
      acceptedTeamId: projects.acceptedTeamId,
      ownerUserId: companies.ownerUserId,
      teamName: teams.name,
    })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .leftJoin(teams, eq(teams.id, projects.acceptedTeamId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return null;
  if (project.ownerUserId !== userId) return null;

  const questions = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, projectId))
    .orderBy(researchQuestions.orderIndex);

  const allReports = await db
    .select()
    .from(reports)
    .where(eq(reports.projectId, projectId))
    .orderBy(desc(reports.createdAt));

  const allFindings = await db
    .select()
    .from(reportFindings)
    .innerJoin(reports, eq(reports.id, reportFindings.reportId))
    .where(eq(reports.projectId, projectId))
    .orderBy(desc(reports.createdAt));

  const findingsByQuestion: Record<string, number> = {};
  for (const row of allFindings) {
    const id = row.report_findings.researchQuestionId;
    findingsByQuestion[id] = (findingsByQuestion[id] ?? 0) + 1;
  }

  return {
    project,
    questions: questions.map((q) => ({
      ...q,
      findingsCount: findingsByQuestion[q.id] ?? 0,
    })),
    reports: allReports,
    findings: allFindings.map((r) => ({
      reportId: r.report_findings.reportId,
      researchQuestionId: r.report_findings.researchQuestionId,
      finding: r.report_findings.finding,
      businessTranslation: r.report_findings.businessTranslation,
      impactNote: r.report_findings.impactNote,
      weekOf: r.reports.weekOf,
      createdAt: r.report_findings.createdAt,
    })),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(db): add alignment-dashboard query"
```

---

## Task 5: Dashboard UI components

**Files:**

- Create: `app/(app)/projects/[id]/dashboard/_components/question-progress.tsx`, `app/(app)/projects/[id]/dashboard/_components/translation-card.tsx`
- Modify: `app/globals.css` (add fade-up keyframe)

- [ ] **Step 1: Add the keyframe in `app/globals.css`**

Append:

```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-up {
  animation: fade-up 300ms ease-out both;
}
```

- [ ] **Step 2: Create `_components/question-progress.tsx`**

```typescript
interface Q {
  id: string;
  question: string;
  orderIndex: number;
  findingsCount: number;
}

export function QuestionProgress({
  questions,
  totalReports,
}: {
  questions: Q[];
  totalReports: number;
}) {
  return (
    <ol className="space-y-3">
      {questions.map((q) => {
        const pct =
          totalReports === 0
            ? 0
            : Math.min(100, Math.round((q.findingsCount / totalReports) * 100));
        return (
          <li
            key={q.id}
            className="grid grid-cols-[64px_1fr_72px] items-center gap-4 rounded-md border border-ink-3 bg-ink-2 p-4"
          >
            <span className="font-mono text-xs text-text-dim">
              Q{String(q.orderIndex + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base">{q.question}</p>
              <p className="mt-1 font-mono text-xs text-text-dim">
                {q.findingsCount} finding{q.findingsCount === 1 ? "" : "s"} ·{" "}
                {totalReports} reports
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-ink-3">
                <div
                  className="h-full rounded-full bg-cyan"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-xs">{pct}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 3: Create `_components/translation-card.tsx`**

```typescript
interface CardProps {
  weekOf: string;
  questionLabel: string; // e.g. "Q01"
  questionText: string;
  finding: string;
  businessTranslation: string;
  impactNote: string;
  staggerMs: number;
}

export function TranslationCard({
  weekOf,
  questionLabel,
  questionText,
  finding,
  businessTranslation,
  impactNote,
  staggerMs,
}: CardProps) {
  return (
    <article
      className="animate-fade-up rounded-md border border-ink-3 bg-ink-2 p-6"
      style={{ animationDelay: `${staggerMs}ms` }}
    >
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          {questionLabel} · {weekOf}
        </p>
        <p className="font-mono text-xs text-gold">{impactNote}</p>
      </div>
      <p className="mt-3 text-sm text-text-dim">{questionText}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
            Technical finding
          </p>
          <p className="mt-2 font-mono text-sm leading-relaxed text-text">
            {finding}
          </p>
        </div>
        <div className="border-l border-ink-3 pl-5 md:border-l">
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan">
            Business translation
          </p>
          <p className="mt-2 font-display text-base leading-relaxed text-text">
            {businessTranslation}
          </p>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(dashboard): add question-progress + translation-card components"
```

---

## Task 6: `/projects/[id]/dashboard` page

**Files:**

- Create: `app/(app)/projects/[id]/dashboard/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";
import { syncUser } from "@/lib/auth/sync-user";
import { getAlignmentDashboard } from "@/lib/db/queries/alignment-dashboard";
import { QuestionProgress } from "./_components/question-progress";
import { TranslationCard } from "./_components/translation-card";

export default async function AlignmentDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const data = await getAlignmentDashboard(id, user.id);
  if (!data) notFound();

  const questionMap = Object.fromEntries(
    data.questions.map((q) => [
      q.id,
      { question: q.question, label: `Q${String(q.orderIndex + 1).padStart(2, "0")}` },
    ])
  );

  return (
    <main className="py-16">
      <Container>
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          Alignment dashboard
        </p>
        <div className="mt-3 flex items-baseline justify-between gap-6">
          <h1 className="font-display text-4xl">{data.project.title}</h1>
          <p className="font-mono text-xs text-text-dim">
            with {data.project.teamName ?? "team"}
          </p>
        </div>
        <p className="mt-2 max-w-prose text-text-dim">
          {data.project.endGoal}
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Per-question progress</h2>
          <p className="mt-2 text-sm text-text-dim">
            Each bar reflects the share of weekly reports that have addressed
            this question.
          </p>
          <div className="mt-6">
            <QuestionProgress
              questions={data.questions.map((q) => ({
                id: q.id,
                question: q.question,
                orderIndex: q.orderIndex,
                findingsCount: q.findingsCount,
              }))}
              totalReports={data.reports.length}
            />
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Findings feed</h2>
            <p className="font-mono text-xs text-text-dim">
              {data.findings.length} translated finding
              {data.findings.length === 1 ? "" : "s"}
            </p>
          </div>
          {data.findings.length === 0 ? (
            <p className="mt-6 text-text-dim">
              No findings yet. The team will submit a weekly report soon.
            </p>
          ) : (
            <div className="mt-8 space-y-4">
              {data.findings.map((f, i) => {
                const q = questionMap[f.researchQuestionId];
                return (
                  <TranslationCard
                    key={`${f.reportId}-${f.researchQuestionId}-${i}`}
                    weekOf={f.weekOf}
                    questionLabel={q?.label ?? "Q??"}
                    questionText={q?.question ?? ""}
                    finding={f.finding}
                    businessTranslation={f.businessTranslation}
                    impactNote={f.impactNote}
                    staggerMs={i * 60}
                  />
                );
              })}
            </div>
          )}
        </section>

        {data.project.status === "in_progress" &&
          data.project.acceptedTeamId && (
            <section className="mt-16 border-t border-ink-3 pt-8">
              <p className="text-sm text-text-dim">
                On the team? Submit this week's report.
              </p>
              <Button asChild className="mt-4">
                <Link href={`/projects/${id}/report`}>+ New weekly report</Link>
              </Button>
            </section>
          )}
      </Container>
    </main>
  );
}
```

- [ ] **Step 2: Smoke-test**

End-to-end:

1. Researcher (on accepted team) → `/projects/<id>/report` → fill markdown → submit. Loading skeleton shows "Translating findings…", redirect to dashboard.
2. Company → `/projects/<id>/dashboard` → see new translation cards animate in. Each shows technical finding (mono) next to business translation (serif), with impact note in gold.
3. Per-question progress bars update.
4. Submit a 2nd report referencing different questions → dashboard reflects the change.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(dashboard): add /projects/[id]/dashboard with progress + cards"
```

---

## Task 7: Cross-link the dashboard from existing screens

**Files:**

- Modify: `app/(app)/dashboard/_components/company-dashboard.tsx` (Plan 4) — link in-progress projects to `/dashboard` instead of `/manage`
- Modify: `app/(app)/projects/[id]/manage/page.tsx` — when status is `in_progress`, show a "View alignment dashboard →" link

- [ ] **Step 1: Update company dashboard link logic**

In `company-dashboard.tsx`, change the `Link href` for projects:

```typescript
const href =
  p.status === "draft"
    ? `/projects/${p.id}/edit`
    : p.status === "in_progress" || p.status === "completed"
      ? `/projects/${p.id}/dashboard`
      : `/projects/${p.id}/manage`;
```

- [ ] **Step 2: Add link on the manage page**

In `manage/page.tsx` (Plan 5), under the project status, append:

```typescript
{data.project.status === "in_progress" && (
  <Link
    href={`/projects/${data.project.id}/dashboard`}
    className="mt-3 inline-block text-cyan hover:underline"
  >
    View alignment dashboard →
  </Link>
)}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(dashboard): cross-link dashboard from company dashboard + manage"
```

---

## Definition of done for Plan 6

- [ ] Researchers on accepted teams can submit weekly reports.
- [ ] AI-4 translates each report into per-question findings + business translations + impact notes.
- [ ] `/projects/[id]/dashboard` (company-only) shows per-question progress and a feed of translation cards.
- [ ] Cards animate in with stagger on first render.
- [ ] If AI-4 fails, the report is saved without findings (no error to user).
- [ ] Cross-links from manage page + company dashboard land on the alignment dashboard for `in_progress` projects.
- [ ] All tests still pass.

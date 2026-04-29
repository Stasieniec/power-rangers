# Plan 4 — Project Posting

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Companies can post projects via a 3-step wizard. Step 2 sends the business plan + end-goal to Gemini and receives 4-7 structured research questions (each tagged with OpenAlex concepts). The user can edit any question, regenerate the whole set, then publish to make it visible at `/projects` and `/projects/[id]`. This is **Hero Moment A**.

**Architecture:** Wizard state lives in URL search params + a single shared client component. Each step is server-rendered. Question generation is a server action that calls `lib/ai/prompts/generate-questions.ts`. After publish, project status flips to `open` and the public list/detail pages pick it up.

**Tech Stack:** Next.js 15 server actions, Gemini 3 Flash via `lib/ai/gemini.ts`, Drizzle.

**Depends on:** Plan 0 (auth + DB + Gemini wrapper), Plan 1 (public project pages render result).

---

## File structure laid down by this plan

```
lib/
├─ ai/prompts/
│  └─ generate-questions.ts              # AI-1
├─ actions/
│  └─ projects.ts                         # createDraft, regenerateQuestions, updateQuestion, publishProject
└─ db/queries/
   └─ project-edit.ts

app/(app)/
├─ dashboard/_components/
│  └─ company-dashboard.tsx
└─ projects/
   ├─ new/
   │  ├─ page.tsx                         # step 1 entry
   │  └─ _components/
   │     └─ business-plan-form.tsx
   └─ [id]/
      └─ edit/
         ├─ page.tsx                      # step 2+3 (review/edit/publish)
         └─ _components/
            ├─ questions-editor.tsx
            ├─ regenerate-button.tsx
            └─ publish-button.tsx

tests/lib/ai/prompts/
└─ generate-questions.test.ts
```

---

## Task 1: AI-1 prompt + Zod schema (already in `lib/ai/schemas.ts` from Plan 0)

**Files:**
- Create: `lib/ai/prompts/generate-questions.ts`, `tests/lib/ai/prompts/generate-questions.test.ts`

- [ ] **Step 1: Create the prompt module**

```typescript
import { generate } from "@/lib/ai/gemini";
import { generatedQuestionsSchema } from "@/lib/ai/schemas";
import type { z } from "zod";

const SYSTEM = `You are a senior research strategist who turns business goals into precise, fundable research questions.

You receive: a company's raw business plan, their stated end-goal, and the project title.
You produce: 4 to 7 well-formed research questions a competent research team could compete to answer.

For each question:
- "question": a single, focused, answerable question. No compound questions. Target 12-25 words.
- "rationale": 1-2 sentences linking the question to the business goal — written in business-friendly language a non-researcher can verify.
- "order_index": 0-based; order them from foundational to advanced.
- "concepts": 2-5 concept tags drawn from a research vocabulary (machine learning, epidemiology, optimization, signal processing, NLP, etc.), each weighted 0..1 by centrality to the question.

Quality bar:
- Every question must be researchable: it has a falsifiable answer, can be supported by data or experiments, and is at the right scope for a 4-12 week effort.
- Avoid implementation tasks ("build a dashboard") — those are not research questions.
- Avoid vague questions like "How can we improve X?" — be specific about WHAT, FOR WHOM, MEASURED HOW.

Output strict JSON matching the response schema. No prose.

EXAMPLE 1
Input business plan: "We're a B2B SaaS for SMB retailers. Customers churn at 8% monthly. We want to predict churn and intervene."
Input end-goal: "A churn-risk score per customer, recomputed weekly, with intervention recommendations."
Output (excerpt):
[
  {
    "question": "Which customer-behavior signals from the last 30 days predict churn within the next 14 days for SMB SaaS retailers?",
    "rationale": "Establishes the predictive feature set the rest of the project depends on.",
    "order_index": 0,
    "concepts": [{"label": "survival analysis", "weight": 0.7}, {"label": "feature engineering", "weight": 0.6}]
  }
]

EXAMPLE 2
Input business plan: "Hospital chain wants to reduce 30-day readmission for cardiac patients."
Input end-goal: "Identify patients at high readmission risk at discharge; deliver to care managers."
Output (excerpt):
[
  {
    "question": "Which combinations of EHR-derived comorbidities and discharge-medication regimens most strongly predict 30-day cardiac readmission?",
    "rationale": "Identifies the variables the risk model must include to be clinically defensible.",
    "order_index": 0,
    "concepts": [{"label": "epidemiology", "weight": 0.7}, {"label": "predictive modeling", "weight": 0.7}]
  }
]
`;

export interface GenerateQuestionsInput {
  title: string;
  businessPlan: string;
  endGoal: string;
}

export type GenerateQuestionsOutput = z.infer<typeof generatedQuestionsSchema>;

export async function generateQuestions(
  input: GenerateQuestionsInput
): Promise<GenerateQuestionsOutput> {
  const prompt = `Project title: ${input.title}

Business plan:
${input.businessPlan}

Stated end-goal:
${input.endGoal}

Produce the research questions now.`;

  return generate(generatedQuestionsSchema, { system: SYSTEM, prompt });
}
```

- [ ] **Step 2: Test the wrapper**

`tests/lib/ai/prompts/generate-questions.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/gemini", () => ({
  generate: vi.fn(async () => ({
    questions: [
      {
        question: "How can churn signals be predicted from the last 30 days?",
        rationale: "Establishes the predictive feature set.",
        order_index: 0,
        concepts: [{ label: "survival analysis", weight: 0.7 }],
      },
      {
        question: "Which interventions reduce churn given high-risk scores?",
        rationale: "Validates intervention design.",
        order_index: 1,
        concepts: [{ label: "experimental design", weight: 0.6 }],
      },
      {
        question: "How should risk scores be calibrated weekly without model drift?",
        rationale: "Ensures sustainable production deployment.",
        order_index: 2,
        concepts: [{ label: "model calibration", weight: 0.6 }],
      },
    ],
  })),
  GeminiError: class extends Error {},
}));

import { generateQuestions } from "@/lib/ai/prompts/generate-questions";
import { generate } from "@/lib/ai/gemini";

describe("generateQuestions", () => {
  it("returns parsed questions and includes inputs in prompt", async () => {
    const out = await generateQuestions({
      title: "Churn prediction",
      businessPlan: "B2B SaaS, 8% churn",
      endGoal: "Risk score per customer",
    });
    expect(out.questions.length).toBeGreaterThanOrEqual(3);
    const args = (generate as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![1] as { system: string; prompt: string };
    expect(args.prompt).toContain("Churn prediction");
    expect(args.prompt).toContain("B2B SaaS");
    expect(args.system).toContain("research strategist");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm test tests/lib/ai/prompts/generate-questions.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ai): add generateQuestions (AI-1) prompt + test"
```

---

## Task 2: Project server actions

**Files:**
- Create: `lib/actions/projects.ts`

- [ ] **Step 1: Create `lib/actions/projects.ts`**

```typescript
"use server";

import { v7 as uuidv7 } from "uuid";
import { eq, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { syncUser } from "@/lib/auth/sync-user";
import {
  projects,
  researchQuestions,
  companies,
} from "@/lib/db/schema";
import { generateQuestions } from "@/lib/ai/prompts/generate-questions";

async function ensureCompany(userId: string) {
  const db = getDb();
  const existing = await db.query.companies.findFirst({
    where: eq(companies.ownerUserId, userId),
  });
  if (existing) return existing;
  const id = uuidv7();
  await db.insert(companies).values({
    id,
    ownerUserId: userId,
    name: "Untitled Company",
  });
  return { id, ownerUserId: userId, name: "Untitled Company" };
}

export async function createDraftProject(input: {
  title: string;
  businessPlan: string;
  endGoal: string;
}): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);
  if (user.role !== "company")
    return { ok: false, error: "only companies can post projects" };

  const company = await ensureCompany(user.id);
  const projectId = uuidv7();
  const db = getDb();

  await db.insert(projects).values({
    id: projectId,
    companyId: company.id,
    title: input.title.trim(),
    businessPlan: input.businessPlan.trim(),
    endGoal: input.endGoal.trim(),
    status: "draft",
  });

  // Run AI-1 inline; failure leaves the project with no questions, user can regenerate.
  try {
    const result = await generateQuestions({
      title: input.title.trim(),
      businessPlan: input.businessPlan.trim(),
      endGoal: input.endGoal.trim(),
    });
    await db.insert(researchQuestions).values(
      result.questions.map((q) => ({
        id: uuidv7(),
        projectId,
        question: q.question,
        rationale: q.rationale,
        orderIndex: q.order_index,
        aiGenerated: true,
        concepts: JSON.stringify(q.concepts),
      }))
    );
  } catch (e) {
    // swallow; user will see "regenerate" button on the edit screen
    console.error("generateQuestions failed", e);
  }

  return { ok: true, projectId };
}

export async function regenerateQuestions(
  projectId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(and(eq(projects.id, projectId), eq(companies.ownerUserId, user.id)))
    .limit(1);
  if (!project) return { ok: false, error: "project not found" };
  if (project.projects.status !== "draft")
    return { ok: false, error: "can only regenerate on draft projects" };

  const result = await generateQuestions({
    title: project.projects.title,
    businessPlan: project.projects.businessPlan,
    endGoal: project.projects.endGoal,
  });

  await db.delete(researchQuestions).where(eq(researchQuestions.projectId, projectId));
  await db.insert(researchQuestions).values(
    result.questions.map((q) => ({
      id: uuidv7(),
      projectId,
      question: q.question,
      rationale: q.rationale,
      orderIndex: q.order_index,
      aiGenerated: true,
      concepts: JSON.stringify(q.concepts),
    }))
  );

  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

export async function updateQuestion(input: {
  projectId: string;
  questionId: string;
  question: string;
  rationale: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const db = getDb();
  const [project] = await db
    .select({ projectId: projects.id, status: projects.status, ownerUserId: companies.ownerUserId })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (!project || project.ownerUserId !== user.id)
    return { ok: false, error: "project not found" };
  if (project.status !== "draft")
    return { ok: false, error: "can only edit questions on draft projects" };

  await db
    .update(researchQuestions)
    .set({
      question: input.question.trim(),
      rationale: input.rationale.trim(),
      aiGenerated: false,
    })
    .where(eq(researchQuestions.id, input.questionId));

  revalidatePath(`/projects/${input.projectId}/edit`);
  return { ok: true };
}

export async function publishProject(
  projectId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const db = getDb();
  const [project] = await db
    .select({ projectId: projects.id, status: projects.status, ownerUserId: companies.ownerUserId })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project || project.ownerUserId !== user.id)
    return { ok: false, error: "project not found" };
  if (project.status !== "draft")
    return { ok: false, error: "already published" };

  const qs = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, projectId));
  if (qs.length === 0)
    return { ok: false, error: "publish requires at least one research question" };

  await db.update(projects).set({ status: "open", updatedAt: Date.now() }).where(eq(projects.id, projectId));
  revalidatePath(`/projects`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(projects): add createDraftProject, regenerate, update, publish actions"
```

---

## Task 3: Project edit query

**Files:**
- Create: `lib/db/queries/project-edit.ts`

- [ ] **Step 1: Create the query**

```typescript
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { projects, researchQuestions, companies } from "@/lib/db/schema";

export async function getProjectForEdit(projectId: string, userId: string) {
  const db = getDb();
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      businessPlan: projects.businessPlan,
      endGoal: projects.endGoal,
      status: projects.status,
      companyName: companies.name,
      ownerUserId: companies.ownerUserId,
    })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project || project.ownerUserId !== userId) return null;

  const questions = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, projectId))
    .orderBy(researchQuestions.orderIndex);

  return { project, questions };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(db): add getProjectForEdit query"
```

---

## Task 4: `/projects/new` (step 1 — input)

**Files:**
- Create: `app/(app)/projects/new/page.tsx`, `app/(app)/projects/new/_components/business-plan-form.tsx`

- [ ] **Step 1: Create the form**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDraftProject } from "@/lib/actions/projects";

export function BusinessPlanForm() {
  const [title, setTitle] = useState("");
  const [businessPlan, setBusinessPlan] = useState("");
  const [endGoal, setEndGoal] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createDraftProject({ title, businessPlan, endGoal });
      if (!res.ok) setError(res.error);
      else router.push(`/projects/${res.projectId}/edit`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <div>
        <Label htmlFor="title">Project title</Label>
        <Input
          id="title"
          required
          maxLength={120}
          className="mt-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="business-plan">Business plan</Label>
        <p className="mt-1 text-xs text-text-dim">
          Paste the relevant background — what your company does, who the
          customers are, what problem you're solving.
        </p>
        <textarea
          id="business-plan"
          required
          rows={8}
          maxLength={4000}
          value={businessPlan}
          onChange={(e) => setBusinessPlan(e.target.value)}
          className="mt-2 w-full rounded-sm border border-ink-3 bg-ink-3/40 px-4 py-3 text-text placeholder:text-text-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
        />
      </div>
      <div>
        <Label htmlFor="end-goal">End-goal</Label>
        <p className="mt-1 text-xs text-text-dim">
          What concrete artifact or insight would success look like?
        </p>
        <textarea
          id="end-goal"
          required
          rows={3}
          maxLength={500}
          value={endGoal}
          onChange={(e) => setEndGoal(e.target.value)}
          className="mt-2 w-full rounded-sm border border-ink-3 bg-ink-3/40 px-4 py-3 text-text placeholder:text-text-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
        />
      </div>

      {pending && (
        <div className="rounded-md border border-cyan/30 bg-cyan/5 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan">
            Generating research questions with Gemini…
          </p>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-ink-3" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-ink-3" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-ink-3" />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-rose">{error}</p>}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Generating…" : "Generate research questions"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create the page**

```typescript
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { BusinessPlanForm } from "./_components/business-plan-form";
import { syncUser } from "@/lib/auth/sync-user";

export default async function NewProjectPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);
  if (user.role !== "company") redirect("/dashboard");

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          New project · Step 1 of 2
        </p>
        <h1 className="mt-3 font-display text-5xl">
          Tell us your end-goal.
        </h1>
        <p className="mt-4 text-text-dim">
          Polymath translates your business intent into research questions you
          can compete on. You'll get a chance to edit them before publishing.
        </p>
        <div className="mt-12">
          <BusinessPlanForm />
        </div>
      </Container>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(projects): add /projects/new wizard step 1"
```

---

## Task 5: `/projects/[id]/edit` (step 2 — review/regenerate/publish)

**Files:**
- Create: `app/(app)/projects/[id]/edit/page.tsx`, `app/(app)/projects/[id]/edit/_components/questions-editor.tsx`, `app/(app)/projects/[id]/edit/_components/regenerate-button.tsx`, `app/(app)/projects/[id]/edit/_components/publish-button.tsx`

- [ ] **Step 1: Create `_components/regenerate-button.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { regenerateQuestions } from "@/lib/actions/projects";

export function RegenerateButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await regenerateQuestions(projectId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={go} disabled={pending}>
        {pending ? "Regenerating…" : "↻ Regenerate"}
      </Button>
      {error && <p className="mt-2 text-sm text-rose">{error}</p>}
    </>
  );
}
```

- [ ] **Step 2: Create `_components/questions-editor.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateQuestion } from "@/lib/actions/projects";

interface Q {
  id: string;
  question: string;
  rationale: string;
  orderIndex: number;
}

export function QuestionsEditor({
  projectId,
  questions,
}: {
  projectId: string;
  questions: Q[];
}) {
  return (
    <ol className="space-y-8">
      {questions.map((q, i) => (
        <QuestionRow key={q.id} projectId={projectId} q={q} index={i} />
      ))}
    </ol>
  );
}

function QuestionRow({
  projectId,
  q,
  index,
}: {
  projectId: string;
  q: Q;
  index: number;
}) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(q.question);
  const [rationale, setRationale] = useState(q.rationale);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateQuestion({
        projectId,
        questionId: q.id,
        question,
        rationale,
      });
      if (!res.ok) setError(res.error);
      else setEditing(false);
    });
  }

  return (
    <li className="border-l-2 border-ink-3 pl-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-xs text-cyan">
          Q{String(index + 1).padStart(2, "0")}
        </p>
        {!editing ? (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => {
              setEditing(false);
              setQuestion(q.question);
              setRationale(q.rationale);
            }}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>
      {!editing ? (
        <>
          <p className="mt-2 font-display text-2xl leading-snug">{q.question}</p>
          <p className="mt-3 text-text-dim">{q.rationale}</p>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <textarea
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded-sm border border-ink-3 bg-ink-3/40 px-3 py-2 font-display text-xl"
          />
          <textarea
            rows={3}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            className="w-full rounded-sm border border-ink-3 bg-ink-3/40 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-rose">{error}</p>}
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 3: Create `_components/publish-button.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { publishProject } from "@/lib/actions/projects";

export function PublishButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function publish() {
    setError(null);
    startTransition(async () => {
      const res = await publishProject(projectId);
      if (!res.ok) setError(res.error);
      else router.push(`/projects/${projectId}`);
    });
  }

  return (
    <>
      <Button size="lg" onClick={publish} disabled={pending}>
        {pending ? "Publishing…" : "Publish project →"}
      </Button>
      {error && <p className="mt-3 text-sm text-rose">{error}</p>}
    </>
  );
}
```

- [ ] **Step 4: Create the page**

```typescript
import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { syncUser } from "@/lib/auth/sync-user";
import { getProjectForEdit } from "@/lib/db/queries/project-edit";
import { QuestionsEditor } from "./_components/questions-editor";
import { RegenerateButton } from "./_components/regenerate-button";
import { PublishButton } from "./_components/publish-button";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const data = await getProjectForEdit(id, user.id);
  if (!data) notFound();

  if (data.project.status !== "draft") redirect(`/projects/${id}`);

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          New project · Step 2 of 2
        </p>
        <h1 className="mt-3 font-display text-4xl">
          Review research questions.
        </h1>
        <p className="mt-3 text-text-dim">
          Edit anything that doesn't sound right. Regenerate the whole set if
          you want to start over.
        </p>

        <div className="mt-8 flex items-center justify-between rounded-md border border-ink-3 bg-ink-2 p-4">
          <div>
            <p className="font-display text-lg">{data.project.title}</p>
            <p className="font-mono text-xs text-text-dim">
              {data.questions.length} questions · draft
            </p>
          </div>
          <RegenerateButton projectId={data.project.id} />
        </div>

        <div className="mt-12">
          {data.questions.length === 0 ? (
            <p className="text-text-dim">
              No questions yet. Click Regenerate to try again.
            </p>
          ) : (
            <QuestionsEditor
              projectId={data.project.id}
              questions={data.questions}
            />
          )}
        </div>

        <div className="mt-16 border-t border-ink-3 pt-8">
          <p className="text-sm text-text-dim">
            Once published, research teams can apply. Questions are frozen on
            publish.
          </p>
          <div className="mt-6">
            <PublishButton projectId={data.project.id} />
          </div>
        </div>
      </Container>
    </main>
  );
}
```

- [ ] **Step 5: Smoke-test the full flow**

Sign in as a company. Visit `/projects/new`:
1. Fill in title, business plan, end-goal. Submit.
2. Watch the loading skeleton, redirect to `/projects/<id>/edit`.
3. See 4-7 AI-generated questions. Edit one inline. Save.
4. Click Regenerate. Different questions appear.
5. Click Publish. Redirect to public `/projects/<id>` with status `open`.
6. `/projects` lists the new project.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(projects): add /projects/[id]/edit step 2 (review/regenerate/publish)"
```

---

## Task 6: Company dashboard

**Files:**
- Create: `lib/db/queries/company-dashboard.ts`, `app/(app)/dashboard/_components/company-dashboard.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create query**

```typescript
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { projects, applications, companies } from "@/lib/db/schema";

export async function getCompanyDashboard(userId: string) {
  const db = getDb();
  const company = await db.query.companies.findFirst({
    where: eq(companies.ownerUserId, userId),
  });
  if (!company) return { company: null, projects: [] };

  const myProjects = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.companyId, company.id))
    .orderBy(desc(projects.createdAt));

  // attach pending application counts
  const counts: Record<string, number> = {};
  for (const p of myProjects) {
    const apps = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.projectId, p.id));
    counts[p.id] = apps.length;
  }
  return { company, projects: myProjects.map((p) => ({ ...p, applicantCount: counts[p.id] ?? 0 })) };
}
```

- [ ] **Step 2: Create company dashboard component**

`app/(app)/dashboard/_components/company-dashboard.tsx`:

```typescript
import Link from "next/link";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  title: string;
  status: string;
  createdAt: number;
  applicantCount: number;
}

export function CompanyDashboard({
  displayName,
  projects,
}: {
  displayName: string;
  projects: Project[];
}) {
  return (
    <main className="py-16">
      <Container>
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          Company
        </p>
        <h1 className="mt-3 font-display text-4xl">Welcome, {displayName}</h1>

        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Your projects</h2>
            <Button asChild>
              <Link href="/projects/new">+ New project</Link>
            </Button>
          </div>
          {projects.length === 0 ? (
            <p className="mt-6 text-text-dim">
              No projects yet. Post one and let researchers compete.
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-ink-3 bg-ink-2 p-5"
                >
                  <div>
                    <Link
                      href={
                        p.status === "draft"
                          ? `/projects/${p.id}/edit`
                          : `/projects/${p.id}/manage`
                      }
                      className="font-display text-xl hover:text-cyan"
                    >
                      {p.title}
                    </Link>
                    <p className="mt-1 font-mono text-xs text-text-dim">
                      {p.status} ·{" "}
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl text-cyan">
                      {p.applicantCount}
                    </p>
                    <p className="font-mono text-xs uppercase tracking-widest text-text-dim">
                      applicants
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </main>
  );
}
```

- [ ] **Step 3: Wire into dashboard page**

Modify `app/(app)/dashboard/page.tsx` company branch:

```typescript
// At top:
import { getCompanyDashboard } from "@/lib/db/queries/company-dashboard";
import { CompanyDashboard } from "./_components/company-dashboard";

// In the company branch (replacing the placeholder):
if (user.role === "company") {
  const { projects } = await getCompanyDashboard(user.id);
  return <CompanyDashboard displayName={user.displayName} projects={projects} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(dashboard): add company dashboard with project list"
```

---

## Definition of done for Plan 4

- [ ] `/projects/new` renders for company users only.
- [ ] Step 1 submission generates 4-7 research questions via Gemini.
- [ ] `/projects/[id]/edit` allows editing each question and regenerating.
- [ ] Publish flips status to `open`; the project appears at `/projects` and `/projects/[id]`.
- [ ] Company dashboard lists their projects with applicant counts.
- [ ] Edit/regenerate/publish all gate to the project's owning company.
- [ ] Latency for AI-1: <8s end-to-end with skeleton UI visible.
- [ ] All previous tests still pass.

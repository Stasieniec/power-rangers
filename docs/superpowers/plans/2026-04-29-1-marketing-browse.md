# Plan 1 — Marketing & Public Browse

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the public-facing surface — landing page, browseable projects/teams/researchers — that judges can deep-link into and click around without signing up. All content reads from D1; seed data populates it.

**Architecture:** Server-rendered pages under route groups `(marketing)` (no shell) and `(public)` (browse layout with light navbar). All data fetching happens in RSC server components via Drizzle queries. No client-side state.

**Tech Stack:** Next.js 15 RSC, Drizzle, Tailwind tokens from Plan 0, Lucide icons.

**Depends on:** Plan 0 complete.

---

## File structure laid down by this plan

```
app/
├─ (marketing)/
│  └─ page.tsx                             # landing
├─ (public)/
│  ├─ layout.tsx                            # browse shell (navbar)
│  ├─ projects/
│  │  ├─ page.tsx                           # list
│  │  └─ [id]/page.tsx                      # detail
│  ├─ teams/[id]/page.tsx
│  └─ researchers/[id]/page.tsx
components/
├─ marketing/
│  ├─ hero.tsx
│  ├─ pillars.tsx
│  ├─ cta.tsx
│  └─ circuit-pattern.tsx                   # decorative SVG
├─ shell/
│  ├─ public-nav.tsx
│  ├─ footer.tsx
│  └─ container.tsx
├─ project/
│  ├─ project-card.tsx
│  ├─ project-meta.tsx
│  └─ research-question-card.tsx
├─ team/
│  ├─ team-card.tsx
│  └─ expertise-cloud.tsx
└─ researcher/
   ├─ researcher-card.tsx
   ├─ publication-list.tsx
   └─ expertise-tags.tsx
lib/db/queries/
├─ projects.ts
├─ teams.ts
└─ researchers.ts
public/
├─ pattern-circuit.svg
└─ og-image.png                             # placeholder; updated later
```

---

## Task 1: Public navigation shell

**Files:**

- Create: `components/shell/public-nav.tsx`, `components/shell/footer.tsx`, `components/shell/container.tsx`, `app/(public)/layout.tsx`

- [ ] **Step 1: Create `components/shell/container.tsx`**

```typescript
import { cn } from "@/lib/utils";

export function Container({
  className,
  width = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { width?: "default" | "narrow" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6",
        width === "narrow" ? "max-w-[720px]" : "max-w-[1200px]",
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Create `components/shell/public-nav.tsx`**

```typescript
import Link from "next/link";
import { Container } from "./container";

export function PublicNav() {
  return (
    <header className="border-b border-ink-3/60">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-xl tracking-tight">
          Polymath
        </Link>
        <nav className="flex items-center gap-8 text-sm">
          <Link href="/projects" className="text-text-dim hover:text-text">
            Projects
          </Link>
          <Link href="/sign-in" className="text-text-dim hover:text-text">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-sm bg-cyan px-4 py-1.5 font-medium text-ink hover:bg-cyan-dim hover:text-text"
          >
            Get started
          </Link>
        </nav>
      </Container>
    </header>
  );
}
```

- [ ] **Step 3: Create `components/shell/footer.tsx`**

```typescript
import { Container } from "./container";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-ink-3/60 py-10">
      <Container className="flex items-center justify-between text-sm text-text-dim">
        <span className="font-display">Polymath</span>
        <span className="font-mono text-xs">
          built by Power Rangers · 2026
        </span>
      </Container>
    </footer>
  );
}
```

- [ ] **Step 4: Create `app/(public)/layout.tsx`**

```typescript
import { PublicNav } from "@/components/shell/public-nav";
import { Footer } from "@/components/shell/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      {children}
      <Footer />
    </>
  );
}
```

- [ ] **Step 5: Smoke-check**

Run `pnpm dev` and visit `/projects` (404 page renders inside the layout — that's fine for now). Verify the nav and footer show.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(shell): add public nav + footer + container"
```

---

## Task 2: Landing page

**Files:**

- Create: `components/marketing/hero.tsx`, `components/marketing/pillars.tsx`, `components/marketing/cta.tsx`, `components/marketing/circuit-pattern.tsx`, `public/pattern-circuit.svg`
- Modify: `app/page.tsx` (move into `(marketing)` group)

- [ ] **Step 1: Move `app/page.tsx` into `app/(marketing)/page.tsx`**

```bash
mkdir -p app/\(marketing\)
git mv app/page.tsx app/\(marketing\)/page.tsx
```

Create `app/(marketing)/layout.tsx`:

```typescript
import { PublicNav } from "@/components/shell/public-nav";
import { Footer } from "@/components/shell/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      {children}
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Create `components/marketing/circuit-pattern.tsx`**

```typescript
export function CircuitPattern({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 600"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="cp" x1="0" x2="1">
          <stop offset="0%" stopColor="#1A6E78" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3FCEDB" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M0 200 L300 200 L320 220 L600 220 L620 200 L900 200 L920 180 L1200 180"
        stroke="url(#cp)"
        strokeWidth="1"
      />
      <path
        d="M0 350 L200 350 L220 330 L500 330 L520 350 L800 350 L820 370 L1200 370"
        stroke="url(#cp)"
        strokeWidth="1"
      />
      <circle cx="320" cy="220" r="3" fill="#3FCEDB" fillOpacity="0.4" />
      <circle cx="620" cy="200" r="3" fill="#3FCEDB" fillOpacity="0.4" />
      <circle cx="220" cy="330" r="3" fill="#3FCEDB" fillOpacity="0.4" />
      <circle cx="820" cy="370" r="3" fill="#3FCEDB" fillOpacity="0.4" />
    </svg>
  );
}
```

- [ ] **Step 3: Create `components/marketing/hero.tsx`**

```typescript
import Link from "next/link";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";
import { CircuitPattern } from "./circuit-pattern";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink-3/60 py-32">
      <CircuitPattern className="absolute inset-0 -z-0 h-full w-full opacity-60" />
      <Container className="relative">
        <p className="mb-6 font-mono text-xs uppercase tracking-widest text-cyan">
          Research × Business
        </p>
        <h1 className="max-w-3xl font-display text-6xl leading-[1.05] md:text-7xl">
          Research,
          <br />
          <span className="italic text-text-dim">posed as a competition.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-text-dim">
          Polymath translates business goals into structured research questions,
          matches them to the right teams using real publication data, and keeps
          progress legible to both sides.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Button size="lg" asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href="/projects">Browse open projects →</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: Create `components/marketing/pillars.tsx`**

```typescript
import { Container } from "@/components/shell/container";

const pillars = [
  {
    n: "01",
    title: "Project Posting",
    body: "A company writes its end-goal in plain language. An AI translation layer converts it into structured research questions — versioned, editable, defensible.",
  },
  {
    n: "02",
    title: "Application Process",
    body: "Researchers connect their ORCID. Their publication history becomes a living expertise profile. Teams form. Match scores combine real concept overlap with AI-written rationale.",
  },
  {
    n: "03",
    title: "Alignment Environment",
    body: "Teams submit weekly reports in their own technical language. Polymath translates them into business-side cards — KPI deltas, timeline impact, plain-English findings.",
  },
];

export function Pillars() {
  return (
    <section className="py-32">
      <Container>
        <h2 className="mb-16 max-w-2xl font-display text-4xl">
          Three pillars,{" "}
          <span className="italic text-text-dim">one common ground.</span>
        </h2>
        <div className="grid gap-12 md:grid-cols-3">
          {pillars.map((p) => (
            <article key={p.n} className="border-l border-ink-3 pl-6">
              <div className="font-mono text-xs text-cyan">{p.n}</div>
              <h3 className="mt-2 font-display text-2xl">{p.title}</h3>
              <p className="mt-4 text-text-dim">{p.body}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 5: Create `components/marketing/cta.tsx`**

```typescript
import Link from "next/link";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="border-t border-ink-3/60 py-32">
      <Container width="narrow" className="text-center">
        <h2 className="font-display text-5xl">
          Post a project,{" "}
          <span className="italic text-text-dim">find a team.</span>
        </h2>
        <p className="mt-6 text-lg text-text-dim">
          Or start a research team and put your work to use beyond the paper.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/sign-up">Sign up</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/projects">See open projects</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 6: Replace `app/(marketing)/page.tsx`**

```typescript
import { Hero } from "@/components/marketing/hero";
import { Pillars } from "@/components/marketing/pillars";
import { Cta } from "@/components/marketing/cta";

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <Pillars />
      <Cta />
    </main>
  );
}
```

- [ ] **Step 7: Visual smoke check**

`pnpm dev`, visit `/`. Verify:

- Fraunces hero header renders with the italic "posed as a competition" in a dimmer color.
- Circuit pattern visible behind the hero, low opacity.
- Three pillars in a 3-column grid with `01/02/03` monospace labels in cyan.
- CTA section centered.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(marketing): build landing page (hero, pillars, CTA)"
```

---

## Task 3: Project queries (server-side data layer)

**Files:**

- Create: `lib/db/queries/projects.ts`, `lib/db/queries/teams.ts`, `lib/db/queries/researchers.ts`

- [ ] **Step 1: Create `lib/db/queries/projects.ts`**

```typescript
import { desc, eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { projects, researchQuestions, companies, applications } from "@/lib/db/schema";

export type ProjectListItem = Awaited<ReturnType<typeof listOpenProjects>>[number];

export async function listOpenProjects() {
  const db = getDb();
  return db
    .select({
      id: projects.id,
      title: projects.title,
      endGoal: projects.endGoal,
      status: projects.status,
      createdAt: projects.createdAt,
      companyName: companies.name,
      companyId: companies.id,
    })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.status, "open"))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectDetail(id: string) {
  const db = getDb();
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      businessPlan: projects.businessPlan,
      endGoal: projects.endGoal,
      status: projects.status,
      acceptedTeamId: projects.acceptedTeamId,
      createdAt: projects.createdAt,
      companyName: companies.name,
      companyId: companies.id,
      companyDescription: companies.description,
      companyWebsite: companies.website,
    })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, id))
    .limit(1);
  if (!project) return null;

  const questions = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, id))
    .orderBy(researchQuestions.orderIndex);

  const appCount = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.projectId, id), eq(applications.status, "pending")));

  return { ...project, questions, applicantCount: appCount.length };
}
```

- [ ] **Step 2: Create `lib/db/queries/teams.ts`**

```typescript
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { teams, teamMembers, users, researchers, researcherConcepts } from "@/lib/db/schema";

export async function getTeamDetail(id: string) {
  const db = getDb();
  const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  if (!team) return null;

  const members = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      role: teamMembers.role,
      researcherId: researchers.id,
      headline: researchers.headline,
      affiliation: researchers.affiliation,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .leftJoin(researchers, eq(researchers.userId, users.id))
    .where(eq(teamMembers.teamId, id));

  const researcherIds = members.map((m) => m.researcherId).filter((x): x is string => Boolean(x));

  let concepts: { concept: string; score: number }[] = [];
  if (researcherIds.length > 0) {
    const rows = await db
      .select({ concept: researcherConcepts.concept, score: researcherConcepts.score })
      .from(researcherConcepts)
      .where(inArray(researcherConcepts.researcherId, researcherIds));

    const byConcept = new Map<string, number>();
    for (const r of rows) {
      byConcept.set(r.concept, (byConcept.get(r.concept) ?? 0) + r.score);
    }
    const max = Math.max(1, ...byConcept.values());
    concepts = [...byConcept.entries()]
      .map(([concept, total]) => ({ concept, score: total / max }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }

  return { ...team, members, concepts };
}
```

- [ ] **Step 3: Create `lib/db/queries/researchers.ts`**

```typescript
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { researchers, publications, researcherConcepts, users } from "@/lib/db/schema";

export async function getResearcherDetail(id: string) {
  const db = getDb();
  const [r] = await db
    .select({
      id: researchers.id,
      userId: researchers.userId,
      orcid: researchers.orcid,
      affiliation: researchers.affiliation,
      headline: researchers.headline,
      aiSummary: researchers.aiSummary,
      displayName: users.displayName,
    })
    .from(researchers)
    .innerJoin(users, eq(users.id, researchers.userId))
    .where(eq(researchers.id, id))
    .limit(1);
  if (!r) return null;

  const pubs = await db
    .select()
    .from(publications)
    .where(eq(publications.researcherId, id))
    .orderBy(desc(publications.year));

  const concepts = await db
    .select()
    .from(researcherConcepts)
    .where(eq(researcherConcepts.researcherId, id))
    .orderBy(desc(researcherConcepts.score));

  return { ...r, publications: pubs, concepts };
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(db): add public read queries for projects, teams, researchers"
```

---

## Task 4: Public projects list page

**Files:**

- Create: `components/project/project-card.tsx`, `app/(public)/projects/page.tsx`

- [ ] **Step 1: Create `components/project/project-card.tsx`**

```typescript
import Link from "next/link";
import type { ProjectListItem } from "@/lib/db/queries/projects";

export function ProjectCard({ p }: { p: ProjectListItem }) {
  return (
    <Link
      href={`/projects/${p.id}`}
      className="group block border-b border-ink-3 py-8 transition-colors hover:bg-ink-2/30"
    >
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-text-dim">
          {p.companyName}
        </p>
        <p className="font-mono text-xs text-text-dim">
          {new Date(p.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
      <h3 className="mt-3 font-display text-2xl text-text group-hover:text-cyan">
        {p.title}
      </h3>
      <p className="mt-3 max-w-2xl text-text-dim">{p.endGoal}</p>
    </Link>
  );
}
```

- [ ] **Step 2: Create `app/(public)/projects/page.tsx`**

```typescript
import { Container } from "@/components/shell/container";
import { ProjectCard } from "@/components/project/project-card";
import { listOpenProjects } from "@/lib/db/queries/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsListPage() {
  const projects = await listOpenProjects();

  return (
    <main className="py-16">
      <Container>
        <header className="mb-12 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan">
            Open projects
          </p>
          <h1 className="mt-3 font-display text-5xl">
            {projects.length}{" "}
            {projects.length === 1 ? "project" : "projects"} taking applications.
          </h1>
        </header>
        {projects.length === 0 ? (
          <p className="text-text-dim">
            No open projects yet. Check back after the demo runs.
          </p>
        ) : (
          <div>
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
```

- [ ] **Step 3: Smoke-test**

`pnpm dev`, visit `/projects`. Empty state should render ("No open projects yet"). After Plan 7 seed runs, projects appear.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(public): add /projects list page"
```

---

## Task 5: Public project detail page

**Files:**

- Create: `components/project/research-question-card.tsx`, `components/project/project-meta.tsx`, `app/(public)/projects/[id]/page.tsx`

- [ ] **Step 1: Create `components/project/research-question-card.tsx`**

```typescript
export function ResearchQuestionCard({
  question,
  rationale,
  index,
}: {
  question: string;
  rationale: string;
  index: number;
}) {
  return (
    <article className="border-l-2 border-ink-3 pl-6 py-4">
      <p className="font-mono text-xs text-cyan">
        Q{String(index + 1).padStart(2, "0")}
      </p>
      <p className="mt-2 font-display text-2xl leading-snug">
        <span className="font-display text-3xl text-gold">
          {question.slice(0, 1)}
        </span>
        {question.slice(1)}
      </p>
      <p className="mt-3 text-text-dim">{rationale}</p>
    </article>
  );
}
```

- [ ] **Step 2: Create `components/project/project-meta.tsx`**

```typescript
export function ProjectMeta({
  status,
  applicantCount,
  createdAt,
}: {
  status: string;
  applicantCount: number;
  createdAt: number;
}) {
  return (
    <dl className="grid grid-cols-3 gap-6 border-y border-ink-3 py-4 font-mono text-xs">
      <div>
        <dt className="text-text-dim uppercase tracking-widest">Status</dt>
        <dd className="mt-1 text-text">{status}</dd>
      </div>
      <div>
        <dt className="text-text-dim uppercase tracking-widest">Applicants</dt>
        <dd className="mt-1 text-text">{applicantCount}</dd>
      </div>
      <div>
        <dt className="text-text-dim uppercase tracking-widest">Posted</dt>
        <dd className="mt-1 text-text">
          {new Date(createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </dd>
      </div>
    </dl>
  );
}
```

- [ ] **Step 3: Create `app/(public)/projects/[id]/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/shell/container";
import { ResearchQuestionCard } from "@/components/project/research-question-card";
import { ProjectMeta } from "@/components/project/project-meta";
import { Button } from "@/components/ui/button";
import { getProjectDetail } from "@/lib/db/queries/projects";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectDetail(id);
  if (!project) notFound();

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="font-mono text-xs uppercase tracking-widest text-text-dim">
          {project.companyName}
        </p>
        <h1 className="mt-3 font-display text-5xl leading-tight">
          {project.title}
        </h1>
        <p className="mt-6 text-lg text-text">{project.endGoal}</p>

        <div className="mt-10">
          <ProjectMeta
            status={project.status}
            applicantCount={project.applicantCount}
            createdAt={project.createdAt}
          />
        </div>

        <section className="mt-16">
          <h2 className="font-display text-3xl">Research questions</h2>
          <p className="mt-2 max-w-prose text-sm text-text-dim">
            Generated by Polymath from the company's brief, edited by{" "}
            {project.companyName}.
          </p>
          <div className="mt-8 space-y-6">
            {project.questions.map((q, i) => (
              <ResearchQuestionCard
                key={q.id}
                question={q.question}
                rationale={q.rationale}
                index={i}
              />
            ))}
          </div>
        </section>

        {project.status === "open" && (
          <section className="mt-16 rounded-md border border-ink-3 bg-ink-2 p-8">
            <h3 className="font-display text-xl">Apply with your team</h3>
            <p className="mt-2 text-sm text-text-dim">
              Sign in as a researcher, form a team, and submit a pitch. Match
              score is computed from your team's publication concepts.
            </p>
            <Button asChild className="mt-6">
              <Link href={`/projects/${project.id}/apply`}>
                Apply with my team →
              </Link>
            </Button>
          </section>
        )}
      </Container>
    </main>
  );
}
```

- [ ] **Step 4: Smoke-test**

`/projects/<seeded-id>` should render once seed data exists. For now, test with manually inserted data:

```bash
wrangler d1 execute polymath-staging --remote --command="
INSERT INTO companies (id, owner_user_id, name) VALUES ('c1', (SELECT id FROM users LIMIT 1), 'Test Co');
INSERT INTO projects (id, company_id, title, business_plan, end_goal, status) VALUES ('p1', 'c1', 'Test Project', 'plan', 'goal', 'open');
INSERT INTO research_questions (id, project_id, question, rationale, order_index) VALUES ('rq1', 'p1', 'How can churn be predicted?', 'because reasons', 0);
"
```

Visit `/projects/p1`, verify the page renders.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(public): add /projects/[id] detail page"
```

---

## Task 6: Public team page

**Files:**

- Create: `components/team/expertise-cloud.tsx`, `components/researcher/researcher-card.tsx`, `app/(public)/teams/[id]/page.tsx`

- [ ] **Step 1: Create `components/team/expertise-cloud.tsx`**

```typescript
export function ExpertiseCloud({
  concepts,
}: {
  concepts: { concept: string; score: number }[];
}) {
  if (concepts.length === 0)
    return <p className="text-sm text-text-dim">No expertise data yet.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {concepts.map((c) => {
        const intensity = Math.round(c.score * 100);
        return (
          <li
            key={c.concept}
            className="rounded-sm border border-ink-3 bg-ink-2 px-3 py-1.5 text-sm"
            style={{ opacity: 0.5 + (c.score * 0.5) }}
          >
            <span className="text-text">{c.concept}</span>
            <span className="ml-2 font-mono text-xs text-text-dim">
              {intensity}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Create `components/researcher/researcher-card.tsx`**

```typescript
import Link from "next/link";

export function ResearcherCard({
  researcherId,
  displayName,
  headline,
  affiliation,
  role,
}: {
  researcherId: string | null;
  displayName: string;
  headline: string | null;
  affiliation: string | null;
  role: "lead" | "member";
}) {
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  const inner = (
    <article className="flex gap-4 rounded-md border border-ink-3 bg-ink-2 p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-ink-3 font-display text-lg">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-lg text-text">{displayName}</h3>
          {role === "lead" && (
            <span className="font-mono text-xs uppercase tracking-widest text-gold">
              Lead
            </span>
          )}
        </div>
        {headline && (
          <p className="mt-1 truncate text-sm text-text-dim">{headline}</p>
        )}
        {affiliation && (
          <p className="mt-1 font-mono text-xs text-text-dim">{affiliation}</p>
        )}
      </div>
    </article>
  );
  if (!researcherId) return inner;
  return (
    <Link href={`/researchers/${researcherId}`} className="block">
      {inner}
    </Link>
  );
}
```

- [ ] **Step 3: Create `app/(public)/teams/[id]/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/container";
import { ExpertiseCloud } from "@/components/team/expertise-cloud";
import { ResearcherCard } from "@/components/researcher/researcher-card";
import { getTeamDetail } from "@/lib/db/queries/teams";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getTeamDetail(id);
  if (!team) notFound();

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="font-mono text-xs uppercase tracking-widest text-text-dim">
          Research team
        </p>
        <h1 className="mt-3 font-display text-5xl">{team.name}</h1>
        {team.description && (
          <p className="mt-4 max-w-prose text-text-dim">{team.description}</p>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl">Aggregate expertise</h2>
          <p className="mt-2 text-sm text-text-dim">
            Synthesized from members' OpenAlex publication concepts.
          </p>
          <div className="mt-6">
            <ExpertiseCloud concepts={team.concepts} />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Members</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {team.members.map((m) => (
              <ResearcherCard
                key={m.userId}
                researcherId={m.researcherId}
                displayName={m.displayName}
                headline={m.headline}
                affiliation={m.affiliation}
                role={m.role}
              />
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(public): add /teams/[id] page"
```

---

## Task 7: Public researcher profile page

**Files:**

- Create: `components/researcher/publication-list.tsx`, `components/researcher/expertise-tags.tsx`, `app/(public)/researchers/[id]/page.tsx`

- [ ] **Step 1: Create `components/researcher/publication-list.tsx`**

```typescript
type Pub = {
  id: string;
  title: string;
  year: number | null;
  venue: string | null;
  citationCount: number;
  doi: string | null;
};

export function PublicationList({ publications }: { publications: Pub[] }) {
  if (publications.length === 0)
    return <p className="text-sm text-text-dim">No publications.</p>;
  return (
    <ol className="space-y-6">
      {publications.map((p, i) => (
        <li key={p.id} className="border-l-2 border-ink-3 pl-5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-text-dim">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-xs text-text-dim">
              {p.year ?? "—"}
            </span>
            <span className="font-mono text-xs text-cyan">
              {p.citationCount} cites
            </span>
          </div>
          <p className="mt-2 font-display text-lg leading-snug text-text">
            {p.doi ? (
              <a
                href={`https://doi.org/${p.doi}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan"
              >
                {p.title}
              </a>
            ) : (
              p.title
            )}
          </p>
          {p.venue && <p className="mt-1 text-sm text-text-dim">{p.venue}</p>}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Create `components/researcher/expertise-tags.tsx`**

```typescript
export function ExpertiseTags({
  concepts,
}: {
  concepts: { concept: string; score: number }[];
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {concepts.slice(0, 12).map((c) => (
        <li
          key={c.concept}
          className="rounded-sm border border-ink-3 bg-ink-2 px-3 py-1.5 text-sm"
          style={{ opacity: 0.55 + c.score * 0.45 }}
        >
          <span className="text-text">{c.concept}</span>
          <span className="ml-2 font-mono text-xs text-text-dim">
            {Math.round(c.score * 100)}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Create `app/(public)/researchers/[id]/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/container";
import { PublicationList } from "@/components/researcher/publication-list";
import { ExpertiseTags } from "@/components/researcher/expertise-tags";
import { getResearcherDetail } from "@/lib/db/queries/researchers";

export const dynamic = "force-dynamic";

export default async function ResearcherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getResearcherDetail(id);
  if (!r) notFound();

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="font-mono text-xs uppercase tracking-widest text-text-dim">
          Researcher
        </p>
        <h1 className="mt-3 font-display text-5xl">{r.displayName}</h1>
        {r.headline && (
          <p className="mt-4 text-lg text-text">{r.headline}</p>
        )}
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs">
          {r.affiliation && (
            <>
              <dt className="text-text-dim uppercase tracking-widest">
                Affiliation
              </dt>
              <dd className="text-text">{r.affiliation}</dd>
            </>
          )}
          {r.orcid && (
            <>
              <dt className="text-text-dim uppercase tracking-widest">ORCID</dt>
              <dd>
                <a
                  href={`https://orcid.org/${r.orcid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan hover:underline"
                >
                  {r.orcid}
                </a>
              </dd>
            </>
          )}
        </dl>

        {r.aiSummary && (
          <section className="mt-10 border-l-4 border-gold/60 bg-paper/5 p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-gold">
              AI summary
            </p>
            <p className="mt-3 font-display italic text-lg leading-relaxed text-text">
              {r.aiSummary}
            </p>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl">Expertise</h2>
          <p className="mt-2 text-sm text-text-dim">
            Concept tags from OpenAlex, weighted by author score.
          </p>
          <div className="mt-6">
            <ExpertiseTags concepts={r.concepts} />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Selected publications</h2>
          <div className="mt-6">
            <PublicationList publications={r.publications} />
          </div>
        </section>
      </Container>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(public): add /researchers/[id] page"
```

---

## Task 8: 404 + loading states

**Files:**

- Create: `app/not-found.tsx`, `app/(public)/projects/[id]/loading.tsx`, `app/(public)/teams/[id]/loading.tsx`, `app/(public)/researchers/[id]/loading.tsx`

- [ ] **Step 1: Create `app/not-found.tsx`**

```typescript
import Link from "next/link";
import { Container } from "@/components/shell/container";

export default function NotFound() {
  return (
    <main className="py-32">
      <Container width="narrow" className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          404
        </p>
        <h1 className="mt-4 font-display text-5xl">Not found.</h1>
        <p className="mt-4 text-text-dim">
          That page doesn't exist, or it isn't public.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-cyan underline-offset-4 hover:underline"
        >
          ← Back home
        </Link>
      </Container>
    </main>
  );
}
```

- [ ] **Step 2: Create generic loading skeleton**

`app/(public)/projects/[id]/loading.tsx`:

```typescript
import { Container } from "@/components/shell/container";

export default function Loading() {
  return (
    <main className="py-16">
      <Container width="narrow">
        <div className="h-3 w-24 animate-pulse rounded bg-ink-3" />
        <div className="mt-4 h-12 w-3/4 animate-pulse rounded bg-ink-3" />
        <div className="mt-8 h-4 w-full animate-pulse rounded bg-ink-3" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-ink-3" />
      </Container>
    </main>
  );
}
```

Repeat the same pattern in `teams/[id]/loading.tsx` and `researchers/[id]/loading.tsx`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(public): add 404 and loading skeletons"
```

---

## Definition of done for Plan 1

- [ ] `/` renders Polymath landing with Hero, Pillars, CTA.
- [ ] `/projects` lists all `status='open'` projects (empty state OK).
- [ ] `/projects/[id]` renders full detail with research questions and applicant count.
- [ ] `/teams/[id]` renders members + aggregate expertise.
- [ ] `/researchers/[id]` renders publications, concepts, AI summary.
- [ ] All public pages render without auth.
- [ ] 404 page deployed.
- [ ] Lighthouse Performance ≥ 90 on landing page (run `pnpm exec lighthouse <url>`).

# Plan 2 — Researcher Onboarding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Live `/onboard` flow that takes a researcher's ORCID (or "use a demo researcher" choice), fetches their publications + concepts from OpenAlex, runs Gemini to produce a summary + headline + expertise tags, and writes the full profile to D1 — visible immediately at `/researchers/[id]`. This is **Hero Moment B**.

**Architecture:** Server action receives ORCID → calls `lib/openalex/client.ts` (KV-cached) → calls `generate(researcherSummarySchema, ...)` from `lib/ai/gemini.ts` → writes `researchers`, `publications`, `researcher_concepts` rows in a single transaction-like sequence. UI is a multi-state form (input → loading skeletons → final profile preview → confirm).

**Tech Stack:** Next.js server actions, OpenAlex REST API, Gemini 3 Flash, Drizzle, Zod, Vitest.

**Depends on:** Plan 0 (auth, db, gemini wrapper); Plan 1 (researcher profile page renders the result).

---

## File structure laid down by this plan

```
lib/
├─ openalex/
│  ├─ client.ts                       # OpenAlex API + KV cache
│  ├─ types.ts                        # OpenAlex response types
│  └─ demo-researchers.ts             # hand-curated fallback list
├─ ai/prompts/
│  └─ summarize-researcher.ts         # AI-2 prompt
└─ actions/
   └─ onboard.ts                      # server action

app/(app)/onboard/
├─ page.tsx                            # the onboarding flow
└─ _components/
   ├─ orcid-form.tsx
   ├─ profile-preview.tsx
   └─ demo-picker.tsx

tests/lib/openalex/
└─ client.test.ts

tests/lib/ai/prompts/
└─ summarize-researcher.test.ts
```

---

## Task 1: OpenAlex types + client (with KV cache)

**Files:**

- Create: `lib/openalex/types.ts`, `lib/openalex/client.ts`, `tests/lib/openalex/client.test.ts`

- [ ] **Step 1: Create `lib/openalex/types.ts`**

```typescript
// Trimmed shapes — only what we use.

export interface OAConcept {
  id: string;
  display_name: string;
  level: number;
  score: number;
}

export interface OAAuthor {
  id: string;
  display_name: string;
  orcid: string | null;
  works_count: number;
  cited_by_count: number;
  last_known_institution?: { display_name: string | null } | null;
  x_concepts: OAConcept[];
}

export interface OAWork {
  id: string;
  title: string | null;
  display_name: string | null;
  publication_year: number | null;
  cited_by_count: number;
  doi: string | null;
  abstract_inverted_index: Record<string, number[]> | null;
  primary_location?: { source?: { display_name: string | null } | null } | null;
}

export interface OAAuthorsResponse {
  results: OAAuthor[];
}

export interface OAWorksResponse {
  results: OAWork[];
}
```

- [ ] **Step 2: Write the failing test**

`tests/lib/openalex/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchAuthorByOrcid,
  fetchAuthorByName,
  fetchAuthorWorks,
  reconstructAbstract,
} from "@/lib/openalex/client";

const memKv = new Map<string, string>();
const fakeKv = {
  get: vi.fn(async (k: string) => memKv.get(k) ?? null),
  put: vi.fn(async (k: string, v: string) => {
    memKv.set(k, v);
  }),
};

beforeEach(() => {
  memKv.clear();
  fakeKv.get.mockClear();
  fakeKv.put.mockClear();
});

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("fetchAuthorByOrcid", () => {
  it("returns first author and caches it", async () => {
    const author = {
      id: "A1",
      display_name: "Yann LeCun",
      orcid: "0000-0001-2345-6789",
      works_count: 100,
      cited_by_count: 200000,
      x_concepts: [],
      last_known_institution: { display_name: "NYU" },
    };
    const fetchImpl = vi.fn(async () => ok({ results: [author] }));
    const out = await fetchAuthorByOrcid("0000-0001-2345-6789", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      kv: fakeKv as unknown as KVNamespace,
      email: "test@example.com",
    });
    expect(out?.id).toBe("A1");
    expect(fakeKv.put).toHaveBeenCalledOnce();

    const out2 = await fetchAuthorByOrcid("0000-0001-2345-6789", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      kv: fakeKv as unknown as KVNamespace,
      email: "test@example.com",
    });
    expect(out2?.id).toBe("A1");
    expect(fetchImpl).toHaveBeenCalledOnce(); // second call hit cache
  });

  it("returns null when no results", async () => {
    const fetchImpl = vi.fn(async () => ok({ results: [] }));
    const out = await fetchAuthorByOrcid("0000-0000-0000-0000", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      kv: fakeKv as unknown as KVNamespace,
      email: "test@example.com",
    });
    expect(out).toBeNull();
  });
});

describe("fetchAuthorByName", () => {
  it("filters by name + affiliation", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toContain("search=");
      return ok({
        results: [
          {
            id: "A2",
            display_name: "X",
            orcid: null,
            works_count: 1,
            cited_by_count: 1,
            x_concepts: [],
          },
        ],
      });
    });
    const out = await fetchAuthorByName("Jane Doe", "Stanford", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      kv: fakeKv as unknown as KVNamespace,
      email: "test@example.com",
    });
    expect(out?.id).toBe("A2");
  });
});

describe("fetchAuthorWorks", () => {
  it("calls works endpoint with author filter", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toContain("filter=author.id:A1");
      return ok({
        results: [
          {
            id: "W1",
            title: "Paper",
            display_name: "Paper",
            publication_year: 2024,
            cited_by_count: 5,
            doi: null,
            abstract_inverted_index: null,
          },
        ],
      });
    });
    const out = await fetchAuthorWorks("A1", 5, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      kv: fakeKv as unknown as KVNamespace,
      email: "test@example.com",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe("Paper");
  });
});

describe("reconstructAbstract", () => {
  it("rebuilds abstract from inverted index", () => {
    const inv = { hello: [0], world: [1] };
    expect(reconstructAbstract(inv)).toBe("hello world");
  });
  it("returns null when index is null", () => {
    expect(reconstructAbstract(null)).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test (expect failure: client doesn't exist yet)**

```bash
pnpm test tests/lib/openalex/client.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 4: Create `lib/openalex/client.ts`**

```typescript
import type { OAAuthor, OAAuthorsResponse, OAWork, OAWorksResponse } from "./types";

interface Opts {
  fetchImpl?: typeof fetch;
  kv: KVNamespace;
  email: string;
  ttlSeconds?: number;
}

const BASE = "https://api.openalex.org";
const DEFAULT_TTL = 60 * 60 * 24; // 24h

function ua(email: string) {
  return `polymath/0.1 (mailto:${email})`;
}

async function getCached<T>(
  kv: KVNamespace,
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = await kv.get(key);
  if (hit) return JSON.parse(hit) as T;
  const fresh = await fetcher();
  await kv.put(key, JSON.stringify(fresh), { expirationTtl: ttl });
  return fresh;
}

export async function fetchAuthorByOrcid(orcid: string, opts: Opts): Promise<OAAuthor | null> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL;
  const key = `oa:author:orcid:${orcid}`;
  return getCached(opts.kv, key, ttl, async () => {
    const url = `${BASE}/authors?filter=orcid:${encodeURIComponent(orcid)}&per-page=1&mailto=${encodeURIComponent(opts.email)}`;
    const res = await fetchImpl(url, {
      headers: { "user-agent": ua(opts.email) },
    });
    if (!res.ok) throw new Error(`openalex ${res.status}`);
    const json = (await res.json()) as OAAuthorsResponse;
    return json.results[0] ?? null;
  });
}

export async function fetchAuthorByName(
  name: string,
  affiliation: string | undefined,
  opts: Opts
): Promise<OAAuthor | null> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL;
  const key = `oa:author:name:${name.toLowerCase()}|${(affiliation ?? "").toLowerCase()}`;
  return getCached(opts.kv, key, ttl, async () => {
    const search = encodeURIComponent(`${name} ${affiliation ?? ""}`.trim());
    const url = `${BASE}/authors?search=${search}&per-page=1&mailto=${encodeURIComponent(opts.email)}`;
    const res = await fetchImpl(url, {
      headers: { "user-agent": ua(opts.email) },
    });
    if (!res.ok) throw new Error(`openalex ${res.status}`);
    const json = (await res.json()) as OAAuthorsResponse;
    return json.results[0] ?? null;
  });
}

export async function fetchAuthorWorks(
  authorId: string,
  perPage: number,
  opts: Opts
): Promise<OAWork[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL;
  const key = `oa:works:${authorId}:${perPage}`;
  return getCached(opts.kv, key, ttl, async () => {
    const url = `${BASE}/works?filter=author.id:${encodeURIComponent(authorId)}&per-page=${perPage}&sort=cited_by_count:desc&mailto=${encodeURIComponent(opts.email)}`;
    const res = await fetchImpl(url, {
      headers: { "user-agent": ua(opts.email) },
    });
    if (!res.ok) throw new Error(`openalex ${res.status}`);
    const json = (await res.json()) as OAWorksResponse;
    return json.results;
  });
}

export function reconstructAbstract(inv: Record<string, number[]> | null): string | null {
  if (!inv) return null;
  const positions: { word: string; pos: number }[] = [];
  for (const [word, posList] of Object.entries(inv)) {
    for (const p of posList) positions.push({ word, pos: p });
  }
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map((p) => p.word).join(" ");
}
```

- [ ] **Step 5: Run the test (expect pass)**

```bash
pnpm test tests/lib/openalex/client.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(openalex): add typed OpenAlex client with KV cache + tests"
```

---

## Task 2: Demo researcher fallback list

**Files:**

- Create: `lib/openalex/demo-researchers.ts`

- [ ] **Step 1: Create `lib/openalex/demo-researchers.ts`**

```typescript
/**
 * A small set of well-known public researchers with stable ORCIDs,
 * used as one-click fallbacks during the live demo if the audience
 * doesn't have an ORCID handy.
 */
export const DEMO_RESEARCHERS = [
  {
    label: "Yann LeCun (NYU / Meta AI)",
    orcid: "0000-0003-1990-7172",
    field: "Deep learning",
  },
  {
    label: "Fei-Fei Li (Stanford)",
    orcid: "0000-0002-7481-0810",
    field: "Computer vision",
  },
  {
    label: "Daphne Koller (Insitro)",
    orcid: "0000-0002-2310-4243",
    field: "Probabilistic models / biology",
  },
] as const;

export type DemoResearcher = (typeof DEMO_RESEARCHERS)[number];
```

> Note: ORCIDs above are illustrative; verify each one resolves on OpenAlex before commit. If any 404, replace with the closest match from `https://openalex.org/authors?search=<name>`. The demo flow gracefully falls through to name-search if ORCID returns no result.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(openalex): add demo researcher fallback list"
```

---

## Task 3: AI-2 prompt + integration

**Files:**

- Create: `lib/ai/prompts/summarize-researcher.ts`, `tests/lib/ai/prompts/summarize-researcher.test.ts`

- [ ] **Step 1: Create the prompt module**

```typescript
import { generate } from "@/lib/ai/gemini";
import { researcherSummarySchema } from "@/lib/ai/schemas";
import type { z } from "zod";

const SYSTEM = `You are an expert science communicator. Given an author's publication concepts and the titles+abstracts of their most-cited recent papers, you produce a concise expertise profile that helps non-experts (business stakeholders) understand what this researcher is good at.

Rules:
- Headline: a single phrase (no period) describing their central expertise. 4-9 words.
- Summary: 2 sentences. First sentence states what they study. Second sentence states what they're known for or where they apply it.
- expertise_tags: 5-10 tags drawn FROM the provided concept list (exact strings), ranked by relevance, each with weight 0..1.
- Do not invent expertise outside the source data.
- Output strict JSON matching the response schema. No prose.`;

export interface SummarizeInput {
  displayName: string;
  affiliation: string | null;
  concepts: { label: string; weight: number }[];
  topPublications: { title: string; year: number | null; abstract: string | null }[];
}

export type SummarizeOutput = z.infer<typeof researcherSummarySchema>;

export async function summarizeResearcher(input: SummarizeInput): Promise<SummarizeOutput> {
  const prompt = `Researcher: ${input.displayName}${
    input.affiliation ? ` (${input.affiliation})` : ""
  }

Top OpenAlex concepts (label, score):
${input.concepts
  .slice(0, 20)
  .map((c) => `- ${c.label}: ${c.weight.toFixed(2)}`)
  .join("\n")}

Top publications:
${input.topPublications
  .map(
    (p, i) =>
      `[${i + 1}] (${p.year ?? "n.d."}) ${p.title}${
        p.abstract ? `\nAbstract: ${p.abstract.slice(0, 600)}` : ""
      }`
  )
  .join("\n\n")}
`;

  return generate(researcherSummarySchema, { system: SYSTEM, prompt });
}
```

- [ ] **Step 2: Write a test that exercises the wrapping (mocked Gemini)**

`tests/lib/ai/prompts/summarize-researcher.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/gemini", () => ({
  generate: vi.fn(async (_schema, _opts) => ({
    headline: "Probabilistic models for biology",
    summary: "Studies graphical models. Known for applications to genomics.",
    expertise_tags: [
      { label: "Probabilistic models", weight: 0.9 },
      { label: "Genomics", weight: 0.7 },
    ],
  })),
  GeminiError: class extends Error {},
}));

import { summarizeResearcher } from "@/lib/ai/prompts/summarize-researcher";
import { generate } from "@/lib/ai/gemini";

describe("summarizeResearcher", () => {
  it("calls generate with system + prompt and returns parsed", async () => {
    const out = await summarizeResearcher({
      displayName: "Daphne Koller",
      affiliation: "Insitro",
      concepts: [{ label: "Probabilistic models", weight: 0.9 }],
      topPublications: [
        { title: "Probabilistic graphical models", year: 2009, abstract: "An overview." },
      ],
    });
    expect(out.headline).toContain("Probabilistic");
    expect(generate).toHaveBeenCalledOnce();
    const callArg = (generate as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![1] as {
      system: string;
      prompt: string;
    };
    expect(callArg.system).toContain("expertise profile");
    expect(callArg.prompt).toContain("Daphne Koller");
    expect(callArg.prompt).toContain("Insitro");
  });
});
```

- [ ] **Step 3: Run the test**

```bash
pnpm test tests/lib/ai/prompts/summarize-researcher.test.ts
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ai): add summarizeResearcher (AI-2) prompt + test"
```

---

## Task 4: Onboarding server action

**Files:**

- Create: `lib/actions/onboard.ts`

- [ ] **Step 1: Create `lib/actions/onboard.ts`**

```typescript
"use server";

import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db/client";
import { syncUser } from "@/lib/auth/sync-user";
import { researchers, publications, researcherConcepts } from "@/lib/db/schema";
import {
  fetchAuthorByOrcid,
  fetchAuthorByName,
  fetchAuthorWorks,
  reconstructAbstract,
} from "@/lib/openalex/client";
import { summarizeResearcher } from "@/lib/ai/prompts/summarize-researcher";

interface OnboardInput {
  orcid?: string;
  name?: string;
  affiliation?: string;
}

export type OnboardResult = { ok: true; researcherId: string } | { ok: false; error: string };

export async function onboardResearcher(input: OnboardInput): Promise<OnboardResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const { env } = getCloudflareContext();
  const oaOpts = { kv: env.KV, email: env.OPENALEX_EMAIL };

  // 1. Resolve author
  let author = null;
  if (input.orcid) {
    author = await fetchAuthorByOrcid(input.orcid, oaOpts);
  }
  if (!author && input.name) {
    author = await fetchAuthorByName(input.name, input.affiliation, oaOpts);
  }
  if (!author) return { ok: false, error: "could not find author" };

  // 2. Fetch top works
  const works = await fetchAuthorWorks(author.id, 20, oaOpts);

  // 3. AI summary
  const concepts = author.x_concepts.map((c) => ({
    label: c.display_name,
    weight: c.score,
  }));
  const topPublications = works.slice(0, 5).map((w) => ({
    title: w.title ?? w.display_name ?? "(untitled)",
    year: w.publication_year,
    abstract: reconstructAbstract(w.abstract_inverted_index),
  }));
  const summary = await summarizeResearcher({
    displayName: author.display_name,
    affiliation: author.last_known_institution?.display_name ?? input.affiliation ?? null,
    concepts,
    topPublications,
  });

  // 4. Write to DB
  const db = getDb();
  const existing = await db.query.researchers.findFirst({
    where: eq(researchers.userId, user.id),
  });
  const researcherId = existing?.id ?? uuidv7();

  if (!existing) {
    await db.insert(researchers).values({
      id: researcherId,
      userId: user.id,
      openalexId: author.id,
      orcid: author.orcid ?? input.orcid ?? null,
      affiliation: author.last_known_institution?.display_name ?? input.affiliation ?? null,
      headline: summary.headline,
      aiSummary: summary.summary,
    });
  } else {
    await db
      .update(researchers)
      .set({
        openalexId: author.id,
        orcid: author.orcid ?? input.orcid ?? null,
        affiliation: author.last_known_institution?.display_name ?? input.affiliation ?? null,
        headline: summary.headline,
        aiSummary: summary.summary,
      })
      .where(eq(researchers.id, researcherId));
    await db.delete(publications).where(eq(publications.researcherId, researcherId));
    await db.delete(researcherConcepts).where(eq(researcherConcepts.researcherId, researcherId));
  }

  if (works.length > 0) {
    await db.insert(publications).values(
      works.map((w) => ({
        id: uuidv7(),
        researcherId,
        openalexWorkId: w.id,
        title: w.title ?? w.display_name ?? "(untitled)",
        year: w.publication_year,
        venue: w.primary_location?.source?.display_name ?? null,
        abstract: reconstructAbstract(w.abstract_inverted_index),
        citationCount: w.cited_by_count,
        doi: w.doi,
      }))
    );
  }

  // Persist AI-derived expertise tags as our authoritative concept set.
  if (summary.expertise_tags.length > 0) {
    await db.insert(researcherConcepts).values(
      summary.expertise_tags.map((t) => ({
        id: uuidv7(),
        researcherId,
        concept: t.label,
        score: t.weight,
      }))
    );
  }

  return { ok: true, researcherId };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(onboard): add server action wiring OpenAlex + AI-2 + DB"
```

---

## Task 5: Onboarding UI — input form

**Files:**

- Create: `app/(app)/onboard/page.tsx`, `app/(app)/onboard/_components/orcid-form.tsx`, `app/(app)/onboard/_components/demo-picker.tsx`, `app/(app)/layout.tsx`

- [ ] **Step 1: Create authenticated layout**

`app/(app)/layout.tsx`:

```typescript
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PublicNav } from "@/components/shell/public-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return (
    <>
      <PublicNav />
      {children}
    </>
  );
}
```

(Replace this with an authenticated nav once we have user-state-aware nav components.)

- [ ] **Step 2: Create `_components/orcid-form.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onboardResearcher } from "@/lib/actions/onboard";
import { ProfilePreview } from "./profile-preview";

type Stage =
  | { kind: "idle" }
  | { kind: "loading"; phase: "fetching" | "summarizing" }
  | { kind: "success"; researcherId: string }
  | { kind: "error"; message: string };

export function OrcidForm() {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [orcid, setOrcid] = useState("");
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setStage({ kind: "loading", phase: "fetching" });
    startTransition(async () => {
      // Cosmetic phase swap halfway through.
      const phaseTimer = setTimeout(
        () => setStage({ kind: "loading", phase: "summarizing" }),
        2500
      );
      const res = await onboardResearcher({
        orcid: orcid || undefined,
        name: name || undefined,
        affiliation: affiliation || undefined,
      });
      clearTimeout(phaseTimer);
      if (!res.ok) {
        setStage({ kind: "error", message: res.error });
        return;
      }
      setStage({ kind: "success", researcherId: res.researcherId });
    });
  }

  if (stage.kind === "success") {
    return <ProfilePreview researcherId={stage.researcherId} />;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <Label htmlFor="orcid">ORCID iD</Label>
        <Input
          id="orcid"
          name="orcid"
          placeholder="0000-0000-0000-0000"
          className="mt-2 font-mono"
          value={orcid}
          onChange={(e) => setOrcid(e.target.value)}
        />
      </div>
      <p className="text-center text-xs uppercase tracking-widest text-text-dim">
        — or —
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            className="mt-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="affiliation">Affiliation</Label>
          <Input
            id="affiliation"
            name="affiliation"
            className="mt-2"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
          />
        </div>
      </div>

      {stage.kind === "loading" && (
        <div className="rounded-md border border-ink-3 bg-ink-2 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan">
            {stage.phase === "fetching"
              ? "Fetching publications from OpenAlex…"
              : "Analyzing expertise with Gemini…"}
          </p>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-ink-3" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-ink-3" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-ink-3" />
          </div>
        </div>
      )}

      {stage.kind === "error" && (
        <p className="rounded-sm border border-rose/60 bg-rose/10 p-3 text-sm text-rose">
          {stage.message}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={stage.kind === "loading" || (!orcid && !name)}
      >
        {stage.kind === "loading" ? "Building profile…" : "Build my profile"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create `_components/demo-picker.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DEMO_RESEARCHERS } from "@/lib/openalex/demo-researchers";
import { onboardResearcher } from "@/lib/actions/onboard";
import { ProfilePreview } from "./profile-preview";

type State =
  | { kind: "idle" }
  | { kind: "loading"; label: string }
  | { kind: "success"; researcherId: string }
  | { kind: "error"; message: string };

export function DemoPicker() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [, startTransition] = useTransition();

  function pick(orcid: string, label: string) {
    setState({ kind: "loading", label });
    startTransition(async () => {
      const res = await onboardResearcher({ orcid });
      if (!res.ok) setState({ kind: "error", message: res.error });
      else setState({ kind: "success", researcherId: res.researcherId });
    });
  }

  if (state.kind === "success") {
    return <ProfilePreview researcherId={state.researcherId} />;
  }

  return (
    <div className="rounded-md border border-ink-3 bg-ink-2 p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-text-dim">
        Try with a demo researcher
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {DEMO_RESEARCHERS.map((r) => (
          <Button
            key={r.orcid}
            variant="secondary"
            size="md"
            disabled={state.kind === "loading"}
            onClick={() => pick(r.orcid, r.label)}
            className="h-auto flex-col items-start text-left"
          >
            <span className="font-display text-sm">{r.label}</span>
            <span className="mt-1 font-mono text-[10px] text-text-dim">
              {r.field}
            </span>
          </Button>
        ))}
      </div>
      {state.kind === "loading" && (
        <p className="mt-4 font-mono text-xs text-cyan">
          Loading {state.label}…
        </p>
      )}
      {state.kind === "error" && (
        <p className="mt-4 text-sm text-rose">{state.message}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `_components/profile-preview.tsx`**

```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ProfilePreview({ researcherId }: { researcherId: string }) {
  return (
    <div className="rounded-md border border-cyan/40 bg-cyan/5 p-8 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan">
        Profile built
      </p>
      <h2 className="mt-3 font-display text-3xl">Your profile is live.</h2>
      <p className="mt-3 text-text-dim">
        OpenAlex publications and AI-derived expertise tags are saved.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button asChild>
          <Link href={`/researchers/${researcherId}`}>View public profile →</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `app/(app)/onboard/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { OrcidForm } from "./_components/orcid-form";
import { DemoPicker } from "./_components/demo-picker";
import { syncUser } from "@/lib/auth/sync-user";
import { getDb } from "@/lib/db/client";
import { researchers } from "@/lib/db/schema";

export default async function OnboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);
  if (user.role === "company") redirect("/dashboard");

  const existing = await getDb().query.researchers.findFirst({
    where: eq(researchers.userId, user.id),
  });
  if (existing) redirect(`/researchers/${existing.id}`);

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          Onboarding · 1 of 1
        </p>
        <h1 className="mt-3 font-display text-5xl">
          Build your researcher profile.
        </h1>
        <p className="mt-4 text-text-dim">
          Enter your ORCID and we'll fetch your publications from OpenAlex and
          synthesize an expertise profile. Don't have one handy? Use a demo
          researcher to skip ahead.
        </p>
        <div className="mt-12">
          <OrcidForm />
        </div>
        <div className="mt-10">
          <DemoPicker />
        </div>
      </Container>
    </main>
  );
}
```

- [ ] **Step 6: Live test (deployed)**

Deploy to staging:

```bash
pnpm deploy:staging
```

Sign up as a researcher, land on `/onboard`. Click a demo researcher. Verify:

- Loading skeleton shows "Fetching…" then "Analyzing…".
- Success card appears with link to `/researchers/<id>`.
- Visit the profile — publications, expertise tags, AI summary all render.
- KV cache warmed: `wrangler kv key list --binding=KV` shows `oa:author:orcid:*` and `oa:works:*` entries.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(onboard): build /onboard flow with ORCID + demo + AI-2"
```

---

## Task 6: Researcher dashboard skeleton

**Files:**

- Modify: `app/(app)/dashboard/page.tsx`
- Create: `lib/db/queries/dashboard.ts`

- [ ] **Step 1: Create `lib/db/queries/dashboard.ts`**

```typescript
import { eq, and, inArray, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  researchers,
  teams,
  teamMembers,
  applications,
  projects,
  companies,
} from "@/lib/db/schema";

export async function getResearcherDashboard(userId: string) {
  const db = getDb();
  const [researcher] = await db
    .select()
    .from(researchers)
    .where(eq(researchers.userId, userId))
    .limit(1);

  const myTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, userId));

  const teamIds = myTeams.map((t) => t.id);
  const myApps =
    teamIds.length === 0
      ? []
      : await db
          .select({
            id: applications.id,
            status: applications.status,
            matchScore: applications.matchScore,
            projectId: projects.id,
            projectTitle: projects.title,
            companyName: companies.name,
            teamName: teams.name,
          })
          .from(applications)
          .innerJoin(projects, eq(projects.id, applications.projectId))
          .innerJoin(companies, eq(companies.id, projects.companyId))
          .innerJoin(teams, eq(teams.id, applications.teamId))
          .where(inArray(applications.teamId, teamIds))
          .orderBy(desc(applications.createdAt));

  return { researcher: researcher ?? null, teams: myTeams, applications: myApps };
}
```

- [ ] **Step 2: Replace `app/(app)/dashboard/page.tsx`**

```typescript
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";
import { syncUser } from "@/lib/auth/sync-user";
import { getResearcherDashboard } from "@/lib/db/queries/dashboard";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  if (user.role === "company") {
    // Company dashboard is rendered in Plan 4. For now: link to projects.
    return (
      <main className="py-16">
        <Container>
          <h1 className="font-display text-4xl">
            Welcome, {user.displayName}
          </h1>
          <p className="mt-3 text-text-dim">Company dashboard arrives next plan.</p>
          <Button asChild className="mt-6">
            <Link href="/projects/new">Post a project →</Link>
          </Button>
        </Container>
      </main>
    );
  }

  const { researcher, teams, applications } = await getResearcherDashboard(user.id);
  if (!researcher) redirect("/onboard");

  return (
    <main className="py-16">
      <Container>
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          Researcher
        </p>
        <h1 className="mt-3 font-display text-4xl">
          Welcome, {user.displayName}
        </h1>
        <p className="mt-2 text-text-dim">{researcher.headline}</p>

        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Your teams</h2>
            <Button asChild size="sm" variant="secondary">
              <Link href="/teams/new">+ New team</Link>
            </Button>
          </div>
          {teams.length === 0 ? (
            <p className="mt-4 text-text-dim">
              You're not on any teams yet. Create one or accept an invite.
            </p>
          ) : (
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {teams.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/teams/${t.id}`}
                    className="block rounded-md border border-ink-3 bg-ink-2 p-5 hover:border-cyan/60"
                  >
                    <p className="font-mono text-xs uppercase tracking-widest text-text-dim">
                      {t.role}
                    </p>
                    <p className="mt-2 font-display text-xl">{t.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Applications</h2>
          {applications.length === 0 ? (
            <p className="mt-4 text-text-dim">No applications yet.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {applications.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md border border-ink-3 bg-ink-2 p-4"
                >
                  <div>
                    <p className="font-display text-lg">{a.projectTitle}</p>
                    <p className="font-mono text-xs text-text-dim">
                      {a.companyName} · {a.teamName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl text-cyan">
                      {a.matchScore}
                    </p>
                    <p className="font-mono text-xs uppercase tracking-widest text-text-dim">
                      {a.status}
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

- [ ] **Step 3: Smoke-test**

After onboarding, you land on `/dashboard`. Empty teams + applications show their empty states.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(dashboard): add researcher dashboard skeleton"
```

---

## Definition of done for Plan 2

- [ ] `/onboard` accepts ORCID and demo-researcher buttons.
- [ ] OpenAlex fetch + AI-2 summarization complete in <8s combined (live).
- [ ] Researcher row + publications + concepts written to D1.
- [ ] `/researchers/[id]` (Plan 1) renders the new profile.
- [ ] Re-running onboarding upserts cleanly (no duplicates, no orphans).
- [ ] KV cache populated; second onboarding of same ORCID is faster (~2s).
- [ ] `/dashboard` shows researcher landing with empty-state teams and applications.
- [ ] All tests still pass: `pnpm test`.

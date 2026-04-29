# Plan 3 — Teams & Invites

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Researchers can create teams, invite collaborators via shareable link, and accept invitations on signup. The team page shows aggregate expertise (live join across members' OpenAlex concepts).

**Architecture:** Server actions for create/invite/accept. Public team page (Plan 1) already renders aggregate expertise; this plan adds the auth-gated management page and the invite acceptance flow. Invite codes are random 16-char base32; one-shot or expirable.

**Tech Stack:** Next.js server actions, Drizzle, `nanoid` for invite codes.

**Depends on:** Plan 0, Plan 2 (researcher must exist before joining a team).

---

## File structure laid down by this plan

```
lib/
└─ actions/
   ├─ teams.ts                       # createTeam, inviteToTeam, deleteInvite
   └─ invites.ts                     # acceptInvite

app/(app)/teams/
├─ new/page.tsx
└─ [id]/manage/page.tsx              # auth'd management view
   └─ _components/
      ├─ create-team-form.tsx
      ├─ invite-link-card.tsx
      └─ member-list.tsx

app/invite/[code]/
└─ page.tsx                           # accept flow

components/team/
└─ aggregate-expertise.tsx           # shared expertise widget
```

---

## Task 1: Team-creation server action

**Files:**
- Create: `lib/actions/teams.ts`

- [ ] **Step 1: Install nanoid**

```bash
pnpm add nanoid
```

- [ ] **Step 2: Create `lib/actions/teams.ts`**

```typescript
"use server";

import { v7 as uuidv7 } from "uuid";
import { customAlphabet } from "nanoid";
import { eq, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { syncUser } from "@/lib/auth/sync-user";
import { teams, teamMembers, teamInvites } from "@/lib/db/schema";

const codeGen = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 16);

export async function createTeam(input: {
  name: string;
  description?: string;
}): Promise<{ ok: true; teamId: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);
  if (user.role !== "researcher")
    return { ok: false, error: "only researchers can create teams" };

  const db = getDb();
  const teamId = uuidv7();
  await db.insert(teams).values({
    id: teamId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    createdByUserId: user.id,
  });
  await db.insert(teamMembers).values({
    id: uuidv7(),
    teamId,
    userId: user.id,
    role: "lead",
  });

  return { ok: true, teamId };
}

export async function createInvite(input: {
  teamId: string;
  email?: string;
  ttlHours?: number;
}): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const db = getDb();
  const lead = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, input.teamId),
      eq(teamMembers.userId, user.id),
      eq(teamMembers.role, "lead")
    ),
  });
  if (!lead) return { ok: false, error: "only the team lead can invite" };

  const code = codeGen();
  const ttlMs = (input.ttlHours ?? 24 * 7) * 60 * 60 * 1000;
  await db.insert(teamInvites).values({
    id: uuidv7(),
    teamId: input.teamId,
    code,
    invitedEmail: input.email || null,
    expiresAt: Date.now() + ttlMs,
  });
  revalidatePath(`/teams/${input.teamId}/manage`);
  return { ok: true, code };
}

export async function revokeInvite(input: {
  inviteId: string;
  teamId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const db = getDb();
  const lead = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, input.teamId),
      eq(teamMembers.userId, user.id),
      eq(teamMembers.role, "lead")
    ),
  });
  if (!lead) return { ok: false, error: "only the team lead can revoke" };

  await db.delete(teamInvites).where(eq(teamInvites.id, input.inviteId));
  revalidatePath(`/teams/${input.teamId}/manage`);
  return { ok: true };
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(teams): add createTeam, createInvite, revokeInvite actions"
```

---

## Task 2: `/teams/new` page

**Files:**
- Create: `app/(app)/teams/new/page.tsx`, `app/(app)/teams/new/_components/create-team-form.tsx`

- [ ] **Step 1: Create the form component**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTeam } from "@/lib/actions/teams";

export function CreateTeamForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTeam({ name, description });
      if (!res.ok) setError(res.error);
      else router.push(`/teams/${res.teamId}/manage`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <Label htmlFor="name">Team name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={80}
          className="mt-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="description">Short description (optional)</Label>
        <Input
          id="description"
          name="description"
          maxLength={240}
          className="mt-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-rose">{error}</p>}
      <Button type="submit" size="lg" disabled={pending || !name.trim()}>
        {pending ? "Creating…" : "Create team"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create the page**

`app/(app)/teams/new/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { CreateTeamForm } from "./_components/create-team-form";
import { syncUser } from "@/lib/auth/sync-user";
import { getDb } from "@/lib/db/client";
import { researchers } from "@/lib/db/schema";

export default async function NewTeamPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);
  if (user.role !== "researcher") redirect("/dashboard");

  // require a researcher profile first
  const r = await getDb().query.researchers.findFirst({
    where: eq(researchers.userId, user.id),
  });
  if (!r) redirect("/onboard");

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          New team
        </p>
        <h1 className="mt-3 font-display text-5xl">Form a research team.</h1>
        <p className="mt-4 text-text-dim">
          You'll be the team lead. Invite collaborators via a shareable link
          after creating the team.
        </p>
        <div className="mt-12">
          <CreateTeamForm />
        </div>
      </Container>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(teams): add /teams/new page"
```

---

## Task 3: `/teams/[id]/manage` page (lead-only)

**Files:**
- Create: `lib/db/queries/team-manage.ts`, `app/(app)/teams/[id]/manage/page.tsx`, `app/(app)/teams/[id]/manage/_components/invite-link-card.tsx`, `app/(app)/teams/[id]/manage/_components/member-list.tsx`

- [ ] **Step 1: Create query helper**

`lib/db/queries/team-manage.ts`:

```typescript
import { eq, and, gt, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  teams,
  teamMembers,
  teamInvites,
  users,
  researchers,
} from "@/lib/db/schema";

export async function getTeamForManage(teamId: string, userId: string) {
  const db = getDb();
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) return null;

  const myRole = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
  });
  if (!myRole) return null;

  const members = await db
    .select({
      id: teamMembers.id,
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
    .where(eq(teamMembers.teamId, teamId));

  const now = Date.now();
  const invites = await db
    .select()
    .from(teamInvites)
    .where(
      and(
        eq(teamInvites.teamId, teamId),
        gt(teamInvites.expiresAt, now),
        isNull(teamInvites.usedByUserId)
      )
    );

  return { team, isLead: myRole.role === "lead", members, invites };
}
```

- [ ] **Step 2: Create `_components/invite-link-card.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createInvite, revokeInvite } from "@/lib/actions/teams";

interface Invite {
  id: string;
  code: string;
  expiresAt: number;
  invitedEmail: string | null;
}

export function InviteLinkCard({
  teamId,
  invites,
  baseUrl,
}: {
  teamId: string;
  invites: Invite[];
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function newInvite() {
    setError(null);
    startTransition(async () => {
      const res = await createInvite({ teamId });
      if (!res.ok) setError(res.error);
    });
  }

  function revoke(inviteId: string) {
    startTransition(async () => {
      await revokeInvite({ inviteId, teamId });
    });
  }

  return (
    <section className="rounded-md border border-ink-3 bg-ink-2 p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl">Invite links</h2>
        <Button size="sm" onClick={newInvite} disabled={pending}>
          {pending ? "…" : "+ New invite"}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-rose">{error}</p>}
      {invites.length === 0 ? (
        <p className="mt-4 text-sm text-text-dim">
          No active invites. Generate one to share.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {invites.map((inv) => {
            const url = `${baseUrl}/invite/${inv.code}`;
            return (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-sm border border-ink-3 bg-ink p-3"
              >
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 bg-transparent font-mono text-xs text-text outline-none"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(url)}
                >
                  Copy
                </Button>
                <Button size="sm" variant="ghost" onClick={() => revoke(inv.id)}>
                  Revoke
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Create `_components/member-list.tsx`**

```typescript
import Link from "next/link";

interface Member {
  userId: string;
  displayName: string;
  role: "lead" | "member";
  researcherId: string | null;
  headline: string | null;
  affiliation: string | null;
}

export function MemberList({ members }: { members: Member[] }) {
  return (
    <section>
      <h2 className="font-display text-xl">Members</h2>
      <ul className="mt-4 space-y-3">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex items-baseline justify-between rounded-md border border-ink-3 bg-ink-2 p-4"
          >
            <div>
              <div className="flex items-baseline gap-3">
                {m.researcherId ? (
                  <Link
                    href={`/researchers/${m.researcherId}`}
                    className="font-display text-lg hover:text-cyan"
                  >
                    {m.displayName}
                  </Link>
                ) : (
                  <span className="font-display text-lg">{m.displayName}</span>
                )}
                {m.role === "lead" && (
                  <span className="font-mono text-xs uppercase tracking-widest text-gold">
                    Lead
                  </span>
                )}
              </div>
              {m.headline && (
                <p className="mt-1 text-sm text-text-dim">{m.headline}</p>
              )}
              {m.affiliation && (
                <p className="mt-1 font-mono text-xs text-text-dim">
                  {m.affiliation}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Create `app/(app)/teams/[id]/manage/page.tsx`**

```typescript
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";
import { syncUser } from "@/lib/auth/sync-user";
import { getTeamForManage } from "@/lib/db/queries/team-manage";
import { InviteLinkCard } from "./_components/invite-link-card";
import { MemberList } from "./_components/member-list";

export default async function TeamManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const data = await getTeamForManage(id, user.id);
  if (!data) notFound();

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  return (
    <main className="py-16">
      <Container width="narrow">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-cyan">
              Team
            </p>
            <h1 className="mt-3 font-display text-5xl">{data.team.name}</h1>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/teams/${data.team.id}`}>Public page →</Link>
          </Button>
        </div>
        {data.team.description && (
          <p className="mt-4 text-text-dim">{data.team.description}</p>
        )}

        {data.isLead && (
          <div className="mt-12">
            <InviteLinkCard
              teamId={data.team.id}
              invites={data.invites}
              baseUrl={baseUrl}
            />
          </div>
        )}

        <div className="mt-12">
          <MemberList members={data.members} />
        </div>
      </Container>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(teams): add /teams/[id]/manage with invites + members"
```

---

## Task 4: Invite acceptance flow

**Files:**
- Create: `lib/actions/invites.ts`, `app/invite/[code]/page.tsx`, `app/invite/[code]/_components/accept-button.tsx`

- [ ] **Step 1: Create `lib/actions/invites.ts`**

```typescript
"use server";

import { v7 as uuidv7 } from "uuid";
import { eq, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { syncUser } from "@/lib/auth/sync-user";
import { teamInvites, teamMembers } from "@/lib/db/schema";

export async function acceptInvite(
  code: string
): Promise<
  | { ok: true; teamId: string }
  | { ok: false; error: string }
  | { ok: "needs-onboard"; teamId: string }
> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  const db = getDb();
  const invite = await db.query.teamInvites.findFirst({
    where: eq(teamInvites.code, code),
  });
  if (!invite) return { ok: false, error: "invite not found" };
  if (invite.expiresAt < Date.now())
    return { ok: false, error: "invite expired" };
  if (invite.usedByUserId)
    return { ok: false, error: "invite already used" };

  const existing = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, invite.teamId),
      eq(teamMembers.userId, user.id)
    ),
  });
  if (existing) return { ok: true, teamId: invite.teamId };

  if (user.role !== "researcher")
    return { ok: false, error: "only researchers can join teams" };

  await db.insert(teamMembers).values({
    id: uuidv7(),
    teamId: invite.teamId,
    userId: user.id,
    role: "member",
  });
  await db
    .update(teamInvites)
    .set({ usedByUserId: user.id })
    .where(eq(teamInvites.id, invite.id));
  revalidatePath(`/teams/${invite.teamId}`);
  revalidatePath(`/teams/${invite.teamId}/manage`);

  // Researcher needs an onboarded profile to be useful on the team.
  const onboarded = await db.query.researchers.findFirst({
    where: (r, { eq }) => eq(r.userId, user.id),
  });
  if (!onboarded) return { ok: "needs-onboard", teamId: invite.teamId };

  return { ok: true, teamId: invite.teamId };
}
```

- [ ] **Step 2: Create `app/invite/[code]/_components/accept-button.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/lib/actions/invites";

export function AcceptButton({ code }: { code: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await acceptInvite(code);
      if (res.ok === false) {
        setError(res.error);
        return;
      }
      if (res.ok === "needs-onboard") {
        router.push(`/onboard?after=/teams/${res.teamId}`);
        return;
      }
      router.push(`/teams/${res.teamId}`);
    });
  }

  return (
    <>
      <Button size="lg" onClick={go} disabled={pending}>
        {pending ? "Accepting…" : "Accept invite"}
      </Button>
      {error && <p className="mt-3 text-sm text-rose">{error}</p>}
    </>
  );
}
```

- [ ] **Step 3: Create `app/invite/[code]/page.tsx`**

```typescript
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";
import { getDb } from "@/lib/db/client";
import { teamInvites, teams } from "@/lib/db/schema";
import { AcceptButton } from "./_components/accept-button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const db = getDb();
  const invite = await db.query.teamInvites.findFirst({
    where: eq(teamInvites.code, code),
  });
  if (!invite) notFound();

  const [team] = await db.select().from(teams).where(eq(teams.id, invite.teamId)).limit(1);
  if (!team) notFound();

  const expired = invite.expiresAt < Date.now();
  const used = !!invite.usedByUserId;

  const { userId } = await auth();

  return (
    <main className="py-32">
      <Container width="narrow" className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan">
          Team invitation
        </p>
        <h1 className="mt-4 font-display text-5xl">
          You're invited to join{" "}
          <span className="italic text-text-dim">{team.name}</span>.
        </h1>
        {team.description && (
          <p className="mt-6 text-text-dim">{team.description}</p>
        )}

        <div className="mt-12">
          {expired ? (
            <p className="text-rose">This invite has expired.</p>
          ) : used ? (
            <p className="text-rose">This invite has already been used.</p>
          ) : !userId ? (
            <Button asChild size="lg">
              <Link href={`/sign-up?redirect_url=/invite/${code}`}>
                Sign up to accept
              </Link>
            </Button>
          ) : (
            <AcceptButton code={code} />
          )}
        </div>
      </Container>
    </main>
  );
}
```

- [ ] **Step 4: Smoke-test end-to-end**

Deploy to staging. With two browsers (signed in as two different researchers):
1. Browser A: `/teams/new` → create "Convex Lab" → land on `/teams/<id>/manage` → click "+ New invite" → copy the link.
2. Browser B: open the link → see "You're invited" page → click Accept → redirect to `/teams/<id>`.
3. Refresh Browser A's manage page → see Browser B as a member; the invite is gone.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(invites): add /invite/[code] accept flow"
```

---

## Task 5: Aggregate expertise widget for the team page

The public team page already shows aggregate expertise (Plan 1 Task 6). Validate it renders with multi-member data.

**Files:**
- (validation only, no new files)

- [ ] **Step 1: Verify with seeded data**

After Plan 7's seed runs, `/teams/<convex-lab-id>` should show 8-12 concept tags ranked by aggregate score.

If you'd like a richer visualization:

- [ ] **Step 2 (optional): Replace the cloud with a horizontal bar chart**

Edit `components/team/expertise-cloud.tsx` to render bars:

```typescript
export function ExpertiseCloud({
  concepts,
}: {
  concepts: { concept: string; score: number }[];
}) {
  if (concepts.length === 0)
    return <p className="text-sm text-text-dim">No expertise data yet.</p>;
  return (
    <ol className="space-y-2">
      {concepts.map((c) => (
        <li key={c.concept} className="grid grid-cols-[1fr_120px_2fr] items-center gap-3">
          <span className="truncate text-sm text-text">{c.concept}</span>
          <div className="h-1.5 w-full rounded-full bg-ink-3">
            <div
              className="h-full rounded-full bg-cyan"
              style={{ width: `${Math.round(c.score * 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs text-text-dim">
            {Math.round(c.score * 100)}
          </span>
        </li>
      ))}
    </ol>
  );
}
```

(Skip if the chip cloud feels right.)

- [ ] **Step 3: Commit (only if step 2 was done)**

```bash
git add -A
git commit -m "feat(team): switch expertise cloud to bar visualization"
```

---

## Definition of done for Plan 3

- [ ] Researchers can create a team via `/teams/new`.
- [ ] Team lead can generate, copy, and revoke invite links from `/teams/[id]/manage`.
- [ ] An invite link, opened by a signed-in researcher, adds them as a member.
- [ ] Invites are one-shot (`used_by_user_id` set) and expire (`expires_at`).
- [ ] If a researcher accepting an invite hasn't onboarded yet, they're routed to `/onboard?after=/teams/<id>`.
- [ ] Public team page (`/teams/[id]`) shows aggregate expertise across the new members.
- [ ] All previous tests still pass.

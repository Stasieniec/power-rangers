# Plan 0 — Foundation & Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Polymath repository with a deployable Next.js + Cloudflare Workers app, all bindings provisioned, Clerk auth gating a stub `/dashboard`, Drizzle schema applied to D1, design tokens in place, base shadcn overrides committed, Gemini wrapper smoke-tested, CI green, and a "hello-world" build live on a staging Cloudflare environment.

**Architecture:** Single Next.js 15 (App Router, RSC, server actions) deployed to Cloudflare Workers via `@opennextjs/cloudflare`. D1 + R2 + KV bound at the Worker level. Clerk handles auth via middleware. All AI runs server-side. TypeScript strict end-to-end.

**Tech Stack:** Next.js 15, TypeScript (strict), Tailwind v4, shadcn/ui, Drizzle ORM, Clerk, Cloudflare D1/R2/KV, `@opennextjs/cloudflare`, Wrangler, Gemini 3 Flash REST, Zod, Vitest, ESLint/Prettier/Husky.

---

## Prerequisites

Before starting:
- A Cloudflare account with billing enabled (D1, R2, KV are within free-tier limits but R2 needs the toggle).
- `wrangler` CLI installed and `wrangler login` completed.
- A Clerk account with one application provisioned ("Polymath Staging"). Note the publishable key + secret key + webhook signing secret.
- A Google AI Studio API key for Gemini.
- Node 22 LTS, pnpm 9+, git.
- Repository pushed to GitHub at `power-rangers/polymath` (or whatever the org is) with `main` branch protected.

---

## File structure laid down by this plan

```
polymath/
├─ app/
│  ├─ (app)/dashboard/page.tsx       # gated stub
│  ├─ layout.tsx                      # ClerkProvider + fonts
│  ├─ page.tsx                        # placeholder landing
│  └─ globals.css                     # Tailwind v4 + @theme
├─ components/ui/
│  ├─ button.tsx
│  ├─ card.tsx
│  └─ input.tsx
├─ lib/
│  ├─ ai/
│  │  ├─ gemini.ts
│  │  └─ schemas.ts
│  ├─ db/
│  │  ├─ schema.ts
│  │  └─ client.ts
│  └─ env.ts                          # typed bindings access
├─ drizzle/                           # generated migrations
├─ scripts/db-reset.ts
├─ tests/
│  └─ lib/ai/gemini.test.ts
├─ .github/workflows/ci.yml
├─ .github/workflows/deploy.yml
├─ middleware.ts                      # Clerk
├─ wrangler.toml
├─ open-next.config.ts
├─ next.config.ts
├─ drizzle.config.ts
├─ vitest.config.ts
├─ tsconfig.json
├─ package.json
├─ .env.example
├─ .env.local                         # .gitignored
├─ README.md
└─ CLAUDE.md
```

---

## Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`

- [ ] **Step 1: Create the Next.js app**

```bash
cd /home/stas/Desktop/power-rangers
pnpm create next-app@latest polymath --typescript --tailwind --app --no-eslint --src-dir=false --import-alias="@/*" --turbopack
```

When prompted, accept defaults except: no ESLint (we add a stricter config later). Move generated files into the repo root:

```bash
shopt -s dotglob
mv polymath/* polymath/.[!.]* .
rmdir polymath
```

- [ ] **Step 2: Pin Node version**

Create `.nvmrc`:

```
22
```

Add to `package.json`:

```json
"engines": { "node": ">=22.0.0" }
```

- [ ] **Step 3: Tighten `tsconfig.json`**

Replace `compilerOptions` with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Verify dev server starts**

```bash
pnpm dev
```

Expected: dev server on `http://localhost:3000` rendering the default Next.js page. Stop with Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app with strict TypeScript"
```

---

## Task 2: Wire `@opennextjs/cloudflare` for Workers deploy

**Files:**
- Create: `open-next.config.ts`, `wrangler.toml`
- Modify: `package.json`, `next.config.ts`

- [ ] **Step 1: Install adapter**

```bash
pnpm add -D @opennextjs/cloudflare wrangler
```

- [ ] **Step 2: Create `open-next.config.ts`**

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
```

- [ ] **Step 3: Create `wrangler.toml`**

```toml
name = "polymath"
main = ".open-next/worker.js"
compatibility_date = "2026-04-15"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

# --- Secrets are set with `wrangler secret put` ---
# GEMINI_API_KEY
# CLERK_SECRET_KEY
# CLERK_WEBHOOK_SECRET
# OPENALEX_EMAIL

[[d1_databases]]
binding = "DB"
database_name = "polymath-staging"
database_id = "REPLACE_WITH_STAGING_DB_ID"

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "polymath-staging-uploads"

[[kv_namespaces]]
binding = "KV"
id = "REPLACE_WITH_STAGING_KV_ID"

[env.production]
name = "polymath-prod"

[[env.production.d1_databases]]
binding = "DB"
database_name = "polymath-prod"
database_id = "REPLACE_WITH_PROD_DB_ID"

[[env.production.r2_buckets]]
binding = "UPLOADS"
bucket_name = "polymath-prod-uploads"

[[env.production.kv_namespaces]]
binding = "KV"
id = "REPLACE_WITH_PROD_KV_ID"

[vars]
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "REPLACE_WITH_STAGING_CLERK_PK"
NEXT_PUBLIC_APP_ENV = "staging"

[env.production.vars]
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "REPLACE_WITH_PROD_CLERK_PK"
NEXT_PUBLIC_APP_ENV = "production"
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "deploy:staging": "opennextjs-cloudflare build && wrangler deploy",
  "deploy:prod": "opennextjs-cloudflare build && wrangler deploy --env production",
  "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
}
```

- [ ] **Step 5: Generate Cloudflare bindings types**

```bash
pnpm cf-typegen
```

Expected: file `cloudflare-env.d.ts` is created with `CloudflareEnv` interface containing `DB`, `UPLOADS`, `KV`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add OpenNext + wrangler config"
```

---

## Task 3: Provision Cloudflare resources (manual — one engineer)

This is a one-time manual step. The output IDs go into `wrangler.toml`.

- [ ] **Step 1: Create staging D1 database**

```bash
wrangler d1 create polymath-staging
```

Copy the `database_id` from the output into `wrangler.toml` `[[d1_databases]]` `database_id`.

- [ ] **Step 2: Create production D1 database**

```bash
wrangler d1 create polymath-prod
```

Copy ID into `[env.production.d1_databases]` `database_id`.

- [ ] **Step 3: Create staging KV namespace**

```bash
wrangler kv namespace create polymath-staging-kv
```

Copy `id` into `[[kv_namespaces]]` `id`.

- [ ] **Step 4: Create production KV namespace**

```bash
wrangler kv namespace create polymath-prod-kv
```

Copy `id` into `[env.production.kv_namespaces]` `id`.

- [ ] **Step 5: Create R2 buckets**

```bash
wrangler r2 bucket create polymath-staging-uploads
wrangler r2 bucket create polymath-prod-uploads
```

- [ ] **Step 6: Set secrets (staging first)**

```bash
wrangler secret put GEMINI_API_KEY
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_WEBHOOK_SECRET
wrangler secret put OPENALEX_EMAIL
```

Repeat with `--env production` for prod.

- [ ] **Step 7: Commit `wrangler.toml` with real IDs**

```bash
git add wrangler.toml
git commit -m "chore: provision Cloudflare D1/R2/KV bindings"
```

---

## Task 4: Tailwind v4 design tokens

**Files:**
- Modify: `app/globals.css`
- Create: `app/fonts.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install fonts via `next/font`**

Create `app/fonts.ts`:

```typescript
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "opsz"],
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
```

- [ ] **Step 2: Apply fonts in root layout**

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { fraunces, inter, jetbrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polymath",
  description: "Research as a competition.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-ink text-text antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Replace `app/globals.css` with design tokens**

```css
@import "tailwindcss";

@theme {
  --color-ink: #0A0E1A;
  --color-ink-2: #111626;
  --color-ink-3: #1A2236;
  --color-paper: #F5F2EC;
  --color-text: #E8E6E1;
  --color-text-dim: #8B92A5;
  --color-cyan: #3FCEDB;
  --color-cyan-dim: #1A6E78;
  --color-gold: #D4A547;
  --color-rose: #E26D7A;

  --font-display: var(--font-display);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
}

@layer base {
  body {
    font-family: var(--font-sans), system-ui, sans-serif;
    line-height: 1.6;
  }
  h1, h2, h3 {
    font-family: var(--font-display), Georgia, serif;
    font-feature-settings: "ss01";
    letter-spacing: -0.011em;
  }
  .font-mono {
    font-family: var(--font-mono), ui-monospace, monospace;
  }
}
```

- [ ] **Step 4: Verify rendering**

```bash
pnpm dev
```

Open http://localhost:3000. The default page should render in Inter on a near-black background. If text is unstyled, the `@theme` block didn't load — check Tailwind v4 plugin is active (Next 15 includes it; if not, `pnpm add -D @tailwindcss/postcss`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(design): apply Polymath color and typography tokens"
```

---

## Task 5: Install shadcn/ui baseline + override Button, Card, Input

**Files:**
- Create: `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`
- Create: `lib/utils.ts`
- Modify: `package.json`

- [ ] **Step 1: Install shadcn dependencies**

```bash
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add -D @types/react @types/react-dom
```

- [ ] **Step 2: Create `lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create `components/ui/button.tsx`**

```typescript
"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-cyan text-ink hover:bg-cyan-dim hover:text-text",
        secondary: "border border-ink-3 bg-ink-2 text-text hover:bg-ink-3",
        ghost: "text-text hover:bg-ink-2",
        link: "text-cyan underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
```

```bash
pnpm add @radix-ui/react-slot
```

- [ ] **Step 4: Create `components/ui/card.tsx`**

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-md border border-ink-3 bg-ink-2 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mb-4 flex flex-col gap-1.5", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-display text-xl text-text", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-text-dim", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-text", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-4 flex items-center justify-end gap-3", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
```

- [ ] **Step 5: Create `components/ui/input.tsx` and `components/ui/label.tsx`**

`components/ui/input.tsx`:

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "h-12 w-full rounded-sm border border-ink-3 bg-ink-3/40 px-4 text-text placeholder:text-text-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
```

`components/ui/label.tsx`:

```typescript
"use client";
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "font-display text-sm text-text-dim peer-disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;
```

```bash
pnpm add @radix-ui/react-label
```

- [ ] **Step 6: Smoke-test on landing page**

Replace `app/page.tsx`:

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-6xl text-text">Polymath</h1>
      <p className="mt-4 text-text-dim">Research as a competition.</p>
      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Foundation laid.</CardTitle>
            <CardDescription>This is a placeholder landing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Primary action</Button>
            <Button variant="secondary" className="ml-3">Secondary</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
```

Run `pnpm dev`. Expect: Fraunces-rendered "Polymath" header, the card with primary cyan button + secondary outlined button.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): add Button, Card, Input, Label primitives"
```

---

## Task 6: Drizzle ORM + full schema + first migration

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/client.ts`, `drizzle.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Drizzle**

```bash
pnpm add drizzle-orm
pnpm add -D drizzle-kit @cloudflare/workers-types
```

- [ ] **Step 2: Add `cloudflare-env.d.ts` to tsconfig include**

In `tsconfig.json`, ensure `include` contains `"cloudflare-env.d.ts"`.

- [ ] **Step 3: Create `lib/db/schema.ts`**

This is the single source of truth for the data model. Mirrors §4 of the design spec.

```typescript
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

const ts = () => integer("created_at").notNull().default(sql`(unixepoch() * 1000)`);
const updatedTs = () => integer("updated_at").notNull().default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    clerkId: text("clerk_id").notNull(),
    email: text("email").notNull(),
    role: text("role", { enum: ["company", "researcher"] }).notNull(),
    displayName: text("display_name").notNull(),
    createdAt: ts(),
    updatedAt: updatedTs(),
  },
  (t) => ({
    clerkIdx: uniqueIndex("users_clerk_id_idx").on(t.clerkId),
    emailIdx: index("users_email_idx").on(t.email),
  })
);

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  website: text("website"),
  logoUrl: text("logo_url"),
  createdAt: ts(),
});

export const researchers = sqliteTable("researchers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  openalexId: text("openalex_id"),
  orcid: text("orcid"),
  affiliation: text("affiliation"),
  headline: text("headline"),
  aiSummary: text("ai_summary"),
  createdAt: ts(),
});

export const publications = sqliteTable(
  "publications",
  {
    id: text("id").primaryKey(),
    researcherId: text("researcher_id").notNull().references(() => researchers.id),
    openalexWorkId: text("openalex_work_id"),
    title: text("title").notNull(),
    year: integer("year"),
    venue: text("venue"),
    abstract: text("abstract"),
    citationCount: integer("citation_count").notNull().default(0),
    doi: text("doi"),
    createdAt: ts(),
  },
  (t) => ({
    researcherIdx: index("publications_researcher_idx").on(t.researcherId),
  })
);

export const researcherConcepts = sqliteTable(
  "researcher_concepts",
  {
    id: text("id").primaryKey(),
    researcherId: text("researcher_id").notNull().references(() => researchers.id),
    concept: text("concept").notNull(),
    score: real("score").notNull(),
    createdAt: ts(),
  },
  (t) => ({
    researcherIdx: index("rc_researcher_idx").on(t.researcherId),
  })
);

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  createdAt: ts(),
});

export const teamMembers = sqliteTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull().references(() => teams.id),
    userId: text("user_id").notNull().references(() => users.id),
    role: text("role", { enum: ["lead", "member"] }).notNull(),
    joinedAt: integer("joined_at").notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uniq: uniqueIndex("team_members_uniq").on(t.teamId, t.userId),
    teamIdx: index("tm_team_idx").on(t.teamId),
    userIdx: index("tm_user_idx").on(t.userId),
  })
);

export const teamInvites = sqliteTable(
  "team_invites",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull().references(() => teams.id),
    code: text("code").notNull(),
    invitedEmail: text("invited_email"),
    expiresAt: integer("expires_at").notNull(),
    usedByUserId: text("used_by_user_id").references(() => users.id),
    createdAt: ts(),
  },
  (t) => ({
    codeIdx: uniqueIndex("team_invites_code_idx").on(t.code),
  })
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    title: text("title").notNull(),
    businessPlan: text("business_plan").notNull(),
    endGoal: text("end_goal").notNull(),
    status: text("status", { enum: ["draft", "open", "in_progress", "completed"] })
      .notNull()
      .default("draft"),
    acceptedTeamId: text("accepted_team_id").references(() => teams.id),
    createdAt: ts(),
    updatedAt: updatedTs(),
  },
  (t) => ({
    companyIdx: index("projects_company_idx").on(t.companyId),
    statusIdx: index("projects_status_idx").on(t.status),
  })
);

export const researchQuestions = sqliteTable(
  "research_questions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id),
    question: text("question").notNull(),
    rationale: text("rationale").notNull(),
    orderIndex: integer("order_index").notNull(),
    aiGenerated: integer("ai_generated", { mode: "boolean" }).notNull().default(true),
    concepts: text("concepts").notNull().default("[]"), // JSON: [{label, weight}]
    createdAt: ts(),
  },
  (t) => ({
    projectIdx: index("rq_project_idx").on(t.projectId),
  })
);

export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id),
    teamId: text("team_id").notNull().references(() => teams.id),
    status: text("status", { enum: ["pending", "accepted", "rejected"] })
      .notNull()
      .default("pending"),
    matchScore: integer("match_score").notNull(),
    matchRationale: text("match_rationale").notNull(),
    perQuestionAlignment: text("per_question_alignment").notNull().default("[]"),
    pitch: text("pitch").notNull(),
    createdAt: ts(),
  },
  (t) => ({
    uniq: uniqueIndex("apps_project_team_uniq").on(t.projectId, t.teamId),
    projectIdx: index("apps_project_idx").on(t.projectId),
  })
);

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id),
    teamId: text("team_id").notNull().references(() => teams.id),
    weekOf: text("week_of").notNull(), // ISO date YYYY-MM-DD
    rawMarkdown: text("raw_markdown").notNull(),
    submittedByUserId: text("submitted_by_user_id").notNull().references(() => users.id),
    createdAt: ts(),
  },
  (t) => ({
    projectIdx: index("reports_project_idx").on(t.projectId),
  })
);

export const reportFindings = sqliteTable(
  "report_findings",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").notNull().references(() => reports.id),
    researchQuestionId: text("research_question_id")
      .notNull()
      .references(() => researchQuestions.id),
    finding: text("finding").notNull(),
    businessTranslation: text("business_translation").notNull(),
    impactNote: text("impact_note").notNull(),
    createdAt: ts(),
  },
  (t) => ({
    reportIdx: index("rf_report_idx").on(t.reportId),
  })
);

export const reportFiles = sqliteTable("report_files", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => reports.id),
  r2Key: text("r2_key").notNull(),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  createdAt: ts(),
});
```

- [ ] **Step 4: Create `drizzle.config.ts`**

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
} satisfies Config;
```

- [ ] **Step 5: Create `lib/db/client.ts`**

```typescript
import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

export function getDb() {
  const { env } = getCloudflareContext();
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
```

- [ ] **Step 6: Generate migration**

```bash
pnpm drizzle-kit generate --name init
```

Expected: file `drizzle/0000_init.sql` is generated containing all `CREATE TABLE` statements.

- [ ] **Step 7: Apply migration to staging D1**

```bash
wrangler d1 execute polymath-staging --file=drizzle/0000_init.sql --remote
```

Expected: success message with row counts. Verify with:

```bash
wrangler d1 execute polymath-staging --command="SELECT name FROM sqlite_master WHERE type='table'" --remote
```

Expected output: list of all 13 tables.

- [ ] **Step 8: Apply same migration to production D1**

```bash
wrangler d1 execute polymath-prod --file=drizzle/0000_init.sql --remote
```

- [ ] **Step 9: Add migration scripts to `package.json`**

```json
"db:generate": "drizzle-kit generate",
"db:migrate:staging": "wrangler d1 migrations apply polymath-staging --remote",
"db:migrate:prod": "wrangler d1 migrations apply polymath-prod --remote",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(db): add Drizzle schema + initial migration"
```

---

## Task 7: Clerk auth middleware + role selection stub

**Files:**
- Create: `middleware.ts`, `app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `app/(auth)/sign-up/[[...sign-up]]/page.tsx`, `app/(app)/dashboard/page.tsx`, `app/api/webhooks/clerk/route.ts`, `lib/auth/sync-user.ts`
- Modify: `app/layout.tsx`, `package.json`, `.env.example`

- [ ] **Step 1: Install Clerk + svix**

```bash
pnpm add @clerk/nextjs svix uuid
pnpm add -D @types/uuid
```

- [ ] **Step 2: Wrap `app/layout.tsx` with `ClerkProvider`**

```typescript
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { fraunces, inter, jetbrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polymath",
  description: "Research as a competition.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      >
        <body className="bg-ink text-text antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 3: Create `middleware.ts`**

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboard(.*)",
  "/projects/new",
  "/projects/(.*)/manage",
  "/projects/(.*)/dashboard",
  "/projects/(.*)/apply",
  "/projects/(.*)/report",
  "/teams/new",
  "/teams/(.*)/manage",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"],
};
```

- [ ] **Step 4: Create sign-in / sign-up pages (Clerk components)**

`app/(auth)/sign-in/[[...sign-in]]/page.tsx`:

```typescript
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink">
      <SignIn />
    </main>
  );
}
```

Same for `sign-up`:

`app/(auth)/sign-up/[[...sign-up]]/page.tsx`:

```typescript
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink">
      <SignUp />
    </main>
  );
}
```

- [ ] **Step 5: Create the gated dashboard stub**

`app/(app)/dashboard/page.tsx`:

```typescript
import { auth, currentUser } from "@clerk/nextjs/server";
import { syncUser } from "@/lib/auth/sync-user";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;
  const clerkUser = await currentUser();
  const user = await syncUser(clerkUser!);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl text-text">Welcome, {user.displayName}</h1>
      <p className="mt-3 font-mono text-sm text-text-dim">
        role: {user.role} · id: {user.id}
      </p>
    </main>
  );
}
```

- [ ] **Step 6: Create `lib/auth/sync-user.ts` (read-through upsert)**

```typescript
import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";
import type { User as ClerkUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export type AppUser = typeof users.$inferSelect;

export async function syncUser(clerkUser: ClerkUser): Promise<AppUser> {
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUser.id),
  });
  if (existing) return existing;

  const role = (clerkUser.unsafeMetadata?.role as "company" | "researcher" | undefined) ?? "researcher";
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    "Anonymous";
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

  const [created] = await db
    .insert(users)
    .values({
      id: uuidv7(),
      clerkId: clerkUser.id,
      email,
      role,
      displayName,
    })
    .returning();
  return created!;
}
```

- [ ] **Step 7: Create Clerk webhook handler**

`app/api/webhooks/clerk/route.ts`:

```typescript
import { Webhook } from "svix";
import { headers } from "next/headers";
import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(req: Request) {
  const { env } = getCloudflareContext();
  const secret = env.CLERK_WEBHOOK_SECRET;
  if (!secret) return new Response("missing secret", { status: 500 });

  const payload = await req.text();
  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature)
    return new Response("missing svix headers", { status: 400 });

  const wh = new Webhook(secret);
  let evt: { type: string; data: { id: string; email_addresses: { email_address: string }[]; first_name?: string; last_name?: string; unsafe_metadata?: Record<string, unknown> } };
  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof evt;
  } catch {
    return new Response("invalid signature", { status: 401 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const db = getDb();
    const clerkId = evt.data.id;
    const email = evt.data.email_addresses[0]?.email_address ?? "";
    const role =
      (evt.data.unsafe_metadata?.role as "company" | "researcher" | undefined) ??
      "researcher";
    const displayName =
      [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || "Anonymous";

    const existing = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (existing) {
      await db
        .update(users)
        .set({ email, displayName, updatedAt: Date.now() })
        .where(eq(users.id, existing.id));
    } else {
      await db.insert(users).values({
        id: uuidv7(),
        clerkId,
        email,
        role,
        displayName,
      });
    }
  }
  return new Response("ok", { status: 200 });
}
```

- [ ] **Step 8: Add Clerk env vars to `.env.example`**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
GEMINI_API_KEY=
OPENALEX_EMAIL=
```

Mirror to local `.env.local` with real values from your Clerk app.

- [ ] **Step 9: Smoke-test locally**

```bash
pnpm dev
```

Visit `/sign-up`, register a test account, get redirected to `/dashboard`, see the welcome message rendered. Visit the Cloudflare D1 console (or `wrangler d1 execute polymath-staging --command="SELECT * FROM users"` after deploy) to verify the row appears.

Note: the webhook fires on real Clerk events (only after deploy). The `syncUser` function covers local-dev gaps.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(auth): add Clerk middleware, sign-in/up, dashboard stub, user sync"
```

---

## Task 8: Gemini wrapper + Zod schemas + unit test

**Files:**
- Create: `lib/ai/gemini.ts`, `lib/ai/schemas.ts`, `tests/lib/ai/gemini.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest + Zod**

```bash
pnpm add zod
pnpm add -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 3: Add scripts**

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Create `lib/ai/schemas.ts`** (placeholder schemas; expanded in later plans)

```typescript
import { z } from "zod";

export const conceptSchema = z.object({
  label: z.string(),
  weight: z.number().min(0).max(1),
});

export const generatedQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(10),
        rationale: z.string().min(10),
        order_index: z.number().int().min(0),
        concepts: z.array(conceptSchema).min(1),
      })
    )
    .min(3)
    .max(8),
});

export const researcherSummarySchema = z.object({
  headline: z.string().min(5),
  summary: z.string().min(20),
  expertise_tags: z.array(conceptSchema).min(1),
});

export const matchResultSchema = z.object({
  match_score: z.number().int().min(0).max(100),
  rationale: z.string().min(20),
  per_question_alignment: z.array(
    z.object({
      question_id: z.string(),
      score: z.number().int().min(0).max(100),
      why: z.string().min(5),
    })
  ),
});

export const reportFindingsSchema = z.object({
  findings: z.array(
    z.object({
      research_question_id: z.string(),
      finding: z.string().min(5),
      business_translation: z.string().min(5),
      impact_note: z.string().min(2),
    })
  ),
});
```

- [ ] **Step 5: Create `lib/ai/gemini.ts`**

```typescript
import { z } from "zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent";

interface GenerateOpts {
  system: string;
  prompt: string;
  apiKey?: string; // overrideable for tests
  fetchImpl?: typeof fetch; // injectable for tests
}

export class GeminiError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "GeminiError";
  }
}

export async function generate<T>(
  schema: z.ZodSchema<T>,
  opts: GenerateOpts
): Promise<T> {
  const apiKey =
    opts.apiKey ?? getCloudflareContext().env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY not set");
  const fetchImpl = opts.fetchImpl ?? fetch;

  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  };

  const res = await fetchImpl(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new GeminiError(`gemini ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError("no text in response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new GeminiError("response was not JSON", e);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new GeminiError(`schema mismatch: ${result.error.message}`);
  }
  return result.data;
}
```

- [ ] **Step 6: Write the failing test**

`tests/lib/ai/gemini.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { generate, GeminiError } from "@/lib/ai/gemini";

const schema = z.object({ greeting: z.string() });

function mockFetch(body: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })
  );
}

describe("generate", () => {
  it("parses valid JSON matching schema", async () => {
    const fetchImpl = mockFetch({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ greeting: "hello" }) }],
          },
        },
      ],
    });
    const out = await generate(schema, {
      system: "s",
      prompt: "p",
      apiKey: "test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toEqual({ greeting: "hello" });
  });

  it("throws GeminiError on non-200", async () => {
    const fetchImpl = mockFetch({ error: "rate limited" }, 429);
    await expect(
      generate(schema, {
        system: "s",
        prompt: "p",
        apiKey: "test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toThrow(GeminiError);
  });

  it("throws on schema mismatch", async () => {
    const fetchImpl = mockFetch({
      candidates: [
        { content: { parts: [{ text: JSON.stringify({ wrong: 1 }) }] } },
      ],
    });
    await expect(
      generate(schema, {
        system: "s",
        prompt: "p",
        apiKey: "test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toThrow(/schema mismatch/);
  });

  it("throws on non-JSON response body", async () => {
    const fetchImpl = mockFetch({
      candidates: [{ content: { parts: [{ text: "not json {{" }] } }],
    });
    await expect(
      generate(schema, {
        system: "s",
        prompt: "p",
        apiKey: "test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toThrow(/not JSON/);
  });
});
```

- [ ] **Step 7: Run tests**

```bash
pnpm test
```

Expected: all 4 tests pass. If any fail, fix the wrapper or test until green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ai): add Gemini wrapper with Zod validation + tests"
```

---

## Task 9: ESLint flat config + Prettier + Husky

**Files:**
- Create: `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.husky/pre-commit`, `commitlint.config.mjs`
- Modify: `package.json`

- [ ] **Step 1: Install lint stack**

```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react eslint-plugin-react-hooks @next/eslint-plugin-next prettier eslint-config-prettier eslint-plugin-prettier husky lint-staged @commitlint/cli @commitlint/config-conventional
```

- [ ] **Step 2: Create `eslint.config.mjs`**

```javascript
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "@next/eslint-plugin-next";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: { "@next/next": next, react, "react-hooks": hooks },
    languageOptions: {
      parserOptions: { project: ["./tsconfig.json"] },
    },
    rules: {
      ...next.configs.recommended.rules,
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  { ignores: [".next/**", "node_modules/**", "drizzle/**", ".open-next/**"] },
  prettier
);
```

- [ ] **Step 3: Create `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

```bash
pnpm add -D prettier-plugin-tailwindcss
```

- [ ] **Step 4: Create `.prettierignore`**

```
.next
.open-next
drizzle
node_modules
pnpm-lock.yaml
```

- [ ] **Step 5: Set up Husky**

```bash
pnpm dlx husky init
```

Replace `.husky/pre-commit`:

```bash
pnpm lint-staged
```

- [ ] **Step 6: Add `lint-staged` config to `package.json`**

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

- [ ] **Step 7: Create `commitlint.config.mjs`**

```javascript
export default { extends: ["@commitlint/config-conventional"] };
```

Add a commit-msg hook:

```bash
echo 'pnpm dlx commitlint --edit $1' > .husky/commit-msg
chmod +x .husky/commit-msg
```

- [ ] **Step 8: Add scripts**

```json
"lint": "eslint .",
"format": "prettier --write ."
```

- [ ] **Step 9: Run lint + format on the existing tree**

```bash
pnpm format
pnpm lint
```

Fix any errors that surface. Common: unused imports, quote style.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: add ESLint, Prettier, Husky, commitlint"
```

---

## Task 10: GitHub Actions CI + deploy workflows

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `CODEOWNERS`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_dummy
```

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      env:
        type: choice
        options: [staging, production]
        default: staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Build for Cloudflare
        run: pnpm exec opennextjs-cloudflare build
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: ${{ inputs.env == 'production' && 'deploy --env production' || 'deploy' }}
```

- [ ] **Step 3: Create `.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## What

<!-- 1-2 sentences -->

## Screenshots (if UI)

## Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (if AI/math touched)
- [ ] AI prompt updated in `lib/ai/prompts/*` (if applicable)
- [ ] Migration generated + applied to staging (if schema touched)
```

- [ ] **Step 4: Create `CODEOWNERS`**

```
# Default — replace with real GitHub handles for the four team members
*                  @stas-default
/lib/ai/           @ai-owner
/lib/db/           @db-owner
/components/       @ui-owner
/app/              @app-owner
```

- [ ] **Step 5: Add GitHub repo secrets (manual, one engineer)**

In the GitHub repo settings → Secrets and variables → Actions:

- `CLOUDFLARE_API_TOKEN` (token with Workers, D1, R2, KV write scopes)
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (staging key)

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "ci: add CI + deploy workflows + PR template + CODEOWNERS"
git push -u origin main
```

Verify the CI workflow runs green on GitHub.

---

## Task 11: First deploy to staging

- [ ] **Step 1: Build locally to catch issues early**

```bash
pnpm exec opennextjs-cloudflare build
```

Expected: completes without errors. The `.open-next` directory is created.

- [ ] **Step 2: Preview locally with bindings**

```bash
pnpm preview
```

Expected: a Workers-emulated server runs on `http://localhost:8787` with D1/R2/KV bindings active. Visit `/` and see the placeholder landing.

- [ ] **Step 3: Deploy to staging**

```bash
pnpm deploy:staging
```

Expected: a deployment URL is printed (e.g. `https://polymath.<your-subdomain>.workers.dev`).

- [ ] **Step 4: Smoke-test deployed app**

Visit the deployed URL. Verify:
- Landing renders (Fraunces serif, dark background, primary cyan button).
- `/sign-up` shows Clerk's hosted form.
- After signup, `/dashboard` renders the welcome message and `users` row appears in D1 (`wrangler d1 execute polymath-staging --command="SELECT * FROM users" --remote`).

- [ ] **Step 5: Configure Clerk webhook to point at deployed URL**

In the Clerk dashboard for the staging app: Webhooks → add endpoint `https://<deployed-url>/api/webhooks/clerk` for events `user.created`, `user.updated`. Copy the signing secret into the production env's `CLERK_WEBHOOK_SECRET` if you haven't already.

- [ ] **Step 6: Commit deploy notes**

Append to `README.md` a short "Deploy" section linking the staging URL.

```bash
git add README.md
git commit -m "docs: link staging deploy URL"
```

---

## Task 12: CLAUDE.md and runbook skeletons

**Files:**
- Create: `CLAUDE.md`, `docs/runbook.md`

- [ ] **Step 1: Create `CLAUDE.md`**

```markdown
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
```

- [ ] **Step 2: Create `docs/runbook.md`**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add CLAUDE.md and runbook skeleton"
```

---

## Definition of done for Plan 0

- [ ] Repo deployed to staging Cloudflare Worker.
- [ ] `/`, `/sign-in`, `/sign-up`, `/dashboard` all render.
- [ ] A test signup creates a row in D1 `users`.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all pass.
- [ ] CI green on `main`.
- [ ] All 13 tables present in staging + production D1.
- [ ] `lib/ai/gemini.ts` covered by 4 unit tests.
- [ ] Design tokens applied (Fraunces serif visible, cyan + ink palette correct).
- [ ] `CLAUDE.md` and `docs/runbook.md` committed.

After Plan 0 lands, Plans 1-7 can begin (some in parallel on separate branches).

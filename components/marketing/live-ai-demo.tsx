"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Container } from "@/components/shell/container";
import { runLandingDemo } from "@/lib/actions/landing-demo";

const SAMPLE_TITLE = "Customer churn prediction";
const SAMPLE_PLAN = `We're a B2B SaaS for SMB retailers. Customers churn at 8% monthly, costing us roughly $400 ARR per lost account. We have 18 months of transaction logs, support-ticket history, and product-usage telemetry across ~3,200 active customers.

We believe most churn is predictable from behavioural signals 14-21 days before cancellation: declining login frequency, increasing support volume on certain feature areas, and stalling adoption of our newer modules. We have not yet validated this empirically.`;
const SAMPLE_GOAL = `A weekly churn-risk score per customer, with intervention recommendations that the customer-success team can act on within the same week. The score must be interpretable enough for a CSM to explain to a customer, not a black box.`;

interface Question {
  question: string;
  rationale: string;
  order_index: number;
  concepts: { label: string; weight: number }[];
}

type Phase =
  | { kind: "idle" }
  | { kind: "loading"; step: "thinking" | "structuring" }
  | { kind: "done"; questions: Question[] }
  | { kind: "error"; message: string };

export function LiveAIDemo() {
  const [title, setTitle] = useState(SAMPLE_TITLE);
  const [businessPlan, setBusinessPlan] = useState(SAMPLE_PLAN);
  const [endGoal, setEndGoal] = useState(SAMPLE_GOAL);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function go() {
    setPhase({ kind: "loading", step: "thinking" });
    startTransition(async () => {
      const stepTimer = setTimeout(() => {
        setPhase({ kind: "loading", step: "structuring" });
      }, 2500);
      const res = await runLandingDemo({ title, businessPlan, endGoal });
      clearTimeout(stepTimer);
      if (!res.ok) {
        setPhase({ kind: "error", message: res.error });
        return;
      }
      setPhase({ kind: "done", questions: res.questions });
    });
  }

  return (
    <section id="try-it" className="border-ink-3/60 bg-ink-2/30 border-t border-b py-24">
      <Container>
        <div className="grid gap-12 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-cyan font-mono text-xs tracking-widest uppercase">
              Try it live · no signup
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight md:text-5xl">
              Watch the translation
              <br />
              <span className="text-text-dim italic">happen.</span>
            </h2>
            <p className="text-text-dim mt-6 max-w-prose">
              Gemini turns a paragraph of business intent into structured, scoped research questions
              — concept-tagged so they slot into the matching engine. Edit the sample below or paste
              your own.
            </p>

            <div className="mt-10 space-y-5">
              <div>
                <Label htmlFor="ld-title">Project title</Label>
                <Input
                  id="ld-title"
                  className="mt-2"
                  maxLength={120}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="ld-plan">Business plan</Label>
                <textarea
                  id="ld-plan"
                  rows={7}
                  maxLength={4000}
                  value={businessPlan}
                  onChange={(e) => {
                    setBusinessPlan(e.target.value);
                  }}
                  className="border-ink-3 bg-ink-3/40 text-text placeholder:text-text-dim focus-visible:ring-cyan/60 mt-2 w-full rounded-sm border px-4 py-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                />
              </div>
              <div>
                <Label htmlFor="ld-goal">End-goal</Label>
                <textarea
                  id="ld-goal"
                  rows={3}
                  maxLength={500}
                  value={endGoal}
                  onChange={(e) => {
                    setEndGoal(e.target.value);
                  }}
                  className="border-ink-3 bg-ink-3/40 text-text placeholder:text-text-dim focus-visible:ring-cyan/60 mt-2 w-full rounded-sm border px-4 py-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                />
              </div>

              <Button size="lg" onClick={go} disabled={pending}>
                {pending ? "Generating…" : "Generate research questions →"}
              </Button>
            </div>
          </div>

          <div className="md:pt-12">
            <ResultColumn phase={phase} />
          </div>
        </div>
      </Container>
    </section>
  );
}

function ResultColumn({ phase }: { phase: Phase }) {
  if (phase.kind === "idle") {
    return (
      <div className="border-ink-3 bg-ink-2/40 rounded-md border border-dashed p-10 text-center">
        <p className="text-text-dim font-mono text-xs tracking-widest uppercase">Output preview</p>
        <p className="font-display text-text-dim mt-4 text-xl">
          Click <span className="text-cyan">Generate</span> to see what Gemini produces from the
          input on the left.
        </p>
        <p className="text-text-dim mt-4 text-xs">
          Around 5–8 seconds. Real Gemini call, not a stub.
        </p>
      </div>
    );
  }

  if (phase.kind === "loading") {
    return (
      <div className="border-cyan/30 bg-cyan/5 rounded-md border p-8">
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">
          {phase.step === "thinking" ? "Reading the brief…" : "Structuring research questions…"}
        </p>
        <div className="mt-6 space-y-3">
          <div className="bg-ink-3 h-3 w-3/4 animate-pulse rounded" />
          <div className="bg-ink-3 h-3 w-full animate-pulse rounded" />
          <div className="bg-ink-3 h-3 w-5/6 animate-pulse rounded" />
          <div className="bg-ink-3 mt-6 h-3 w-2/3 animate-pulse rounded" />
          <div className="bg-ink-3 h-3 w-4/5 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className="border-rose/40 bg-rose/5 rounded-md border p-6">
        <p className="text-rose font-mono text-xs tracking-widest uppercase">Couldn't generate</p>
        <p className="text-text mt-3 text-sm">{phase.message}</p>
        <p className="text-text-dim mt-4 text-xs">
          Try again, or{" "}
          <Link href="/sign-up" className="text-cyan hover:underline">
            sign up
          </Link>{" "}
          for the full flow.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-cyan font-mono text-xs tracking-widest uppercase">
        {phase.questions.length} research questions generated
      </p>
      <ol className="mt-6 space-y-6">
        {phase.questions.map((q) => (
          <li key={q.order_index} className="border-ink-3 border-l-2 py-2 pl-5">
            <p className="text-cyan font-mono text-xs">
              Q{String(q.order_index + 1).padStart(2, "0")}
            </p>
            <p className="font-display mt-2 text-lg leading-snug">
              <span className="font-display text-gold text-2xl">{q.question.slice(0, 1)}</span>
              {q.question.slice(1)}
            </p>
            <p className="text-text-dim mt-2 text-sm">{q.rationale}</p>
            {q.concepts.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {q.concepts.map((c) => (
                  <li
                    key={c.label}
                    className="border-ink-3 bg-ink-2 text-text-dim rounded-sm border px-2 py-0.5 font-mono text-[10px]"
                  >
                    {c.label}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <p className="text-text-dim mt-8 text-xs">
        That&apos;s pillar one. Want to see the full flow —{" "}
        <Link href="/demo" className="text-gold hover:underline">
          try the demo door
        </Link>
        .
      </p>
    </div>
  );
}

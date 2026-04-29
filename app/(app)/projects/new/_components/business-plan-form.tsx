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

  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createDraftProject({ title, businessPlan, endGoal });
      if (!res.ok) {
        setError(res.error);
      } else {
        router.push(`/projects/${res.projectId}/edit`);
      }
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
          onChange={(e) => {
            setTitle(e.target.value);
          }}
        />
      </div>
      <div>
        <Label htmlFor="business-plan">Business plan</Label>
        <p className="text-text-dim mt-1 text-xs">
          Paste the relevant background — what your company does, who the customers are, what
          problem you&apos;re solving.
        </p>
        <textarea
          id="business-plan"
          required
          rows={8}
          maxLength={4000}
          value={businessPlan}
          onChange={(e) => {
            setBusinessPlan(e.target.value);
          }}
          className="border-ink-3 bg-ink-3/40 text-text placeholder:text-text-dim focus-visible:ring-cyan/60 mt-2 w-full rounded-sm border px-4 py-3 focus-visible:ring-2 focus-visible:outline-none"
        />
      </div>
      <div>
        <Label htmlFor="end-goal">End-goal</Label>
        <p className="text-text-dim mt-1 text-xs">
          What concrete artifact or insight would success look like?
        </p>
        <textarea
          id="end-goal"
          required
          rows={3}
          maxLength={500}
          value={endGoal}
          onChange={(e) => {
            setEndGoal(e.target.value);
          }}
          className="border-ink-3 bg-ink-3/40 text-text placeholder:text-text-dim focus-visible:ring-cyan/60 mt-2 w-full rounded-sm border px-4 py-3 focus-visible:ring-2 focus-visible:outline-none"
        />
      </div>

      {pending && (
        <div className="border-cyan/30 bg-cyan/5 rounded-md border p-6">
          <p className="text-cyan font-mono text-xs tracking-widest uppercase">
            Generating research questions with Gemini…
          </p>
          <div className="mt-4 space-y-2">
            <div className="bg-ink-3 h-3 w-2/3 animate-pulse rounded" />
            <div className="bg-ink-3 h-3 w-5/6 animate-pulse rounded" />
            <div className="bg-ink-3 h-3 w-3/4 animate-pulse rounded" />
          </div>
        </div>
      )}

      {error && <p className="text-rose text-sm">{error}</p>}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Generating…" : "Generate research questions"}
      </Button>
    </form>
  );
}

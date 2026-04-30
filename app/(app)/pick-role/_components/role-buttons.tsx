"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { pickRole } from "@/lib/actions/pick-role";

export function RoleButtons() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function choose(role: "company" | "researcher") {
    setError(null);
    startTransition(async () => {
      const res = await pickRole(role);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(role === "researcher" ? "/onboard" : "/dashboard");
    });
  }

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            choose("researcher");
          }}
          className="group border-ink-3 bg-ink-2 hover:border-cyan/60 hover:bg-ink-3 rounded-md border p-8 text-left transition-colors disabled:opacity-50"
        >
          <p className="text-cyan font-mono text-xs tracking-widest uppercase">Researcher</p>
          <h3 className="font-display mt-3 text-2xl">I want to compete on projects.</h3>
          <p className="text-text-dim mt-3 text-sm">
            Connect your ORCID, build a profile from real publications, form a team, and apply to
            open projects.
          </p>
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            choose("company");
          }}
          className="group border-ink-3 bg-ink-2 hover:border-cyan/60 hover:bg-ink-3 rounded-md border p-8 text-left transition-colors disabled:opacity-50"
        >
          <p className="text-gold font-mono text-xs tracking-widest uppercase">Company</p>
          <h3 className="font-display mt-3 text-2xl">I want to post research projects.</h3>
          <p className="text-text-dim mt-3 text-sm">
            Paste a business plan, watch Polymath translate it into research questions, and review
            applications from competing teams.
          </p>
        </button>
      </div>

      {pending && (
        <p className="text-cyan mt-6 font-mono text-xs tracking-widest uppercase">Saving…</p>
      )}
      {error && <p className="text-rose mt-6 text-sm">{error}</p>}

      <Button asChild variant="ghost" size="sm" className="mt-12">
        <a href="/dashboard">Skip for now</a>
      </Button>
    </div>
  );
}

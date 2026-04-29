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
  const [isPending, startTransition] = useTransition();
  void isPending;

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
    <div className="border-ink-3 bg-ink-2 rounded-md border p-6">
      <p className="text-text-dim font-mono text-xs tracking-widest uppercase">
        Try with a demo researcher
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {DEMO_RESEARCHERS.map((r) => (
          <Button
            key={r.orcid}
            variant="secondary"
            size="md"
            disabled={state.kind === "loading"}
            onClick={() => {
              pick(r.orcid, r.label);
            }}
            className="h-auto flex-col items-start text-left"
          >
            <span className="font-display text-sm">{r.label}</span>
            <span className="text-text-dim mt-1 font-mono text-[10px]">{r.field}</span>
          </Button>
        ))}
      </div>
      {state.kind === "loading" && (
        <p className="text-cyan mt-4 font-mono text-xs">Loading {state.label}…</p>
      )}
      {state.kind === "error" && <p className="text-rose mt-4 text-sm">{state.message}</p>}
    </div>
  );
}

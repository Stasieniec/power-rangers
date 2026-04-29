"use client";

import { useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();
  void isPending;

  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setStage({ kind: "loading", phase: "fetching" });
    startTransition(async () => {
      // Cosmetic phase swap halfway through.
      const phaseTimer = setTimeout(() => {
        setStage({ kind: "loading", phase: "summarizing" });
      }, 2500);
      const res = await onboardResearcher({
        ...(orcid ? { orcid } : {}),
        ...(name ? { name } : {}),
        ...(affiliation ? { affiliation } : {}),
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
          onChange={(e) => {
            setOrcid(e.target.value);
          }}
        />
      </div>
      <p className="text-text-dim text-center text-xs tracking-widest uppercase">— or —</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            className="mt-2"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </div>
        <div>
          <Label htmlFor="affiliation">Affiliation</Label>
          <Input
            id="affiliation"
            name="affiliation"
            className="mt-2"
            value={affiliation}
            onChange={(e) => {
              setAffiliation(e.target.value);
            }}
          />
        </div>
      </div>

      {stage.kind === "loading" && (
        <div className="border-ink-3 bg-ink-2 rounded-md border p-6">
          <p className="text-cyan font-mono text-xs tracking-widest uppercase">
            {stage.phase === "fetching"
              ? "Fetching publications from OpenAlex…"
              : "Analyzing expertise with Gemini…"}
          </p>
          <div className="mt-4 space-y-2">
            <div className="bg-ink-3 h-3 w-2/3 animate-pulse rounded" />
            <div className="bg-ink-3 h-3 w-5/6 animate-pulse rounded" />
            <div className="bg-ink-3 h-3 w-1/2 animate-pulse rounded" />
          </div>
        </div>
      )}

      {stage.kind === "error" && (
        <p className="border-rose/60 bg-rose/10 text-rose rounded-sm border p-3 text-sm">
          {stage.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={stage.kind === "loading" || (!orcid && !name)}>
        {stage.kind === "loading" ? "Building profile…" : "Build my profile"}
      </Button>
    </form>
  );
}

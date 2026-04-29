"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { applyToProject } from "@/lib/actions/applications";

interface Team {
  id: string;
  name: string;
}

export function ApplyForm({ projectId, teams }: { projectId: string; teams: Team[] }) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [pitch, setPitch] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "submitting" | "scoring">("form");
  const router = useRouter();

  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!teamId) return;
    setError(null);
    setPhase("submitting");
    startTransition(async () => {
      const phaseTimer = setTimeout(() => {
        setPhase("scoring");
      }, 1500);
      const res = await applyToProject({ projectId, teamId, pitch });
      clearTimeout(phaseTimer);
      if (!res.ok) {
        setError(res.error);
        setPhase("form");
        return;
      }
      router.push(`/teams/${teamId}`);
    });
  }

  if (teams.length === 0) {
    return (
      <p className="text-text-dim">
        You don&apos;t have any eligible teams to apply with — either you&apos;re not a team lead,
        or all your teams have already applied to this project.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <Label htmlFor="team">Apply with</Label>
        <select
          id="team"
          required
          value={teamId}
          onChange={(e) => {
            setTeamId(e.target.value);
          }}
          className="border-ink-3 bg-ink-3/40 text-text mt-2 h-12 w-full rounded-sm border px-4"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="pitch">Pitch (1-3 sentences)</Label>
        <p className="text-text-dim mt-1 text-xs">
          Why your team is a fit. The pitch is shown to the company alongside your AI-computed match
          score.
        </p>
        <textarea
          id="pitch"
          required
          rows={5}
          minLength={20}
          maxLength={800}
          className="border-ink-3 bg-ink-3/40 text-text mt-2 w-full rounded-sm border px-4 py-3"
          value={pitch}
          onChange={(e) => {
            setPitch(e.target.value);
          }}
        />
      </div>

      {phase !== "form" && (
        <div className="border-cyan/30 bg-cyan/5 rounded-md border p-6">
          <p className="text-cyan font-mono text-xs tracking-widest uppercase">
            {phase === "submitting"
              ? "Computing concept overlap…"
              : "Asking Gemini for match rationale…"}
          </p>
          <div className="bg-ink-3 mt-4 h-3 w-3/4 animate-pulse rounded" />
        </div>
      )}

      {error && <p className="text-rose text-sm">{error}</p>}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}

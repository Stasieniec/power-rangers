"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitReport } from "@/lib/actions/reports";

const TEMPLATE = `## What we did this week

-
-

## What we found

-
-

## Blockers / risks

-

## Next week's focus

-
`;

export function ReportForm({ projectId }: { projectId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [weekOf, setWeekOf] = useState(today);
  const [content, setContent] = useState(TEMPLATE);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitReport({
        projectId,
        weekOf,
        reportMarkdown: content,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        router.push(`/projects/${projectId}/dashboard`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="max-w-xs">
        <Label htmlFor="week">Week of</Label>
        <Input
          id="week"
          type="date"
          required
          className="mt-2 font-mono"
          value={weekOf}
          onChange={(e) => {
            setWeekOf(e.target.value);
          }}
        />
      </div>
      <div>
        <Label htmlFor="report">Report (markdown)</Label>
        <p className="text-text-dim mt-1 text-xs">
          Write in your own terms. Polymath will translate findings for the company side.
        </p>
        <textarea
          id="report"
          required
          rows={18}
          minLength={50}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
          }}
          className="border-ink-3 bg-ink-3/40 text-text mt-2 w-full rounded-sm border px-4 py-3 font-mono text-sm"
        />
      </div>

      {pending && (
        <div className="border-cyan/30 bg-cyan/5 rounded-md border p-6">
          <p className="text-cyan font-mono text-xs tracking-widest uppercase">
            Translating findings into business language…
          </p>
          <div className="bg-ink-3 mt-4 h-3 w-2/3 animate-pulse rounded" />
        </div>
      )}

      {error && <p className="text-rose text-sm">{error}</p>}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Submitting…" : "Submit report"}
      </Button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { regenerateQuestions } from "@/lib/actions/projects";

export function RegenerateButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await regenerateQuestions(projectId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={go} disabled={pending}>
        {pending ? "Regenerating…" : "↻ Regenerate"}
      </Button>
      {error && <p className="text-rose mt-2 text-sm">{error}</p>}
    </>
  );
}

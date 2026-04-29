"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { publishProject } from "@/lib/actions/projects";

export function PublishButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function publish() {
    setError(null);
    startTransition(async () => {
      const res = await publishProject(projectId);
      if (!res.ok) setError(res.error);
      else router.push(`/projects/${projectId}`);
    });
  }

  return (
    <>
      <Button size="lg" onClick={publish} disabled={pending}>
        {pending ? "Publishing…" : "Publish project →"}
      </Button>
      {error && <p className="text-rose mt-3 text-sm">{error}</p>}
    </>
  );
}

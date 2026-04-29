"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptTeam } from "@/lib/actions/applications";

export function AcceptButton({
  projectId,
  applicationId,
}: {
  projectId: string;
  applicationId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await acceptTeam({ projectId, applicationId });
      if (!res.ok) {
        setError(res.error);
      } else {
        router.push(`/projects/${projectId}/dashboard`);
      }
    });
  }

  return (
    <>
      <Button onClick={go} disabled={pending}>
        {pending ? "Accepting…" : "Accept this team →"}
      </Button>
      {error && <p className="text-rose mt-2 text-sm">{error}</p>}
    </>
  );
}

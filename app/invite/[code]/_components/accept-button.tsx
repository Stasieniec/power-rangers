"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/lib/actions/invites";

export function AcceptButton({ code }: { code: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await acceptInvite(code);
      if (res.ok === false) {
        setError(res.error);
        return;
      }
      if (res.ok === "needs-onboard") {
        router.push(`/onboard?after=/teams/${res.teamId}`);
        return;
      }
      router.push(`/teams/${res.teamId}`);
    });
  }

  return (
    <>
      <Button size="lg" onClick={go} disabled={pending}>
        {pending ? "Accepting…" : "Accept invite"}
      </Button>
      {error && <p className="text-rose mt-3 text-sm">{error}</p>}
    </>
  );
}

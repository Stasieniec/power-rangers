"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createInvite, revokeInvite } from "@/lib/actions/teams";

interface Invite {
  id: string;
  code: string;
  expiresAt: number;
  invitedEmail: string | null;
}

export function InviteLinkCard({
  teamId,
  invites,
  baseUrl,
}: {
  teamId: string;
  invites: Invite[];
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function newInvite() {
    setError(null);
    startTransition(async () => {
      const res = await createInvite({ teamId });
      if (!res.ok) setError(res.error);
    });
  }

  function revoke(inviteId: string) {
    startTransition(async () => {
      await revokeInvite({ inviteId, teamId });
    });
  }

  return (
    <section className="border-ink-3 bg-ink-2 rounded-md border p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl">Invite links</h2>
        <Button size="sm" onClick={newInvite} disabled={pending}>
          {pending ? "…" : "+ New invite"}
        </Button>
      </div>
      {error && <p className="text-rose mt-3 text-sm">{error}</p>}
      {invites.length === 0 ? (
        <p className="text-text-dim mt-4 text-sm">No active invites. Generate one to share.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {invites.map((inv) => {
            const url = `${baseUrl}/invite/${inv.code}`;
            return (
              <li
                key={inv.id}
                className="border-ink-3 bg-ink flex items-center justify-between gap-3 rounded-sm border p-3"
              >
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => {
                    e.currentTarget.select();
                  }}
                  className="text-text flex-1 bg-transparent font-mono text-xs outline-none"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(url);
                  }}
                >
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    revoke(inv.id);
                  }}
                >
                  Revoke
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

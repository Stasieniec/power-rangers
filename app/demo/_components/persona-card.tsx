"use client";

import { useTransition } from "react";
import { enterDemoAs } from "@/lib/actions/demo";

export function PersonaCard({
  userId,
  eyebrow,
  title,
  subtitle,
  unlock,
  accent = "cyan",
}: {
  userId: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  unlock: string;
  accent?: "cyan" | "gold";
}) {
  const [pending, startTransition] = useTransition();
  const eyebrowClass = accent === "gold" ? "text-gold" : "text-cyan";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await enterDemoAs(userId);
        });
      }}
      className="border-ink-3 bg-ink-2 hover:border-cyan/60 hover:bg-ink-3 group block w-full rounded-md border p-7 text-left transition-colors disabled:opacity-50"
    >
      <p className={`font-mono text-xs tracking-widest uppercase ${eyebrowClass}`}>{eyebrow}</p>
      <h3 className="font-display mt-3 text-2xl">{title}</h3>
      <p className="text-text-dim mt-2 text-sm">{subtitle}</p>
      <p className="text-text-dim mt-5 text-xs">{unlock}</p>
      {pending && (
        <p className="text-cyan mt-4 font-mono text-xs tracking-widest uppercase">Entering demo…</p>
      )}
    </button>
  );
}

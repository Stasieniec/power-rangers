import Link from "next/link";

export function ResearcherCard({
  researcherId,
  displayName,
  headline,
  affiliation,
  role,
}: {
  researcherId: string | null;
  displayName: string;
  headline: string | null;
  affiliation: string | null;
  role: "lead" | "member";
}) {
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  const inner = (
    <article className="border-ink-3 bg-ink-2 flex gap-4 rounded-md border p-5">
      <div className="bg-ink-3 font-display flex h-12 w-12 shrink-0 items-center justify-center rounded-sm text-lg">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-text text-lg">{displayName}</h3>
          {role === "lead" && (
            <span className="text-gold font-mono text-xs tracking-widest uppercase">Lead</span>
          )}
        </div>
        {headline && <p className="text-text-dim mt-1 truncate text-sm">{headline}</p>}
        {affiliation && <p className="text-text-dim mt-1 font-mono text-xs">{affiliation}</p>}
      </div>
    </article>
  );
  if (!researcherId) return inner;
  return (
    <Link href={`/researchers/${researcherId}`} className="block">
      {inner}
    </Link>
  );
}

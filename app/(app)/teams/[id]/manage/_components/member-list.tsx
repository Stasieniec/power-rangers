import Link from "next/link";

interface Member {
  userId: string;
  displayName: string;
  role: "lead" | "member";
  researcherId: string | null;
  headline: string | null;
  affiliation: string | null;
}

export function MemberList({ members }: { members: Member[] }) {
  return (
    <section>
      <h2 className="font-display text-xl">Members</h2>
      <ul className="mt-4 space-y-3">
        {members.map((m) => (
          <li
            key={m.userId}
            className="border-ink-3 bg-ink-2 flex items-baseline justify-between rounded-md border p-4"
          >
            <div>
              <div className="flex items-baseline gap-3">
                {m.researcherId ? (
                  <Link
                    href={`/researchers/${m.researcherId}`}
                    className="font-display hover:text-cyan text-lg"
                  >
                    {m.displayName}
                  </Link>
                ) : (
                  <span className="font-display text-lg">{m.displayName}</span>
                )}
                {m.role === "lead" && (
                  <span className="text-gold font-mono text-xs tracking-widest uppercase">
                    Lead
                  </span>
                )}
              </div>
              {m.headline && <p className="text-text-dim mt-1 text-sm">{m.headline}</p>}
              {m.affiliation && (
                <p className="text-text-dim mt-1 font-mono text-xs">{m.affiliation}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

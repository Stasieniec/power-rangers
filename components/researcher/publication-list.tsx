interface Pub {
  id: string;
  title: string;
  year: number | null;
  venue: string | null;
  citationCount: number;
  doi: string | null;
}

export function PublicationList({ publications }: { publications: Pub[] }) {
  if (publications.length === 0) return <p className="text-text-dim text-sm">No publications.</p>;
  return (
    <ol className="space-y-6">
      {publications.map((p, i) => (
        <li key={p.id} className="border-ink-3 border-l-2 pl-5">
          <div className="flex items-baseline gap-3">
            <span className="text-text-dim font-mono text-xs">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-text-dim font-mono text-xs">{p.year ?? "—"}</span>
            <span className="text-cyan font-mono text-xs">{p.citationCount} cites</span>
          </div>
          <p className="font-display text-text mt-2 text-lg leading-snug">
            {p.doi ? (
              <a
                href={`https://doi.org/${p.doi}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan"
              >
                {p.title}
              </a>
            ) : (
              p.title
            )}
          </p>
          {p.venue && <p className="text-text-dim mt-1 text-sm">{p.venue}</p>}
        </li>
      ))}
    </ol>
  );
}

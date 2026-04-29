export function ExpertiseCloud({ concepts }: { concepts: { concept: string; score: number }[] }) {
  if (concepts.length === 0) return <p className="text-text-dim text-sm">No expertise data yet.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {concepts.map((c) => {
        const intensity = Math.round(c.score * 100);
        return (
          <li
            key={c.concept}
            className="border-ink-3 bg-ink-2 rounded-sm border px-3 py-1.5 text-sm"
            style={{ opacity: 0.5 + c.score * 0.5 }}
          >
            <span className="text-text">{c.concept}</span>
            <span className="text-text-dim ml-2 font-mono text-xs">{intensity}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function ExpertiseTags({ concepts }: { concepts: { concept: string; score: number }[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {concepts.slice(0, 12).map((c) => (
        <li
          key={c.concept}
          className="border-ink-3 bg-ink-2 rounded-sm border px-3 py-1.5 text-sm"
          style={{ opacity: 0.55 + c.score * 0.45 }}
        >
          <span className="text-text">{c.concept}</span>
          <span className="text-text-dim ml-2 font-mono text-xs">{Math.round(c.score * 100)}</span>
        </li>
      ))}
    </ul>
  );
}

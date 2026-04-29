export function ResearchQuestionCard({
  question,
  rationale,
  index,
}: {
  question: string;
  rationale: string;
  index: number;
}) {
  return (
    <article className="border-ink-3 border-l-2 py-4 pl-6">
      <p className="text-cyan font-mono text-xs">Q{String(index + 1).padStart(2, "0")}</p>
      <p className="font-display mt-2 text-2xl leading-snug">
        <span className="font-display text-gold text-3xl">{question.slice(0, 1)}</span>
        {question.slice(1)}
      </p>
      <p className="text-text-dim mt-3">{rationale}</p>
    </article>
  );
}

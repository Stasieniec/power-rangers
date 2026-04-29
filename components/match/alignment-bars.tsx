interface Item {
  question_id: string;
  score: number;
  why: string;
}

export function AlignmentBars({
  items,
  questionMap,
}: {
  items: Item[];
  questionMap: Record<string, { question: string; index: number }>;
}) {
  return (
    <ol className="space-y-3">
      {items.map((it) => {
        const q = questionMap[it.question_id];
        if (!q) return null;
        return (
          <li
            key={it.question_id}
            className="border-ink-3 bg-ink grid grid-cols-[64px_1fr_120px] items-center gap-4 rounded-sm border p-3"
          >
            <span className="text-text-dim font-mono text-xs">
              Q{String(q.index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm">{q.question}</p>
              <p className="text-text-dim mt-1 truncate text-xs">{it.why}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-ink-3 h-1.5 flex-1 rounded-full">
                <div
                  className="bg-cyan h-full rounded-full"
                  style={{ width: `${String(it.score)}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-xs">{it.score}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

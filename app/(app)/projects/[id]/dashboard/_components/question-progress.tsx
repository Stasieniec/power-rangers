interface Q {
  id: string;
  question: string;
  orderIndex: number;
  findingsCount: number;
}

export function QuestionProgress({
  questions,
  totalReports,
}: {
  questions: Q[];
  totalReports: number;
}) {
  return (
    <ol className="space-y-3">
      {questions.map((q) => {
        const pct =
          totalReports === 0
            ? 0
            : Math.min(100, Math.round((q.findingsCount / totalReports) * 100));
        return (
          <li
            key={q.id}
            className="border-ink-3 bg-ink-2 grid grid-cols-[64px_1fr_72px] items-center gap-4 rounded-md border p-4"
          >
            <span className="text-text-dim font-mono text-xs">
              Q{String(q.orderIndex + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="font-display truncate text-base">{q.question}</p>
              <p className="text-text-dim mt-1 font-mono text-xs">
                {String(q.findingsCount)} finding{q.findingsCount === 1 ? "" : "s"} ·{" "}
                {String(totalReports)} reports
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-ink-3 h-1.5 flex-1 rounded-full">
                <div className="bg-cyan h-full rounded-full" style={{ width: `${String(pct)}%` }} />
              </div>
              <span className="w-8 text-right font-mono text-xs">{String(pct)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

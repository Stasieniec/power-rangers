interface CardProps {
  weekOf: string;
  questionLabel: string; // e.g. "Q01"
  questionText: string;
  finding: string;
  businessTranslation: string;
  impactNote: string;
  staggerMs: number;
}

export function TranslationCard({
  weekOf,
  questionLabel,
  questionText,
  finding,
  businessTranslation,
  impactNote,
  staggerMs,
}: CardProps) {
  return (
    <article
      className="animate-fade-up border-ink-3 bg-ink-2 rounded-md border p-6"
      style={{ animationDelay: `${String(staggerMs)}ms` }}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">
          {questionLabel} · {weekOf}
        </p>
        <p className="text-gold font-mono text-xs">{impactNote}</p>
      </div>
      <p className="text-text-dim mt-3 text-sm">{questionText}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <p className="text-text-dim font-mono text-[10px] tracking-widest uppercase">
            Technical finding
          </p>
          <p className="text-text mt-2 font-mono text-sm leading-relaxed">{finding}</p>
        </div>
        <div className="border-ink-3 border-l pl-5 md:border-l">
          <p className="text-cyan font-mono text-[10px] tracking-widest uppercase">
            Business translation
          </p>
          <p className="font-display text-text mt-2 text-base leading-relaxed">
            {businessTranslation}
          </p>
        </div>
      </div>
    </article>
  );
}

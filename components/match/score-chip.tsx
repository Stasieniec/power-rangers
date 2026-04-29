import { cn } from "@/lib/utils";

export function ScoreChip({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const segments = 4;
  const filled = Math.round((score / 100) * segments);
  const colorClass =
    score >= 80 ? "text-cyan" : score >= 60 ? "text-text" : score >= 40 ? "text-gold" : "text-rose";
  const sizeClass = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  }[size];
  return (
    <div className="flex items-center gap-3">
      <span className={cn("font-mono leading-none", sizeClass, colorClass)}>{score}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={cn("h-4 w-1.5 rounded-sm", i < filled ? "bg-cyan" : "bg-ink-3")}
          />
        ))}
      </div>
    </div>
  );
}

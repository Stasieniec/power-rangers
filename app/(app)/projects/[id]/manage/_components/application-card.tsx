import Link from "next/link";
import { ScoreChip } from "@/components/match/score-chip";
import { AlignmentBars } from "@/components/match/alignment-bars";
import { AcceptButton } from "./accept-button";

interface Application {
  id: string;
  teamId: string;
  teamName: string;
  status: "pending" | "accepted" | "rejected";
  matchScore: number;
  rationale: string;
  perQuestion: string;
  pitch: string;
  createdAt: number;
}

interface Question {
  id: string;
  question: string;
  orderIndex: number;
}

export function ApplicationCard({
  app,
  projectId,
  questions,
  canAccept,
}: {
  app: Application;
  projectId: string;
  questions: Question[];
  canAccept: boolean;
}) {
  const questionMap = Object.fromEntries(
    questions.map((q) => [q.id, { question: q.question, index: q.orderIndex }])
  );
  const items = JSON.parse(app.perQuestion) as {
    question_id: string;
    score: number;
    why: string;
  }[];

  return (
    <article className="border-ink-3 bg-ink-2 rounded-md border p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <Link href={`/teams/${app.teamId}`} className="font-display hover:text-cyan text-2xl">
            {app.teamName}
          </Link>
          <p className="text-text-dim mt-1 font-mono text-xs tracking-widest uppercase">
            {app.status} · applied {new Date(app.createdAt).toLocaleDateString()}
          </p>
        </div>
        <ScoreChip score={app.matchScore} size="md" />
      </div>

      <p className="font-display text-text mt-6 text-lg leading-relaxed italic">
        &ldquo;{app.rationale}&rdquo;
      </p>

      <details className="mt-6">
        <summary className="text-cyan cursor-pointer font-mono text-xs tracking-widest uppercase">
          Per-question alignment
        </summary>
        <div className="mt-4">
          <AlignmentBars items={items} questionMap={questionMap} />
        </div>
      </details>

      <details className="mt-4">
        <summary className="text-cyan cursor-pointer font-mono text-xs tracking-widest uppercase">
          Team&apos;s pitch
        </summary>
        <p className="text-text mt-3 text-sm">{app.pitch}</p>
      </details>

      {canAccept && app.status === "pending" && (
        <div className="border-ink-3 mt-6 border-t pt-4">
          <AcceptButton projectId={projectId} applicationId={app.id} />
        </div>
      )}
    </article>
  );
}

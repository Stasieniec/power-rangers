"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateQuestion } from "@/lib/actions/projects";

interface Q {
  id: string;
  question: string;
  rationale: string;
  orderIndex: number;
}

export function QuestionsEditor({ projectId, questions }: { projectId: string; questions: Q[] }) {
  return (
    <ol className="space-y-8">
      {questions.map((q, i) => (
        <QuestionRow key={q.id} projectId={projectId} q={q} index={i} />
      ))}
    </ol>
  );
}

function QuestionRow({ projectId, q, index }: { projectId: string; q: Q; index: number }) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(q.question);
  const [rationale, setRationale] = useState(q.rationale);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateQuestion({
        projectId,
        questionId: q.id,
        question,
        rationale,
      });
      if (!res.ok) setError(res.error);
      else setEditing(false);
    });
  }

  return (
    <li className="border-ink-3 border-l-2 pl-6">
      <div className="flex items-baseline justify-between">
        <p className="text-cyan font-mono text-xs">Q{String(index + 1).padStart(2, "0")}</p>
        {!editing ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(true);
            }}
          >
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setQuestion(q.question);
                setRationale(q.rationale);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>
      {!editing ? (
        <>
          <p className="font-display mt-2 text-2xl leading-snug">{q.question}</p>
          <p className="text-text-dim mt-3">{q.rationale}</p>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <textarea
            rows={2}
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
            }}
            className="border-ink-3 bg-ink-3/40 font-display w-full rounded-sm border px-3 py-2 text-xl"
          />
          <textarea
            rows={3}
            value={rationale}
            onChange={(e) => {
              setRationale(e.target.value);
            }}
            className="border-ink-3 bg-ink-3/40 w-full rounded-sm border px-3 py-2 text-sm"
          />
          {error && <p className="text-rose text-sm">{error}</p>}
        </div>
      )}
    </li>
  );
}

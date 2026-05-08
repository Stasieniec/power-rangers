import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";
import { requireDbUser, isDemoSession } from "@/lib/auth/current-user";
import { getAlignmentDashboard } from "@/lib/db/queries/alignment-dashboard";
import { QuestionProgress } from "./_components/question-progress";
import { TranslationCard } from "./_components/translation-card";

export default async function AlignmentDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireDbUser();

  const data = await getAlignmentDashboard(id, user.id);
  if (!data) notFound();
  const inDemo = await isDemoSession();

  const questionMap = Object.fromEntries(
    data.questions.map((q) => [
      q.id,
      {
        question: q.question,
        label: `Q${String(q.orderIndex + 1).padStart(2, "0")}`,
      },
    ])
  );

  return (
    <main className="py-16">
      <Container>
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">Alignment dashboard</p>
        <div className="mt-3 flex items-baseline justify-between gap-6">
          <h1 className="font-display text-4xl">{data.project.title}</h1>
          <p className="text-text-dim font-mono text-xs">with {data.project.teamName ?? "team"}</p>
        </div>
        <p className="text-text-dim mt-2 max-w-prose">{data.project.endGoal}</p>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Per-question progress</h2>
          <p className="text-text-dim mt-2 text-sm">
            Each bar reflects the share of weekly reports that have addressed this question.
          </p>
          <div className="mt-6">
            <QuestionProgress
              questions={data.questions.map((q) => ({
                id: q.id,
                question: q.question,
                orderIndex: q.orderIndex,
                findingsCount: q.findingsCount,
              }))}
              totalReports={data.reports.length}
            />
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Findings feed</h2>
            <p className="text-text-dim font-mono text-xs">
              {data.findings.length} translated finding
              {data.findings.length === 1 ? "" : "s"}
            </p>
          </div>
          {data.findings.length === 0 ? (
            <p className="text-text-dim mt-6">
              No findings yet. The team will submit a weekly report soon.
            </p>
          ) : (
            <div className="mt-8 space-y-4">
              {data.findings.map((f, i) => {
                const q = questionMap[f.researchQuestionId];
                return (
                  <TranslationCard
                    key={`${f.reportId}-${f.researchQuestionId}-${String(i)}`}
                    weekOf={f.weekOf}
                    questionLabel={q?.label ?? "Q??"}
                    questionText={q?.question ?? ""}
                    finding={f.finding}
                    businessTranslation={f.businessTranslation}
                    impactNote={f.impactNote}
                    staggerMs={i * 60}
                  />
                );
              })}
            </div>
          )}
        </section>

        {data.project.status === "in_progress" &&
          data.project.acceptedTeamId &&
          (data.viewer.isAcceptedTeamMember ? (
            <section className="border-ink-3 mt-16 border-t pt-8">
              <p className="text-text-dim text-sm">Submit this week&apos;s report.</p>
              <Button asChild className="mt-4">
                <Link href={`/projects/${id}/report`}>+ New weekly report</Link>
              </Button>
            </section>
          ) : (
            inDemo && (
              <section className="border-cyan/30 bg-cyan/5 mt-16 rounded-md border p-6">
                <p className="text-cyan font-mono text-xs tracking-widest uppercase">
                  Want to try report submission?
                </p>
                <p className="text-text-dim mt-2 text-sm">
                  Reports come from the accepted team — switch to{" "}
                  <Link href="/demo" className="text-cyan underline-offset-4 hover:underline">
                    Eran Halperin
                  </Link>{" "}
                  on the demo door, then come back here to watch your translated findings appear.
                </p>
              </section>
            )
          ))}
      </Container>
    </main>
  );
}

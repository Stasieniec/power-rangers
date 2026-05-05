import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/shell/container";
import { requireDbUser } from "@/lib/auth/current-user";
import { getProjectForEdit } from "@/lib/db/queries/project-edit";
import { QuestionsEditor } from "./_components/questions-editor";
import { RegenerateButton } from "./_components/regenerate-button";
import { PublishButton } from "./_components/publish-button";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireDbUser();

  const data = await getProjectForEdit(id, user.id);
  if (!data) notFound();

  if (data.project.status !== "draft") redirect(`/projects/${id}`);

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">
          New project · Step 2 of 2
        </p>
        <h1 className="font-display mt-3 text-4xl">Review research questions.</h1>
        <p className="text-text-dim mt-3">
          Edit anything that doesn&apos;t sound right. Regenerate the whole set if you want to start
          over.
        </p>

        <div className="border-ink-3 bg-ink-2 mt-8 flex items-center justify-between rounded-md border p-4">
          <div>
            <p className="font-display text-lg">{data.project.title}</p>
            <p className="text-text-dim font-mono text-xs">
              {data.questions.length} questions · draft
            </p>
          </div>
          <RegenerateButton projectId={data.project.id} />
        </div>

        <div className="mt-12">
          {data.questions.length === 0 ? (
            <p className="text-text-dim">No questions yet. Click Regenerate to try again.</p>
          ) : (
            <QuestionsEditor projectId={data.project.id} questions={data.questions} />
          )}
        </div>

        <div className="border-ink-3 mt-16 border-t pt-8">
          <p className="text-text-dim text-sm">
            Once published, research teams can apply. Questions are frozen on publish.
          </p>
          <div className="mt-6">
            <PublishButton projectId={data.project.id} />
          </div>
        </div>
      </Container>
    </main>
  );
}

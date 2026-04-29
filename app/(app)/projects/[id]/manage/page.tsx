import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { syncUser } from "@/lib/auth/sync-user";
import { getApplicationsForProject } from "@/lib/db/queries/applications-list";
import { ApplicationCard } from "./_components/application-card";

export default async function ManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");
  const user = await syncUser(clerkUser);

  const data = await getApplicationsForProject(id, user.id);
  if (!data) notFound();

  return (
    <main className="py-16">
      <Container>
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">
          {data.applications.length} application
          {data.applications.length === 1 ? "" : "s"}
        </p>
        <h1 className="font-display mt-3 text-4xl">{data.project.title}</h1>
        <p className="text-text-dim mt-2 font-mono text-sm">status: {data.project.status}</p>

        <div className="mt-12 space-y-6">
          {data.applications.length === 0 ? (
            <p className="text-text-dim">
              No applications yet. Share the project link to get teams applying.
            </p>
          ) : (
            data.applications.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                projectId={data.project.id}
                questions={data.questions.map((q) => ({
                  id: q.id,
                  question: q.question,
                  orderIndex: q.orderIndex,
                }))}
                canAccept={data.project.status === "open"}
              />
            ))
          )}
        </div>
      </Container>
    </main>
  );
}

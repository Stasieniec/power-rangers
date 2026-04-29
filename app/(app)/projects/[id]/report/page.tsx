import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { Container } from "@/components/shell/container";
import { syncUser } from "@/lib/auth/sync-user";
import { getDb } from "@/lib/db/client";
import { projects, teamMembers } from "@/lib/db/schema";
import { ReportForm } from "./_components/report-form";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");
  const user = await syncUser(clerkUser);

  const db = getDb();
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();
  if (project.status !== "in_progress" || !project.acceptedTeamId) redirect(`/projects/${id}`);

  const member = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, project.acceptedTeamId), eq(teamMembers.userId, user.id)),
  });
  if (!member) redirect(`/projects/${id}`);

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">Weekly report</p>
        <h1 className="font-display mt-3 text-4xl">{project.title}</h1>
        <div className="mt-12">
          <ReportForm projectId={id} />
        </div>
      </Container>
    </main>
  );
}

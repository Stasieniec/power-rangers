import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { syncUser } from "@/lib/auth/sync-user";
import { getProjectDetail } from "@/lib/db/queries/projects";
import { getEligibleTeamsForProject } from "@/lib/db/queries/eligible-teams";
import { ApplyForm } from "./_components/apply-form";

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");
  const user = await syncUser(clerkUser);
  if (user.role !== "researcher") redirect("/dashboard");

  const project = await getProjectDetail(id);
  if (!project) notFound();
  if (project.status !== "open") redirect(`/projects/${id}`);

  const teams = await getEligibleTeamsForProject(user.id, id);

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">Apply</p>
        <h1 className="font-display mt-3 text-4xl">{project.title}</h1>
        <p className="text-text-dim mt-3">
          {project.companyName} · {project.questions.length} research questions
        </p>

        <div className="mt-12">
          <ApplyForm projectId={project.id} teams={teams} />
        </div>
      </Container>
    </main>
  );
}

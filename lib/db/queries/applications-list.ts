import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { applications, teams, projects, companies, researchQuestions } from "@/lib/db/schema";

export async function getApplicationsForProject(projectId: string, userId: string) {
  const db = getDb();
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      acceptedTeamId: projects.acceptedTeamId,
      ownerUserId: companies.ownerUserId,
    })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (project?.ownerUserId !== userId) return null;

  const apps = await db
    .select({
      id: applications.id,
      teamId: applications.teamId,
      teamName: teams.name,
      status: applications.status,
      matchScore: applications.matchScore,
      rationale: applications.matchRationale,
      perQuestion: applications.perQuestionAlignment,
      pitch: applications.pitch,
      createdAt: applications.createdAt,
    })
    .from(applications)
    .innerJoin(teams, eq(teams.id, applications.teamId))
    .where(eq(applications.projectId, projectId))
    .orderBy(desc(applications.matchScore));

  const questions = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, projectId))
    .orderBy(researchQuestions.orderIndex);

  return { project, applications: apps, questions };
}

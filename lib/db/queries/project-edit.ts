import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { projects, researchQuestions, companies } from "@/lib/db/schema";

export async function getProjectForEdit(projectId: string, userId: string) {
  const db = getDb();
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      businessPlan: projects.businessPlan,
      endGoal: projects.endGoal,
      status: projects.status,
      companyName: companies.name,
      ownerUserId: companies.ownerUserId,
    })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (project?.ownerUserId !== userId) return null;

  const questions = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, projectId))
    .orderBy(researchQuestions.orderIndex);

  return { project, questions };
}

import { desc, eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { projects, researchQuestions, companies, applications } from "@/lib/db/schema";

export type ProjectListItem = Awaited<ReturnType<typeof listOpenProjects>>[number];

export async function listOpenProjects() {
  const db = getDb();
  return db
    .select({
      id: projects.id,
      title: projects.title,
      endGoal: projects.endGoal,
      status: projects.status,
      createdAt: projects.createdAt,
      companyName: companies.name,
      companyId: companies.id,
    })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.status, "open"))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectDetail(id: string) {
  const db = getDb();
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      businessPlan: projects.businessPlan,
      endGoal: projects.endGoal,
      status: projects.status,
      acceptedTeamId: projects.acceptedTeamId,
      createdAt: projects.createdAt,
      companyName: companies.name,
      companyId: companies.id,
      companyDescription: companies.description,
      companyWebsite: companies.website,
    })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, id))
    .limit(1);
  if (!project) return null;

  const questions = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, id))
    .orderBy(researchQuestions.orderIndex);

  const appCount = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.projectId, id), eq(applications.status, "pending")));

  return { ...project, questions, applicantCount: appCount.length };
}

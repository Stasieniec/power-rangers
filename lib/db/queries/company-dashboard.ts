import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { projects, applications, companies } from "@/lib/db/schema";

export async function getCompanyDashboard(userId: string) {
  const db = getDb();
  const company = await db.query.companies.findFirst({
    where: eq(companies.ownerUserId, userId),
  });
  if (!company) return { company: null, projects: [] };

  const myProjects = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.companyId, company.id))
    .orderBy(desc(projects.createdAt));

  // attach pending application counts
  const counts: Record<string, number> = {};
  for (const p of myProjects) {
    const apps = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.projectId, p.id));
    counts[p.id] = apps.length;
  }
  return {
    company,
    projects: myProjects.map((p) => ({ ...p, applicantCount: counts[p.id] ?? 0 })),
  };
}

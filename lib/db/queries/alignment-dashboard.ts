import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  projects,
  researchQuestions,
  reports,
  reportFindings,
  teams,
  companies,
} from "@/lib/db/schema";

export async function getAlignmentDashboard(projectId: string, userId: string) {
  const db = getDb();
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      endGoal: projects.endGoal,
      status: projects.status,
      acceptedTeamId: projects.acceptedTeamId,
      ownerUserId: companies.ownerUserId,
      teamName: teams.name,
    })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .leftJoin(teams, eq(teams.id, projects.acceptedTeamId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return null;
  if (project.ownerUserId !== userId) return null;

  const questions = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, projectId))
    .orderBy(researchQuestions.orderIndex);

  const allReports = await db
    .select()
    .from(reports)
    .where(eq(reports.projectId, projectId))
    .orderBy(desc(reports.createdAt));

  const allFindings = await db
    .select()
    .from(reportFindings)
    .innerJoin(reports, eq(reports.id, reportFindings.reportId))
    .where(eq(reports.projectId, projectId))
    .orderBy(desc(reports.createdAt));

  const findingsByQuestion: Record<string, number> = {};
  for (const row of allFindings) {
    const id = row.report_findings.researchQuestionId;
    findingsByQuestion[id] = (findingsByQuestion[id] ?? 0) + 1;
  }

  return {
    project,
    questions: questions.map((q) => ({
      ...q,
      findingsCount: findingsByQuestion[q.id] ?? 0,
    })),
    reports: allReports,
    findings: allFindings.map((r) => ({
      reportId: r.report_findings.reportId,
      researchQuestionId: r.report_findings.researchQuestionId,
      finding: r.report_findings.finding,
      businessTranslation: r.report_findings.businessTranslation,
      impactNote: r.report_findings.impactNote,
      weekOf: r.reports.weekOf,
      createdAt: r.report_findings.createdAt,
    })),
  };
}

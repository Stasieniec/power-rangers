"use server";

import { v7 as uuidv7 } from "uuid";
import { eq, and, desc } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { syncUser } from "@/lib/auth/sync-user";
import { reports, reportFindings, projects, researchQuestions, teamMembers } from "@/lib/db/schema";
import { translateReport } from "@/lib/ai/prompts/translate-report";

export async function submitReport(input: {
  projectId: string;
  weekOf: string; // YYYY-MM-DD
  reportMarkdown: string;
}): Promise<{ ok: true; reportId: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  if (!clerkUser) return { ok: false, error: "not signed in" };
  const user = await syncUser(clerkUser);

  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (!project) return { ok: false, error: "project not found" };
  if (project.status !== "in_progress") return { ok: false, error: "project must be in progress" };
  if (!project.acceptedTeamId) return { ok: false, error: "no accepted team" };

  // verify the user is on the accepted team
  const member = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, project.acceptedTeamId), eq(teamMembers.userId, user.id)),
  });
  if (!member) return { ok: false, error: "not on the accepted team" };

  const reportId = uuidv7();
  await db.insert(reports).values({
    id: reportId,
    projectId: input.projectId,
    teamId: project.acceptedTeamId,
    weekOf: input.weekOf,
    rawMarkdown: input.reportMarkdown,
    submittedByUserId: user.id,
  });

  // Build prior summary from latest 3 prior reports' translations
  const priorFindings = await db
    .select()
    .from(reportFindings)
    .innerJoin(reports, eq(reports.id, reportFindings.reportId))
    .where(eq(reports.projectId, input.projectId))
    .orderBy(desc(reports.createdAt))
    .limit(15);
  const priorSummary =
    priorFindings.length === 0
      ? null
      : priorFindings
          .map((r) => `(${r.reports.weekOf}) ${r.report_findings.businessTranslation}`)
          .join("\n");

  const qs = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, input.projectId))
    .orderBy(researchQuestions.orderIndex);

  // Run AI-4. On failure, save report without findings.
  try {
    const aiOut = await translateReport({
      endGoal: project.endGoal,
      questions: qs.map((q) => ({ id: q.id, question: q.question })),
      priorFindingsSummary: priorSummary,
      reportMarkdown: input.reportMarkdown,
    });
    if (aiOut.findings.length > 0) {
      await db.insert(reportFindings).values(
        aiOut.findings
          .filter((f) => qs.some((q) => q.id === f.research_question_id))
          .map((f) => ({
            id: uuidv7(),
            reportId,
            researchQuestionId: f.research_question_id,
            finding: f.finding,
            businessTranslation: f.business_translation,
            impactNote: f.impact_note,
          }))
      );
    }
  } catch (e) {
    console.error("translateReport failed", e);
  }

  revalidatePath(`/projects/${input.projectId}/dashboard`);
  return { ok: true, reportId };
}

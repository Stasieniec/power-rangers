"use server";

import { v7 as uuidv7 } from "uuid";
import { eq, and, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getCurrentDbUser } from "@/lib/auth/current-user";
import {
  applications,
  projects,
  researchQuestions,
  teamMembers,
  researchers,
  researcherConcepts,
  publications,
  companies,
  users,
} from "@/lib/db/schema";
import { scoreMatch } from "@/lib/match/score";
import { scoreMatchRationale } from "@/lib/ai/prompts/score-match";

export async function applyToProject(input: {
  projectId: string;
  teamId: string;
  pitch: string;
}): Promise<
  { ok: true; applicationId: string; matchScore: number } | { ok: false; error: string }
> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not signed in" };

  const db = getDb();

  // Validate the user is the lead of the team
  const lead = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, input.teamId),
      eq(teamMembers.userId, user.id),
      eq(teamMembers.role, "lead")
    ),
  });
  if (!lead) return { ok: false, error: "only the team lead can apply" };

  // Validate project is open
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (!project) return { ok: false, error: "project not found" };
  if (project.status !== "open")
    return { ok: false, error: "project is not accepting applications" };

  // No duplicate apps from same team
  const dup = await db.query.applications.findFirst({
    where: and(eq(applications.projectId, input.projectId), eq(applications.teamId, input.teamId)),
  });
  if (dup) return { ok: false, error: "team has already applied" };

  // Load research questions with their concepts
  const qs = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, input.projectId));

  // Load team members and their concepts
  const members = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      researcherId: researchers.id,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .leftJoin(researchers, eq(researchers.userId, users.id))
    .where(eq(teamMembers.teamId, input.teamId));

  const researcherIds = members.map((m) => m.researcherId).filter((x): x is string => Boolean(x));

  const concepts =
    researcherIds.length === 0
      ? []
      : await db
          .select()
          .from(researcherConcepts)
          .where(inArray(researcherConcepts.researcherId, researcherIds));

  // Aggregate team concepts
  const teamConcepts = aggregateConcepts(concepts);

  // Compute base score
  const questionInputs = qs.map((q) => ({
    id: q.id,
    concepts: JSON.parse(q.concepts) as { label: string; weight: number }[],
  }));
  const matchResult = scoreMatch({
    questions: questionInputs,
    teamConcepts,
  });

  // Pull top 3 publications per member for the AI prompt
  const memberContexts: {
    name: string;
    topPublications: { title: string; abstract: string | null; year: number | null }[];
  }[] = [];
  for (const m of members) {
    if (!m.researcherId) {
      memberContexts.push({ name: m.displayName, topPublications: [] });
      continue;
    }
    const pubs = await db
      .select()
      .from(publications)
      .where(eq(publications.researcherId, m.researcherId))
      .orderBy(desc(publications.citationCount))
      .limit(3);
    memberContexts.push({
      name: m.displayName,
      topPublications: pubs.map((p) => ({
        title: p.title,
        abstract: p.abstract,
        year: p.year,
      })),
    });
  }

  // AI rationale + adjustment
  let aiResult;
  try {
    aiResult = await scoreMatchRationale({
      baseScore: matchResult.baseScore,
      pitch: input.pitch,
      questions: qs.map((q) => ({
        id: q.id,
        question: q.question,
        concepts: JSON.parse(q.concepts) as { label: string; weight: number }[],
      })),
      teamConcepts,
      members: memberContexts,
    });
  } catch (e) {
    console.error("AI-3 failed", e);
    aiResult = {
      rationale: "Match rationale could not be generated. Score is based on concept overlap only.",
      adjustment: 0,
      per_question_alignment: matchResult.perQuestion.map((p) => ({
        question_id: p.questionId,
        score: p.score,
        why: "Concept-overlap fallback.",
      })),
    };
  }

  const finalScore = Math.max(0, Math.min(100, matchResult.baseScore + aiResult.adjustment));

  const applicationId = uuidv7();
  await db.insert(applications).values({
    id: applicationId,
    projectId: input.projectId,
    teamId: input.teamId,
    status: "pending",
    matchScore: finalScore,
    matchRationale: aiResult.rationale,
    perQuestionAlignment: JSON.stringify(aiResult.per_question_alignment),
    pitch: input.pitch.trim(),
  });

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/manage`);
  revalidatePath(`/dashboard`);
  return { ok: true, applicationId, matchScore: finalScore };
}

export async function acceptTeam(input: {
  projectId: string;
  applicationId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not signed in" };

  const db = getDb();
  const [project] = await db
    .select({ id: projects.id, ownerUserId: companies.ownerUserId, status: projects.status })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (project?.ownerUserId !== user.id) return { ok: false, error: "project not found" };
  if (project.status !== "open")
    return { ok: false, error: "project is not accepting applications" };

  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, input.applicationId))
    .limit(1);
  if (app?.projectId !== input.projectId) return { ok: false, error: "application not found" };

  await db
    .update(projects)
    .set({
      acceptedTeamId: app.teamId,
      status: "in_progress",
      updatedAt: Date.now(),
    })
    .where(eq(projects.id, input.projectId));
  await db
    .update(applications)
    .set({ status: "accepted" })
    .where(eq(applications.id, input.applicationId));
  // Reject all others on this project
  await db
    .update(applications)
    .set({ status: "rejected" })
    .where(and(eq(applications.projectId, input.projectId), eq(applications.status, "pending")));

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/manage`);
  revalidatePath(`/projects/${input.projectId}/dashboard`);
  return { ok: true };
}

function aggregateConcepts(
  rows: { concept: string; score: number }[]
): { label: string; weight: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const key = r.concept;
    m.set(key, (m.get(key) ?? 0) + r.score);
  }
  if (m.size === 0) return [];
  const max = Math.max(...m.values());
  return [...m.entries()]
    .map(([label, total]) => ({ label, weight: total / max }))
    .sort((a, b) => b.weight - a.weight);
}

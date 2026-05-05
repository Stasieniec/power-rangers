"use server";

import { v7 as uuidv7 } from "uuid";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getCurrentDbUser } from "@/lib/auth/current-user";
import { projects, researchQuestions, companies } from "@/lib/db/schema";
import { generateQuestions } from "@/lib/ai/prompts/generate-questions";

async function ensureCompany(userId: string) {
  const db = getDb();
  const existing = await db.query.companies.findFirst({
    where: eq(companies.ownerUserId, userId),
  });
  if (existing) return existing;
  const id = uuidv7();
  await db.insert(companies).values({
    id,
    ownerUserId: userId,
    name: "Untitled Company",
  });
  return { id, ownerUserId: userId, name: "Untitled Company" };
}

export async function createDraftProject(input: {
  title: string;
  businessPlan: string;
  endGoal: string;
}): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not signed in" };
  if (user.role !== "company") return { ok: false, error: "only companies can post projects" };

  const company = await ensureCompany(user.id);
  const projectId = uuidv7();
  const db = getDb();

  await db.insert(projects).values({
    id: projectId,
    companyId: company.id,
    title: input.title.trim(),
    businessPlan: input.businessPlan.trim(),
    endGoal: input.endGoal.trim(),
    status: "draft",
  });

  // Run AI-1 inline; failure leaves the project with no questions, user can regenerate.
  try {
    const result = await generateQuestions({
      title: input.title.trim(),
      businessPlan: input.businessPlan.trim(),
      endGoal: input.endGoal.trim(),
    });
    await db.insert(researchQuestions).values(
      result.questions.map((q) => ({
        id: uuidv7(),
        projectId,
        question: q.question,
        rationale: q.rationale,
        orderIndex: q.order_index,
        aiGenerated: true,
        concepts: JSON.stringify(q.concepts),
      }))
    );
  } catch (e) {
    // swallow; user will see "regenerate" button on the edit screen
    console.error("generateQuestions failed", e);
  }

  return { ok: true, projectId };
}

export async function regenerateQuestions(
  projectId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not signed in" };

  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(and(eq(projects.id, projectId), eq(companies.ownerUserId, user.id)))
    .limit(1);
  if (!project) return { ok: false, error: "project not found" };
  if (project.projects.status !== "draft")
    return { ok: false, error: "can only regenerate on draft projects" };

  const result = await generateQuestions({
    title: project.projects.title,
    businessPlan: project.projects.businessPlan,
    endGoal: project.projects.endGoal,
  });

  await db.delete(researchQuestions).where(eq(researchQuestions.projectId, projectId));
  await db.insert(researchQuestions).values(
    result.questions.map((q) => ({
      id: uuidv7(),
      projectId,
      question: q.question,
      rationale: q.rationale,
      orderIndex: q.order_index,
      aiGenerated: true,
      concepts: JSON.stringify(q.concepts),
    }))
  );

  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

export async function updateQuestion(input: {
  projectId: string;
  questionId: string;
  question: string;
  rationale: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not signed in" };

  const db = getDb();
  const [project] = await db
    .select({ projectId: projects.id, status: projects.status, ownerUserId: companies.ownerUserId })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (project?.ownerUserId !== user.id) return { ok: false, error: "project not found" };
  if (project.status !== "draft")
    return { ok: false, error: "can only edit questions on draft projects" };

  await db
    .update(researchQuestions)
    .set({
      question: input.question.trim(),
      rationale: input.rationale.trim(),
      aiGenerated: false,
    })
    .where(eq(researchQuestions.id, input.questionId));

  revalidatePath(`/projects/${input.projectId}/edit`);
  return { ok: true };
}

export async function publishProject(
  projectId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not signed in" };

  const db = getDb();
  const [project] = await db
    .select({ projectId: projects.id, status: projects.status, ownerUserId: companies.ownerUserId })
    .from(projects)
    .innerJoin(companies, eq(companies.id, projects.companyId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (project?.ownerUserId !== user.id) return { ok: false, error: "project not found" };
  if (project.status !== "draft") return { ok: false, error: "already published" };

  const qs = await db
    .select()
    .from(researchQuestions)
    .where(eq(researchQuestions.projectId, projectId));
  if (qs.length === 0)
    return { ok: false, error: "publish requires at least one research question" };

  await db
    .update(projects)
    .set({ status: "open", updatedAt: Date.now() })
    .where(eq(projects.id, projectId));
  revalidatePath(`/projects`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

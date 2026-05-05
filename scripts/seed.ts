import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { COMPANY } from "./fixtures/companies";
import { RESEARCHER_USERS } from "./fixtures/users";
import { TEAMS } from "./fixtures/teams";
import { PROJECTS } from "./fixtures/projects";
import { REPORTS } from "./fixtures/reports";
import { fetchAuthorByOrcid, fetchAuthorWorks, reconstructAbstract } from "@/lib/openalex/client";
import { summarizeResearcher } from "@/lib/ai/prompts/summarize-researcher";
import { generateQuestions } from "@/lib/ai/prompts/generate-questions";
import { translateReport } from "@/lib/ai/prompts/translate-report";
import { scoreMatchRationale } from "@/lib/ai/prompts/score-match";
import { scoreMatch } from "@/lib/match/score";

export async function runSeed() {
  const db = getDb();
  const { env } = getCloudflareContext();
  const oaOpts = { kv: env.KV, email: env.OPENALEX_EMAIL };
  const log: string[] = [];
  const note = (s: string) => {
    console.log("[seed]", s);
    log.push(s);
  };

  // 1. Wipe (in dependency order)
  note("wipe");
  for (const t of [
    schema.reportFiles,
    schema.reportFindings,
    schema.reports,
    schema.applications,
    schema.researchQuestions,
    schema.projects,
    schema.teamInvites,
    schema.teamMembers,
    schema.teams,
    schema.researcherConcepts,
    schema.publications,
    schema.researchers,
    schema.companies,
    schema.users,
  ]) {
    await db.delete(t);
  }

  // 2. Users (mirror Clerk IDs)
  note("users");
  await db.insert(schema.users).values([
    {
      id: "user_medscan",
      clerkId: COMPANY.ownerClerkId,
      email: COMPANY.ownerEmail,
      role: "company",
      displayName: COMPANY.ownerDisplayName,
    },
    ...RESEARCHER_USERS.map((u) => ({
      id: u.id,
      clerkId: u.clerkId,
      email: u.email,
      role: "researcher" as const,
      displayName: u.displayName,
    })),
  ]);

  // 3. Company
  note("company");
  await db.insert(schema.companies).values({
    id: COMPANY.id,
    ownerUserId: "user_medscan",
    name: COMPANY.name,
    description: COMPANY.description,
    website: COMPANY.website,
  });

  // 4. Researchers — fetch OpenAlex + run AI-2 for each
  for (const u of RESEARCHER_USERS) {
    note(`researcher: ${u.displayName}`);
    const author = await fetchAuthorByOrcid(u.orcid, oaOpts);
    if (!author) {
      note(`  WARN: no OpenAlex author for ${u.orcid}`);
      continue;
    }
    const works = await fetchAuthorWorks(author.id, 20, oaOpts);
    const concepts = author.x_concepts.map((c) => ({
      label: c.display_name,
      weight: c.score,
    }));
    const summary = await summarizeResearcher({
      displayName: author.display_name,
      affiliation: author.last_known_institution?.display_name ?? null,
      concepts,
      topPublications: works.slice(0, 5).map((w) => ({
        title: w.title ?? w.display_name ?? "(untitled)",
        year: w.publication_year,
        abstract: reconstructAbstract(w.abstract_inverted_index),
      })),
    });

    const researcherId = uuidv7();
    await db.insert(schema.researchers).values({
      id: researcherId,
      userId: u.id,
      openalexId: author.id,
      orcid: u.orcid,
      affiliation: author.last_known_institution?.display_name ?? null,
      headline: summary.headline,
      aiSummary: summary.summary,
    });
    if (works.length > 0) {
      await db.insert(schema.publications).values(
        works.map((w) => ({
          id: uuidv7(),
          researcherId,
          openalexWorkId: w.id,
          title: w.title ?? w.display_name ?? "(untitled)",
          year: w.publication_year,
          venue: w.primary_location?.source?.display_name ?? null,
          abstract: reconstructAbstract(w.abstract_inverted_index),
          citationCount: w.cited_by_count,
          doi: w.doi,
        }))
      );
    }
    if (summary.expertise_tags.length > 0) {
      await db.insert(schema.researcherConcepts).values(
        summary.expertise_tags.map((tag) => ({
          id: uuidv7(),
          researcherId,
          concept: tag.label,
          score: tag.weight,
        }))
      );
    }
  }

  // 5. Teams
  note("teams");
  for (const t of TEAMS) {
    await db.insert(schema.teams).values({
      id: t.id,
      name: t.name,
      description: t.description,
      createdByUserId: t.leadUserId,
    });
    await db.insert(schema.teamMembers).values([
      { id: uuidv7(), teamId: t.id, userId: t.leadUserId, role: "lead" },
      ...t.memberUserIds.map((m) => ({
        id: uuidv7(),
        teamId: t.id,
        userId: m,
        role: "member" as const,
      })),
    ]);
  }

  // 6. Projects + AI-1 (questions)
  note("projects + AI-1");
  for (const p of PROJECTS) {
    await db.insert(schema.projects).values({
      id: p.id,
      companyId: COMPANY.id,
      title: p.title,
      businessPlan: p.businessPlan,
      endGoal: p.endGoal,
      status: p.status,
      acceptedTeamId: (p as { acceptedTeamId?: string }).acceptedTeamId ?? null,
    });
    const result = await generateQuestions({
      title: p.title,
      businessPlan: p.businessPlan,
      endGoal: p.endGoal,
    });
    await db.insert(schema.researchQuestions).values(
      result.questions.map((q) => ({
        id: uuidv7(),
        projectId: p.id,
        question: q.question,
        rationale: q.rationale,
        orderIndex: q.order_index,
        aiGenerated: true,
        concepts: JSON.stringify(q.concepts),
      }))
    );
  }

  // 7. Pre-seeded competing applications on P1 (Lattice + Helix → P1)
  note("competing applications + AI-3");
  for (const teamId of ["team_lattice", "team_helix"]) {
    const team = TEAMS.find((t) => t.id === teamId);
    if (!team) continue;
    const memberRows = await db
      .select()
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.teamId, team.id));
    const userIds = memberRows.map((m) => m.userId);
    const teamConcepts: { label: string; weight: number }[] = [];
    for (const uid of userIds) {
      const r = await db.query.researchers.findFirst({
        where: eq(schema.researchers.userId, uid),
      });
      if (!r) continue;
      const cs = await db
        .select()
        .from(schema.researcherConcepts)
        .where(eq(schema.researcherConcepts.researcherId, r.id));
      teamConcepts.push(...cs.map((c) => ({ label: c.concept, weight: c.score })));
    }
    const qs = await db
      .select()
      .from(schema.researchQuestions)
      .where(eq(schema.researchQuestions.projectId, "project_p1"));
    const matchResult = scoreMatch({
      questions: qs.map((q) => ({
        id: q.id,
        concepts: JSON.parse(q.concepts) as { label: string; weight: number }[],
      })),
      teamConcepts,
    });
    const ai = await scoreMatchRationale({
      baseScore: matchResult.baseScore,
      pitch: `${team.name} is excited to compete on this project. Our team's prior work in computational biology and longitudinal modeling makes us a strong fit for the dropout-prediction angle.`,
      questions: qs.map((q) => ({
        id: q.id,
        question: q.question,
        concepts: JSON.parse(q.concepts) as { label: string; weight: number }[],
      })),
      teamConcepts,
      members: [],
    });
    const finalScore = Math.max(0, Math.min(100, matchResult.baseScore + ai.adjustment));
    await db.insert(schema.applications).values({
      id: uuidv7(),
      projectId: "project_p1",
      teamId: team.id,
      status: "pending",
      matchScore: finalScore,
      matchRationale: ai.rationale,
      perQuestionAlignment: JSON.stringify(ai.per_question_alignment),
      pitch: `${team.name} is excited to compete on this project. Our team's prior work in computational biology and longitudinal modeling makes us a strong fit for the dropout-prediction angle.`,
    });
  }

  // 8. Reports + AI-4 on P2
  note("prior reports + AI-4");
  const p2Questions = await db
    .select()
    .from(schema.researchQuestions)
    .where(eq(schema.researchQuestions.projectId, "project_p2"));
  let priorSummary: string | null = null;
  for (const r of REPORTS) {
    await db.insert(schema.reports).values({
      id: r.id,
      projectId: r.projectId,
      teamId: r.teamId,
      weekOf: r.weekOf,
      rawMarkdown: r.rawMarkdown,
      submittedByUserId: r.submittedByUserId,
    });
    const out = await translateReport({
      endGoal: PROJECTS.find((p) => p.id === r.projectId)?.endGoal ?? "",
      questions: p2Questions.map((q) => ({ id: q.id, question: q.question })),
      priorFindingsSummary: priorSummary,
      reportMarkdown: r.rawMarkdown,
    });
    if (out.findings.length > 0) {
      await db.insert(schema.reportFindings).values(
        out.findings
          .filter((f) => p2Questions.some((q) => q.id === f.research_question_id))
          .map((f) => ({
            id: uuidv7(),
            reportId: r.id,
            researchQuestionId: f.research_question_id,
            finding: f.finding,
            businessTranslation: f.business_translation,
            impactNote: f.impact_note,
          }))
      );
      priorSummary =
        (priorSummary ?? "") +
        "\n" +
        out.findings.map((f) => `(${r.weekOf}) ${f.business_translation}`).join("\n");
    }
  }

  note("done");
  return { ok: true, log };
}

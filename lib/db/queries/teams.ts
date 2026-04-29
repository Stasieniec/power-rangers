import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { teams, teamMembers, users, researchers, researcherConcepts } from "@/lib/db/schema";

export async function getTeamDetail(id: string) {
  const db = getDb();
  const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  if (!team) return null;

  const members = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      role: teamMembers.role,
      researcherId: researchers.id,
      headline: researchers.headline,
      affiliation: researchers.affiliation,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .leftJoin(researchers, eq(researchers.userId, users.id))
    .where(eq(teamMembers.teamId, id));

  const researcherIds = members.map((m) => m.researcherId).filter((x): x is string => Boolean(x));

  let concepts: { concept: string; score: number }[] = [];
  if (researcherIds.length > 0) {
    const rows = await db
      .select({ concept: researcherConcepts.concept, score: researcherConcepts.score })
      .from(researcherConcepts)
      .where(inArray(researcherConcepts.researcherId, researcherIds));

    const byConcept = new Map<string, number>();
    for (const r of rows) {
      byConcept.set(r.concept, (byConcept.get(r.concept) ?? 0) + r.score);
    }
    const max = Math.max(1, ...byConcept.values());
    concepts = [...byConcept.entries()]
      .map(([concept, total]) => ({ concept, score: total / max }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }

  return { ...team, members, concepts };
}

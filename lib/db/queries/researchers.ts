import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { researchers, publications, researcherConcepts, users } from "@/lib/db/schema";

export async function getResearcherDetail(id: string) {
  const db = getDb();
  const [r] = await db
    .select({
      id: researchers.id,
      userId: researchers.userId,
      orcid: researchers.orcid,
      affiliation: researchers.affiliation,
      headline: researchers.headline,
      aiSummary: researchers.aiSummary,
      displayName: users.displayName,
    })
    .from(researchers)
    .innerJoin(users, eq(users.id, researchers.userId))
    .where(eq(researchers.id, id))
    .limit(1);
  if (!r) return null;

  const pubs = await db
    .select()
    .from(publications)
    .where(eq(publications.researcherId, id))
    .orderBy(desc(publications.year));

  const concepts = await db
    .select()
    .from(researcherConcepts)
    .where(eq(researcherConcepts.researcherId, id))
    .orderBy(desc(researcherConcepts.score));

  return { ...r, publications: pubs, concepts };
}

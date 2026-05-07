"use server";

import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db/client";
import { getCurrentDbUser } from "@/lib/auth/current-user";
import { researchers, publications, researcherConcepts } from "@/lib/db/schema";
import {
  fetchAuthorByOrcid,
  fetchAuthorByName,
  fetchAuthorWorks,
  reconstructAbstract,
} from "@/lib/openalex/client";
import { summarizeResearcher } from "@/lib/ai/prompts/summarize-researcher";

interface OnboardInput {
  orcid?: string;
  name?: string;
  affiliation?: string;
}

export type OnboardResult = { ok: true; researcherId: string } | { ok: false; error: string };

export async function onboardResearcher(input: OnboardInput): Promise<OnboardResult> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not signed in" };

  const { env } = getCloudflareContext();
  const oaOpts = { kv: env.KV, email: env.OPENALEX_EMAIL };

  // 1. Resolve author
  let author = null;
  try {
    if (input.orcid) {
      author = await fetchAuthorByOrcid(input.orcid, oaOpts);
    }
    if (!author && input.name) {
      author = await fetchAuthorByName(input.name, input.affiliation, oaOpts);
    }
  } catch (e) {
    console.error("[onboard] OpenAlex fetch failed", e);
    return { ok: false, error: `OpenAlex error: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!author) return { ok: false, error: "could not find author on OpenAlex" };

  // 2. Fetch top works
  let works;
  try {
    works = await fetchAuthorWorks(author.id, 20, oaOpts);
  } catch (e) {
    console.error("[onboard] OpenAlex works fetch failed", e);
    return {
      ok: false,
      error: `OpenAlex works error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // 3. AI summary
  const concepts = author.x_concepts.map((c) => ({
    label: c.display_name,
    weight: c.score,
  }));
  const topPublications = works.slice(0, 5).map((w) => ({
    title: w.title ?? w.display_name ?? "(untitled)",
    year: w.publication_year,
    abstract: reconstructAbstract(w.abstract_inverted_index),
  }));
  let summary;
  try {
    summary = await summarizeResearcher({
      displayName: author.display_name,
      affiliation: author.last_known_institution?.display_name ?? input.affiliation ?? null,
      concepts,
      topPublications,
    });
  } catch (e) {
    console.error("[onboard] Gemini summarize failed", e);
    return {
      ok: false,
      error: `AI summarize error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // 4. Write to DB
  try {
    const db = getDb();
    const existing = await db.query.researchers.findFirst({
      where: eq(researchers.userId, user.id),
    });
    const researcherId = existing?.id ?? uuidv7();

    if (!existing) {
      await db.insert(researchers).values({
        id: researcherId,
        userId: user.id,
        openalexId: author.id,
        orcid: author.orcid ?? input.orcid ?? null,
        affiliation: author.last_known_institution?.display_name ?? input.affiliation ?? null,
        headline: summary.headline,
        aiSummary: summary.summary,
      });
    } else {
      await db
        .update(researchers)
        .set({
          openalexId: author.id,
          orcid: author.orcid ?? input.orcid ?? null,
          affiliation: author.last_known_institution?.display_name ?? input.affiliation ?? null,
          headline: summary.headline,
          aiSummary: summary.summary,
        })
        .where(eq(researchers.id, researcherId));
      await db.delete(publications).where(eq(publications.researcherId, researcherId));
      await db.delete(researcherConcepts).where(eq(researcherConcepts.researcherId, researcherId));
    }

    if (works.length > 0) {
      await db.insert(publications).values(
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

    // Persist AI-derived expertise tags as our authoritative concept set.
    if (summary.expertise_tags.length > 0) {
      await db.insert(researcherConcepts).values(
        summary.expertise_tags.map((t) => ({
          id: uuidv7(),
          researcherId,
          concept: t.label,
          score: t.weight,
        }))
      );
    }

    return { ok: true, researcherId };
  } catch (e) {
    console.error("[onboard] DB write failed", e);
    return { ok: false, error: `DB write error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

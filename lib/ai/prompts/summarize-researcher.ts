import { generate } from "@/lib/ai/gemini";
import { researcherSummarySchema } from "@/lib/ai/schemas";
import { isFallbackMode } from "@/lib/ai/demo-mode";
import { FALLBACK_SUMMARIZE } from "@/lib/ai/demo-fallbacks/summarize-researcher";
import type { z } from "zod";

const SYSTEM = `You are an expert science communicator. Given an author's publication concepts and the titles+abstracts of their most-cited recent papers, you produce a concise expertise profile that helps non-experts (business stakeholders) understand what this researcher is good at.

Rules:
- Headline: a single phrase (no period) describing their central expertise. 4-9 words.
- Summary: 2 sentences. First sentence states what they study. Second sentence states what they're known for or where they apply it.
- expertise_tags: 5-10 tags drawn FROM the provided concept list (exact strings), ranked by relevance, each with weight 0..1.
- Do not invent expertise outside the source data.
- Output strict JSON matching the response schema. No prose.`;

export interface SummarizeInput {
  displayName: string;
  affiliation: string | null;
  concepts: { label: string; weight: number }[];
  topPublications: { title: string; year: number | null; abstract: string | null }[];
}

export type SummarizeOutput = z.infer<typeof researcherSummarySchema>;

export async function summarizeResearcher(input: SummarizeInput): Promise<SummarizeOutput> {
  if (await isFallbackMode()) return FALLBACK_SUMMARIZE;
  const prompt = `Researcher: ${input.displayName}${
    input.affiliation ? ` (${input.affiliation})` : ""
  }

Top OpenAlex concepts (label, score):
${input.concepts
  .slice(0, 20)
  .map((c) => `- ${c.label}: ${c.weight.toFixed(2)}`)
  .join("\n")}

Top publications:
${input.topPublications
  .map(
    (p, i) =>
      `[${String(i + 1)}] (${p.year != null ? String(p.year) : "n.d."}) ${p.title}${
        p.abstract ? `\nAbstract: ${p.abstract.slice(0, 600)}` : ""
      }`
  )
  .join("\n\n")}
`;

  return generate(researcherSummarySchema, { system: SYSTEM, prompt });
}

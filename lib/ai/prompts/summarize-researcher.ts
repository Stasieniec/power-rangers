import { generate } from "@/lib/ai/gemini";
import { researcherSummarySchema } from "@/lib/ai/schemas";
import { isFallbackMode } from "@/lib/ai/demo-mode";
import { FALLBACK_SUMMARIZE } from "@/lib/ai/demo-fallbacks/summarize-researcher";
import type { z } from "zod";

const SYSTEM = `You are an expert science communicator. Given an author's publication concepts and the titles+abstracts of their most-cited recent papers, you produce a concise expertise profile that helps non-experts (business stakeholders) understand what this researcher is good at.

OUTPUT a JSON object with EXACTLY these top-level fields:
- "headline": string. A single phrase (no period) describing their central expertise. 4-9 words.
- "summary": string. 2 sentences. First sentence states what they study. Second sentence states what they're known for or where they apply it.
- "expertise_tags": array of objects, each with EXACTLY these two fields:
    - "label": string — the concept name, drawn FROM the provided concept list (exact strings).
    - "weight": number between 0 and 1 — relevance ranking.
  5 to 10 entries, ranked by relevance.

Example expertise_tags entry: {"label": "Machine learning", "weight": 0.9}

Do not invent expertise outside the source data. Do not use field names other than "label" and "weight" inside expertise_tags. Output strict JSON. No prose.`;

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

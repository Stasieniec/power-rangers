import { generate } from "@/lib/ai/gemini";
import { matchRationaleSchema } from "@/lib/ai/schemas";
import { isFallbackMode } from "@/lib/ai/demo-mode";
import { FALLBACK_SCORE_MATCH } from "@/lib/ai/demo-fallbacks/score-match";
import type { z } from "zod";

const SYSTEM = `You are an evaluator for a research-team-to-project matching platform.

You are given:
- A project's research questions, each tagged with concept labels and weights.
- A team's aggregate concept profile, drawn from their members' OpenAlex publications.
- Each member's top 3 publications (titles + brief abstracts).
- The team's pitch.
- A *base score* (0-100) computed from cosine similarity of the concept vectors.

Your job:
1. Write a 2-3 sentence rationale for why this team is or isn't a fit. Cite specific publications or concepts.
2. Score each research question (0-100) based on alignment with the team's expertise, with a one-line justification.
3. Suggest an *adjustment* in the range [-10, 10] that should be applied to the base score, justified by the team's pitch covering gaps the publications don't, OR conversely, a publication-strong team whose pitch reveals misunderstanding.

Be honest. Don't inflate. The base score already reflects publication-concept overlap; your job is to capture the qualitative signal it misses.

Output strict JSON matching the response schema. No prose.`;

export interface ScoreMatchInput {
  baseScore: number;
  pitch: string;
  questions: { id: string; question: string; concepts: { label: string; weight: number }[] }[];
  teamConcepts: { label: string; weight: number }[];
  members: {
    name: string;
    topPublications: { title: string; abstract: string | null; year: number | null }[];
  }[];
}

export type ScoreMatchOutput = z.infer<typeof matchRationaleSchema>;

export async function scoreMatchRationale(input: ScoreMatchInput): Promise<ScoreMatchOutput> {
  if (await isFallbackMode()) return FALLBACK_SCORE_MATCH;
  const prompt = `BASE SCORE (concept-overlap, 0-100): ${String(input.baseScore)}

RESEARCH QUESTIONS:
${input.questions
  .map(
    (q) =>
      `- [${q.id}] ${q.question}\n  concepts: ${q.concepts.map((c) => `${c.label}(${c.weight.toFixed(2)})`).join(", ")}`
  )
  .join("\n")}

TEAM AGGREGATE CONCEPTS (top by weight):
${input.teamConcepts
  .slice(0, 15)
  .map((c) => `- ${c.label}: ${c.weight.toFixed(2)}`)
  .join("\n")}

TEAM MEMBERS:
${input.members
  .map(
    (m) =>
      `${m.name}\n${m.topPublications
        .map(
          (p, i) =>
            `  [${String(i + 1)}] (${p.year !== null ? String(p.year) : "n.d."}) ${p.title}${p.abstract ? `\n      ${p.abstract.slice(0, 240)}` : ""}`
        )
        .join("\n")}`
  )
  .join("\n\n")}

TEAM PITCH:
${input.pitch}

Produce your evaluation now.`;

  return generate(matchRationaleSchema, { system: SYSTEM, prompt });
}

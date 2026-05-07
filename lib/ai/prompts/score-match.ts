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

OUTPUT SHAPE: a JSON OBJECT with EXACTLY these three top-level fields:
- "rationale": string. 2-3 sentences explaining why this team is or isn't a fit. Cite specific publications or concepts. Minimum 20 characters.
- "adjustment": integer in the range [-10, 10]. The base score adjustment justified by qualitative signal — pitch covering gaps publications don't, or pitch revealing misunderstanding.
- "per_question_alignment": array of objects, one per research question. Each object has EXACTLY:
    - "question_id": string. The question ID from the input.
    - "score": integer 0-100. Alignment score for this specific question.
    - "why": string. One-line justification, minimum 5 characters.

Be honest. Don't inflate. The base score already reflects publication-concept overlap; your job is to capture the qualitative signal it misses.

EXAMPLE OUTPUT:
{
  "rationale": "Strong concept alignment on predictive modeling and survival analysis. Their work on EHR-derived features matches Q1 directly. Adjustment up because pitch shows methodological depth beyond the publications.",
  "adjustment": 4,
  "per_question_alignment": [
    {"question_id": "rq_abc123", "score": 88, "why": "Direct overlap with predictive-modeling publications."},
    {"question_id": "rq_def456", "score": 65, "why": "Adjacent: experimental design experience but limited intervention work."}
  ]
}

Output ONLY the JSON object. No prose, no code fences.`;

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

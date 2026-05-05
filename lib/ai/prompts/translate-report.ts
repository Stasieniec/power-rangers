import { generate } from "@/lib/ai/gemini";
import { reportFindingsSchema } from "@/lib/ai/schemas";
import { isFallbackMode } from "@/lib/ai/demo-mode";
import { FALLBACK_TRANSLATE } from "@/lib/ai/demo-fallbacks/translate-report";
import type { z } from "zod";

const SYSTEM = `You translate weekly research progress reports into business-language updates that map to specific research questions.

You receive:
- The project's end-goal (business intent).
- The list of research questions with IDs.
- Optional summary of findings from prior weeks.
- This week's free-form markdown report from the research team.

OUTPUT SHAPE: a JSON OBJECT (not an array) with exactly one top-level key, "findings", whose value is an array of finding objects.

Each finding object has EXACTLY these four fields:
- "research_question_id": string. ID of the question this finding addresses (must match an ID from the provided list).
- "finding": string. The technical result, 1-2 sentences, in the researchers' own terms (drawn from the report).
- "business_translation": string. 1-2 sentences in plain business language explaining what this means for the company's goal. Avoid jargon. No metrics the report doesn't actually contain.
- "impact_note": string. A short phrase about timeline, cost, or risk implications. Examples: "+1 week to timeline", "Suggests pivot on Q3", "On track", "No impact yet — exploratory".

Rules:
- Only emit findings that the report actually supports.
- Skip questions with no progress this week — don't fabricate.
- Maintain the report's level of certainty; don't claim more than it does.

EXAMPLE OUTPUT:
{
  "findings": [
    {
      "research_question_id": "rq_abc123",
      "finding": "Held-out C-index improved from 0.71 to 0.78 after adding 7 claim-derived features.",
      "business_translation": "The model is now substantially more accurate at ranking patients by drop-off risk; cleared the soft target for production.",
      "impact_note": "On track"
    }
  ]
}

Output ONLY the JSON object. No prose, no code fences.`;

export interface TranslateReportInput {
  endGoal: string;
  questions: { id: string; question: string }[];
  priorFindingsSummary: string | null;
  reportMarkdown: string;
}

export type TranslateReportOutput = z.infer<typeof reportFindingsSchema>;

export async function translateReport(input: TranslateReportInput): Promise<TranslateReportOutput> {
  if (await isFallbackMode()) return FALLBACK_TRANSLATE;
  const prompt = `END-GOAL:
${input.endGoal}

RESEARCH QUESTIONS:
${input.questions.map((q) => `- [${q.id}] ${q.question}`).join("\n")}

${
  input.priorFindingsSummary ? `PRIOR FINDINGS SUMMARY:\n${input.priorFindingsSummary}\n\n` : ""
}THIS WEEK'S REPORT:
${input.reportMarkdown}

Translate the report now.`;

  return generate(reportFindingsSchema, { system: SYSTEM, prompt });
}

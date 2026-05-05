import { generate } from "@/lib/ai/gemini";
import { generatedQuestionsSchema } from "@/lib/ai/schemas";
import { isFallbackMode } from "@/lib/ai/demo-mode";
import { FALLBACK_QUESTIONS } from "@/lib/ai/demo-fallbacks/generate-questions";
import type { z } from "zod";

const SYSTEM = `You are a senior research strategist who turns business goals into precise, fundable research questions.

You receive: a company's raw business plan, their stated end-goal, and the project title.
You produce: 4 to 7 well-formed research questions a competent research team could compete to answer.

OUTPUT SHAPE: a JSON OBJECT (not an array) with exactly one top-level key, "questions", whose value is an array of question objects.

Each question object has exactly these fields:
- "question": string. A single, focused, answerable question. No compound questions. Target 12-25 words.
- "rationale": string. 1-2 sentences linking the question to the business goal — business-friendly language a non-researcher can verify.
- "order_index": integer ≥ 0. 0-based; order from foundational to advanced.
- "concepts": array of objects, each with EXACTLY two fields:
    - "label": string — the concept name (e.g. "machine learning", "epidemiology", "predictive modeling").
    - "weight": number between 0 and 1 — centrality of the concept to the question.
  2 to 5 entries.

Quality bar:
- Every question must be researchable: a falsifiable answer, supportable by data or experiments, scoped for a 4-12 week effort.
- Avoid implementation tasks ("build a dashboard") — those are not research questions.
- Avoid vague questions like "How can we improve X?" — be specific about WHAT, FOR WHOM, MEASURED HOW.

EXAMPLE OUTPUT (SHAPE — note the top-level "questions" wrapper):
{
  "questions": [
    {
      "question": "Which customer-behavior signals from the last 30 days predict churn within the next 14 days for SMB SaaS retailers?",
      "rationale": "Establishes the predictive feature set the rest of the project depends on.",
      "order_index": 0,
      "concepts": [{"label": "survival analysis", "weight": 0.7}, {"label": "feature engineering", "weight": 0.6}]
    },
    {
      "question": "Which combinations of EHR-derived comorbidities and discharge-medication regimens most strongly predict 30-day cardiac readmission?",
      "rationale": "Identifies the variables the risk model must include to be clinically defensible.",
      "order_index": 1,
      "concepts": [{"label": "epidemiology", "weight": 0.7}, {"label": "predictive modeling", "weight": 0.7}]
    }
  ]
}

Output ONLY the JSON object. No prose, no code fences.`;

export interface GenerateQuestionsInput {
  title: string;
  businessPlan: string;
  endGoal: string;
}

export type GenerateQuestionsOutput = z.infer<typeof generatedQuestionsSchema>;

export async function generateQuestions(
  input: GenerateQuestionsInput
): Promise<GenerateQuestionsOutput> {
  if (await isFallbackMode()) return FALLBACK_QUESTIONS;
  const prompt = `Project title: ${input.title}

Business plan:
${input.businessPlan}

Stated end-goal:
${input.endGoal}

Produce the research questions now.`;

  return generate(generatedQuestionsSchema, { system: SYSTEM, prompt });
}

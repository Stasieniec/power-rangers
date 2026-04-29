import { generate } from "@/lib/ai/gemini";
import { generatedQuestionsSchema } from "@/lib/ai/schemas";
import type { z } from "zod";

const SYSTEM = `You are a senior research strategist who turns business goals into precise, fundable research questions.

You receive: a company's raw business plan, their stated end-goal, and the project title.
You produce: 4 to 7 well-formed research questions a competent research team could compete to answer.

For each question:
- "question": a single, focused, answerable question. No compound questions. Target 12-25 words.
- "rationale": 1-2 sentences linking the question to the business goal — written in business-friendly language a non-researcher can verify.
- "order_index": 0-based; order them from foundational to advanced.
- "concepts": 2-5 concept tags drawn from a research vocabulary (machine learning, epidemiology, optimization, signal processing, NLP, etc.), each weighted 0..1 by centrality to the question.

Quality bar:
- Every question must be researchable: it has a falsifiable answer, can be supported by data or experiments, and is at the right scope for a 4-12 week effort.
- Avoid implementation tasks ("build a dashboard") — those are not research questions.
- Avoid vague questions like "How can we improve X?" — be specific about WHAT, FOR WHOM, MEASURED HOW.

Output strict JSON matching the response schema. No prose.

EXAMPLE 1
Input business plan: "We're a B2B SaaS for SMB retailers. Customers churn at 8% monthly. We want to predict churn and intervene."
Input end-goal: "A churn-risk score per customer, recomputed weekly, with intervention recommendations."
Output (excerpt):
[
  {
    "question": "Which customer-behavior signals from the last 30 days predict churn within the next 14 days for SMB SaaS retailers?",
    "rationale": "Establishes the predictive feature set the rest of the project depends on.",
    "order_index": 0,
    "concepts": [{"label": "survival analysis", "weight": 0.7}, {"label": "feature engineering", "weight": 0.6}]
  }
]

EXAMPLE 2
Input business plan: "Hospital chain wants to reduce 30-day readmission for cardiac patients."
Input end-goal: "Identify patients at high readmission risk at discharge; deliver to care managers."
Output (excerpt):
[
  {
    "question": "Which combinations of EHR-derived comorbidities and discharge-medication regimens most strongly predict 30-day cardiac readmission?",
    "rationale": "Identifies the variables the risk model must include to be clinically defensible.",
    "order_index": 0,
    "concepts": [{"label": "epidemiology", "weight": 0.7}, {"label": "predictive modeling", "weight": 0.7}]
  }
]
`;

export interface GenerateQuestionsInput {
  title: string;
  businessPlan: string;
  endGoal: string;
}

export type GenerateQuestionsOutput = z.infer<typeof generatedQuestionsSchema>;

export async function generateQuestions(
  input: GenerateQuestionsInput
): Promise<GenerateQuestionsOutput> {
  const prompt = `Project title: ${input.title}

Business plan:
${input.businessPlan}

Stated end-goal:
${input.endGoal}

Produce the research questions now.`;

  return generate(generatedQuestionsSchema, { system: SYSTEM, prompt });
}

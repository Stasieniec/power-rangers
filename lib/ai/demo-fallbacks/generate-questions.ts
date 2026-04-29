import type { GenerateQuestionsOutput } from "@/lib/ai/prompts/generate-questions";

export const FALLBACK_QUESTIONS: GenerateQuestionsOutput = {
  questions: [
    {
      question:
        "Which week-4 baseline biomarkers most strongly predict 8-week trial dropout for late-stage oncology patients?",
      rationale: "Establishes the predictive feature set the early-warning score depends on.",
      order_index: 0,
      concepts: [
        { label: "epidemiology", weight: 0.7 },
        { label: "predictive modeling", weight: 0.7 },
      ],
    },
    {
      question:
        "How do longitudinal vitals between weeks 4 and 12 update individual dropout-risk estimates?",
      rationale:
        "Validates whether continuous monitoring meaningfully sharpens the static baseline score.",
      order_index: 1,
      concepts: [
        { label: "time-series analysis", weight: 0.7 },
        { label: "survival analysis", weight: 0.6 },
      ],
    },
    {
      question:
        "What retention interventions, triggered at given risk thresholds, yield the largest reduction in dropout rate?",
      rationale:
        "Connects prediction to action; produces an evidence-based intervention guideline.",
      order_index: 2,
      concepts: [
        { label: "experimental design", weight: 0.6 },
        { label: "behavioral economics", weight: 0.5 },
      ],
    },
    {
      question:
        "Which feature attributions are most defensible in IRB review without revealing protected health attributes?",
      rationale: "Ensures the score ships with explanations that meet regulatory standards.",
      order_index: 3,
      concepts: [
        { label: "explainable AI", weight: 0.7 },
        { label: "privacy", weight: 0.5 },
      ],
    },
  ],
};

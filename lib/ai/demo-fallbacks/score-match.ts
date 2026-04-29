import type { ScoreMatchOutput } from "@/lib/ai/prompts/score-match";

export const FALLBACK_SCORE_MATCH: ScoreMatchOutput = {
  rationale:
    "Strong concept alignment on predictive modeling and survival analysis. The team's pitch shows clear understanding of the longitudinal-monitoring constraint, which raises confidence beyond raw publication overlap.",
  adjustment: 4,
  per_question_alignment: [
    { question_id: "q1", score: 88, why: "Direct overlap with predictive-modeling publications." },
    { question_id: "q2", score: 75, why: "Time-series methods well-represented in the team." },
    {
      question_id: "q3",
      score: 62,
      why: "Adjacent: experimental design experience but limited intervention work.",
    },
    {
      question_id: "q4",
      score: 70,
      why: "Some explainability work, less direct on privacy constraints.",
    },
  ],
};

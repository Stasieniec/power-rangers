import type { TranslateReportOutput } from "@/lib/ai/prompts/translate-report";

export const FALLBACK_TRANSLATE: TranslateReportOutput = {
  findings: [
    {
      research_question_id: "q1",
      finding:
        "Added 7 claim-derived features to the Cox model. Held-out C-index improved from 0.71 to 0.78.",
      business_translation:
        "The model is now substantially more accurate at ranking patients by drop-off risk; we cleared the soft target for production use.",
      impact_note: "On track",
    },
    {
      research_question_id: "q2",
      finding:
        "Income-bracket performance gap narrowed: 0.74 → 0.79 for upper-income vs lower-income groups.",
      business_translation:
        "The risk model now performs equitably across socioeconomic segments, removing a fairness blocker we flagged last week.",
      impact_note: "Removes prior risk",
    },
  ],
};

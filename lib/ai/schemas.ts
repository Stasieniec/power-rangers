import { z } from "zod";

export const conceptSchema = z.object({
  label: z.string(),
  weight: z.number().min(0).max(1),
});

export const generatedQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(10),
        rationale: z.string().min(10),
        order_index: z.number().int().min(0),
        concepts: z.array(conceptSchema).min(1),
      })
    )
    .min(3)
    .max(8),
});

export const researcherSummarySchema = z.object({
  headline: z.string().min(5),
  summary: z.string().min(20),
  expertise_tags: z.array(conceptSchema).min(1),
});

export const matchRationaleSchema = z.object({
  rationale: z.string().min(20),
  adjustment: z.number().int().min(-10).max(10),
  per_question_alignment: z.array(
    z.object({
      question_id: z.string(),
      score: z.number().int().min(0).max(100),
      why: z.string().min(5),
    })
  ),
});

export const reportFindingsSchema = z.object({
  findings: z.array(
    z.object({
      research_question_id: z.string(),
      finding: z.string().min(5),
      business_translation: z.string().min(5),
      impact_note: z.string().min(2),
    })
  ),
});

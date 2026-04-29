import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/gemini", () => ({
  generate: vi.fn(() =>
    Promise.resolve({
      questions: [
        {
          question: "How can churn signals be predicted from the last 30 days?",
          rationale: "Establishes the predictive feature set.",
          order_index: 0,
          concepts: [{ label: "survival analysis", weight: 0.7 }],
        },
        {
          question: "Which interventions reduce churn given high-risk scores?",
          rationale: "Validates intervention design.",
          order_index: 1,
          concepts: [{ label: "experimental design", weight: 0.6 }],
        },
        {
          question: "How should risk scores be calibrated weekly without model drift?",
          rationale: "Ensures sustainable production deployment.",
          order_index: 2,
          concepts: [{ label: "model calibration", weight: 0.6 }],
        },
      ],
    })
  ),
  GeminiError: class extends Error {},
}));

import { generateQuestions } from "@/lib/ai/prompts/generate-questions";
import { generate } from "@/lib/ai/gemini";

describe("generateQuestions", () => {
  it("returns parsed questions and includes inputs in prompt", async () => {
    const out = await generateQuestions({
      title: "Churn prediction",
      businessPlan: "B2B SaaS, 8% churn",
      endGoal: "Risk score per customer",
    });
    expect(out.questions.length).toBeGreaterThanOrEqual(3);
    const calls = (generate as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const args = (calls[0] as [unknown, { system: string; prompt: string }])[1];
    expect(args.prompt).toContain("Churn prediction");
    expect(args.prompt).toContain("B2B SaaS");
    expect(args.system).toContain("research strategist");
  });
});

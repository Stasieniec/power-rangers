import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/gemini", () => ({
  generate: vi.fn(() =>
    Promise.resolve({
      findings: [
        {
          research_question_id: "q1",
          finding: "Achieved 0.87 AUC on the held-out churn cohort using XGBoost.",
          business_translation:
            "Our model can identify high-risk customers about 87% as accurately as a perfect oracle.",
          impact_note: "On track",
        },
      ],
    })
  ),
  GeminiError: class extends Error {},
}));

import { translateReport } from "@/lib/ai/prompts/translate-report";
import { generate } from "@/lib/ai/gemini";

describe("translateReport", () => {
  it("emits findings keyed by research_question_id", async () => {
    const out = await translateReport({
      endGoal: "Predict churn",
      questions: [{ id: "q1", question: "How predict churn?" }],
      priorFindingsSummary: null,
      reportMarkdown: "## Week 1\nTrained XGBoost, AUC 0.87.",
    });
    expect(out.findings[0]?.research_question_id).toBe("q1");
    const calls0 = (generate as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const args0 = (calls0[0] as [unknown, { prompt: string }])[1];
    expect(args0.prompt).toContain("Week 1");
    expect(args0.prompt).toContain("Predict churn");
  });

  it("includes prior findings summary if provided", async () => {
    await translateReport({
      endGoal: "x",
      questions: [{ id: "q1", question: "x" }],
      priorFindingsSummary: "Last week: identified feature set.",
      reportMarkdown: "Week 2",
    });
    const calls1 = (generate as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const args1 = (calls1[1] as [unknown, { prompt: string }])[1];
    expect(args1.prompt).toContain("PRIOR FINDINGS SUMMARY");
    expect(args1.prompt).toContain("identified feature set");
  });
});

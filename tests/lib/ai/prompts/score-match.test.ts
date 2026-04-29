import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/gemini", () => ({
  generate: vi.fn(() =>
    Promise.resolve({
      rationale:
        "Strong on graph methods and causal inference; pitch shows clear understanding of the time-series constraint.",
      adjustment: 4,
      per_question_alignment: [
        { question_id: "q1", score: 88, why: "Direct match in publications." },
        { question_id: "q2", score: 65, why: "Adjacent but not core." },
      ],
    })
  ),
  GeminiError: class extends Error {},
}));

import { scoreMatchRationale } from "@/lib/ai/prompts/score-match";
import { generate } from "@/lib/ai/gemini";

describe("scoreMatchRationale", () => {
  it("calls generate and returns parsed result", async () => {
    const out = await scoreMatchRationale({
      baseScore: 72,
      pitch: "We are excited to apply.",
      questions: [
        { id: "q1", question: "How predict churn?", concepts: [{ label: "ml", weight: 0.7 }] },
        {
          id: "q2",
          question: "What interventions?",
          concepts: [{ label: "experimental design", weight: 0.6 }],
        },
      ],
      teamConcepts: [{ label: "ml", weight: 0.8 }],
      members: [
        {
          name: "Alice",
          topPublications: [{ title: "Predicting churn", year: 2024, abstract: null }],
        },
      ],
    });
    expect(out.adjustment).toBe(4);
    expect(out.per_question_alignment).toHaveLength(2);
    const calls = (generate as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const args = (calls[0] as [unknown, { system: string; prompt: string }])[1];
    expect(args.prompt).toContain("BASE SCORE");
    expect(args.prompt).toContain("Alice");
  });
});

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/gemini", () => ({
  generate: vi.fn((_schema: unknown, _opts: unknown) =>
    Promise.resolve({
      headline: "Probabilistic models for biology",
      summary: "Studies graphical models. Known for applications to genomics.",
      expertise_tags: [
        { label: "Probabilistic models", weight: 0.9 },
        { label: "Genomics", weight: 0.7 },
      ],
    })
  ),
  GeminiError: class extends Error {},
}));

import { summarizeResearcher } from "@/lib/ai/prompts/summarize-researcher";
import { generate } from "@/lib/ai/gemini";

describe("summarizeResearcher", () => {
  it("calls generate with system + prompt and returns parsed", async () => {
    const out = await summarizeResearcher({
      displayName: "Daphne Koller",
      affiliation: "Insitro",
      concepts: [{ label: "Probabilistic models", weight: 0.9 }],
      topPublications: [
        { title: "Probabilistic graphical models", year: 2009, abstract: "An overview." },
      ],
    });
    expect(out.headline).toContain("Probabilistic");
    expect(generate).toHaveBeenCalledOnce();
    const calls = (generate as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const callArg = (calls[0] as [unknown, { system: string; prompt: string }])[1];
    expect(callArg.system).toContain("expertise profile");
    expect(callArg.prompt).toContain("Daphne Koller");
    expect(callArg.prompt).toContain("Insitro");
  });
});

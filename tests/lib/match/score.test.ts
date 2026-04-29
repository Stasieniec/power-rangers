import { describe, it, expect } from "vitest";
import { conceptVector, cosine, scoreMatch } from "@/lib/match/score";

describe("conceptVector", () => {
  it("aggregates labels with summed weights", () => {
    const v = conceptVector([
      { label: "ml", weight: 0.5 },
      { label: "ml", weight: 0.5 },
      { label: "stats", weight: 0.7 },
    ]);
    expect(v.get("ml")).toBeCloseTo(1.0);
    expect(v.get("stats")).toBeCloseTo(0.7);
  });

  it("lowercases labels for case-insensitive match", () => {
    const v = conceptVector([
      { label: "Machine Learning", weight: 0.6 },
      { label: "machine learning", weight: 0.4 },
    ]);
    expect(v.size).toBe(1);
    expect(v.get("machine learning")).toBeCloseTo(1.0);
  });
});

describe("cosine", () => {
  it("returns 1 for identical vectors", () => {
    const a = new Map([["x", 1]]);
    const b = new Map([["x", 1]]);
    expect(cosine(a, b)).toBeCloseTo(1);
  });
  it("returns 0 for disjoint vectors", () => {
    const a = new Map([["x", 1]]);
    const b = new Map([["y", 1]]);
    expect(cosine(a, b)).toBe(0);
  });
  it("handles partial overlap", () => {
    const a = new Map([
      ["x", 1],
      ["y", 1],
    ]);
    const b = new Map([
      ["x", 1],
      ["z", 1],
    ]);
    expect(cosine(a, b)).toBeCloseTo(0.5);
  });
  it("returns 0 when either vector is empty", () => {
    expect(cosine(new Map(), new Map([["x", 1]]))).toBe(0);
    expect(cosine(new Map([["x", 1]]), new Map())).toBe(0);
  });
});

describe("scoreMatch", () => {
  it("computes 100 for perfectly overlapping concepts", () => {
    const result = scoreMatch({
      questions: [
        {
          id: "q1",
          concepts: [{ label: "ml", weight: 1 }],
        },
      ],
      teamConcepts: [{ label: "ml", weight: 1 }],
    });
    expect(result.baseScore).toBe(100);
    expect(result.perQuestion[0]?.score).toBe(100);
  });

  it("computes 0 for fully disjoint concepts", () => {
    const result = scoreMatch({
      questions: [
        {
          id: "q1",
          concepts: [{ label: "ml", weight: 1 }],
        },
      ],
      teamConcepts: [{ label: "biology", weight: 1 }],
    });
    expect(result.baseScore).toBe(0);
  });

  it("averages across multiple questions", () => {
    const result = scoreMatch({
      questions: [
        { id: "q1", concepts: [{ label: "ml", weight: 1 }] },
        { id: "q2", concepts: [{ label: "biology", weight: 1 }] },
      ],
      teamConcepts: [{ label: "ml", weight: 1 }],
    });
    // q1 → 100, q2 → 0, avg = 50
    expect(result.baseScore).toBe(50);
    expect(result.perQuestion).toHaveLength(2);
  });
});

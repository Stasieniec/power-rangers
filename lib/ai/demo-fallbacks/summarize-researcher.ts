import type { SummarizeOutput } from "@/lib/ai/prompts/summarize-researcher";

export const FALLBACK_SUMMARIZE: SummarizeOutput = {
  headline: "Computational biology and predictive genomics",
  summary:
    "Studies high-dimensional genomic data with probabilistic modeling. Known for early work on graphical models for cell-state prediction.",
  expertise_tags: [
    { label: "Probabilistic models", weight: 0.92 },
    { label: "Genomics", weight: 0.83 },
    { label: "Single-cell analysis", weight: 0.71 },
    { label: "Bayesian inference", weight: 0.68 },
    { label: "Machine learning", weight: 0.6 },
  ],
};

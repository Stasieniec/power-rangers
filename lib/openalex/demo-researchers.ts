/**
 * Quick-fill suggestions for the live /onboard form. Every ORCID here MUST be
 * present in scripts/fixtures/openalex-bundle.json so the onboarding flow can
 * resolve the author without hitting OpenAlex (Cloudflare Worker IPs get
 * rate-limited hard).
 */
export const DEMO_RESEARCHERS = [
  {
    label: "Daphne Koller (Insitro / Broad)",
    orcid: "0000-0002-2361-6479",
    field: "Probabilistic models in biology",
  },
  {
    label: "Andrew Ng (Stanford)",
    orcid: "0000-0001-5547-3196",
    field: "Machine learning",
  },
  {
    label: "Pranav Rajpurkar (Harvard)",
    orcid: "0000-0002-8030-3727",
    field: "Medical AI",
  },
] as const;

export type DemoResearcher = (typeof DEMO_RESEARCHERS)[number];

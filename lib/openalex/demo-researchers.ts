/**
 * A small set of well-known public researchers with stable ORCIDs,
 * used as one-click fallbacks during the live demo if the audience
 * doesn't have an ORCID handy.
 *
 * All ORCIDs verified against https://api.openalex.org/authors?filter=orcid:<orcid>
 */
export const DEMO_RESEARCHERS = [
  {
    label: "Yoshua Bengio (Mila / Université de Montréal)",
    orcid: "0000-0002-9322-3515",
    field: "Deep learning",
  },
  {
    label: "Fei-Fei Li (Stanford)",
    orcid: "0000-0002-7481-0810",
    field: "Computer vision",
  },
  {
    label: "Daphne Koller (Insitro)",
    orcid: "0000-0002-2361-6479",
    field: "Probabilistic models / biology",
  },
] as const;

export type DemoResearcher = (typeof DEMO_RESEARCHERS)[number];

/**
 * A small set of well-known public researchers with stable ORCIDs,
 * used as one-click fallbacks during the live demo if the audience
 * doesn't have an ORCID handy.
 */
export const DEMO_RESEARCHERS = [
  {
    label: "Yann LeCun (NYU / Meta AI)",
    orcid: "0000-0003-1990-7172",
    field: "Deep learning",
  },
  {
    label: "Fei-Fei Li (Stanford)",
    orcid: "0000-0002-7481-0810",
    field: "Computer vision",
  },
  {
    label: "Daphne Koller (Insitro)",
    orcid: "0000-0002-2310-4243",
    field: "Probabilistic models / biology",
  },
] as const;

export type DemoResearcher = (typeof DEMO_RESEARCHERS)[number];

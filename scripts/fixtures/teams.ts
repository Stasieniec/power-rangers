export const TEAMS = [
  {
    id: "team_convex",
    name: "Convex Lab",
    description: "A small applied-ML team focused on health-economics modeling.",
    leadUserId: "user_alice",
    memberUserIds: ["user_bob"],
  },
  {
    id: "team_lattice",
    name: "Lattice Sciences",
    description: "Computational biology research collective.",
    leadUserId: "user_carla",
    memberUserIds: ["user_diego"],
  },
  {
    id: "team_helix",
    name: "Helix Group",
    description: "Causal inference, longitudinal studies.",
    leadUserId: "user_eve",
    memberUserIds: [],
  },
  {
    id: "team_bioflux",
    name: "BioFlux Lab",
    description: "Predictive analytics for clinical operations.",
    leadUserId: "user_frank",
    memberUserIds: [],
  },
] as const;

// All these users are pre-created in Clerk staging and production.
// Run `pnpm seed:users-clerk` (Task 2) to set them up before running the main seed.
export const RESEARCHER_USERS = [
  {
    id: "user_alice",
    clerkId: "REPLACE_alice",
    email: "alice@polymath-demo.app",
    displayName: "Alice Lead",
    onboarded: false, // we onboard her LIVE during demo
    orcid: null,
  },
  {
    id: "user_bob",
    clerkId: "REPLACE_bob",
    email: "bob@polymath-demo.app",
    displayName: "Bob Chen",
    onboarded: true,
    orcid: "0000-0001-5109-3700",
  },
  {
    id: "user_carla",
    clerkId: "REPLACE_carla",
    email: "carla@polymath-demo.app",
    displayName: "Carla Mendez",
    onboarded: true,
    orcid: "0000-0002-1825-0097",
  },
  {
    id: "user_diego",
    clerkId: "REPLACE_diego",
    email: "diego@polymath-demo.app",
    displayName: "Diego Park",
    onboarded: true,
    orcid: "0000-0003-4567-8910",
  },
  {
    id: "user_eve",
    clerkId: "REPLACE_eve",
    email: "eve@polymath-demo.app",
    displayName: "Eve Khalili",
    onboarded: true,
    orcid: "0000-0002-9991-1023",
  },
  {
    id: "user_frank",
    clerkId: "REPLACE_frank",
    email: "frank@polymath-demo.app",
    displayName: "Frank Yamamoto",
    onboarded: true,
    orcid: "0000-0001-7733-6604",
  },
] as const;

export type ResearcherFixture = (typeof RESEARCHER_USERS)[number];

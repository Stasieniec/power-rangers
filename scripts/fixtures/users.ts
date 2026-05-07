// Demo cast for the seeded database.
//
// These users do NOT correspond to real Clerk accounts — they live only in our
// `users` table with synthetic clerk_id values. This means the public-browse
// surface (researcher profiles, team pages, project listings) is rich on demo
// day without requiring anyone to actually sign up. Authenticated flows (manage
// page, dashboard) still require real Clerk auth, but those aren't the Phase 1
// demo path.
//
// Names are real; ORCIDs are verified against OpenAlex. The seed fetches each
// researcher's actual publication history, runs Gemini to synthesize a
// headline + summary + expertise tags, and writes everything to D1.
export const RESEARCHER_USERS = [
  {
    id: "user_alice",
    clerkId: "clerk_synthetic_alice",
    email: "daphne@polymath-demo.app",
    displayName: "Daphne Koller",
    onboarded: true,
    orcid: "0000-0002-2361-6479",
  },
  {
    id: "user_bob",
    clerkId: "clerk_synthetic_bob",
    email: "andrew@polymath-demo.app",
    displayName: "Andrew Ng",
    onboarded: true,
    orcid: "0000-0001-5547-3196",
  },
  {
    id: "user_carla",
    clerkId: "clerk_synthetic_carla",
    email: "nigam@polymath-demo.app",
    displayName: "Nigam H. Shah",
    onboarded: true,
    orcid: "0000-0001-9385-7158",
  },
  {
    id: "user_diego",
    clerkId: "clerk_synthetic_diego",
    email: "atul@polymath-demo.app",
    displayName: "Atul J. Butte",
    onboarded: true,
    orcid: "0000-0002-7433-2740",
  },
  {
    id: "user_eve",
    clerkId: "clerk_synthetic_eve",
    email: "pranav@polymath-demo.app",
    displayName: "Pranav Rajpurkar",
    onboarded: true,
    orcid: "0000-0002-8030-3727",
  },
  {
    id: "user_frank",
    clerkId: "clerk_synthetic_frank",
    email: "eran@polymath-demo.app",
    displayName: "Eran Halperin",
    onboarded: true,
    orcid: "0000-0002-2373-3691",
  },
] as const;

export type ResearcherFixture = (typeof RESEARCHER_USERS)[number];

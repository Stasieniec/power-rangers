import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db/client";
import { syncUser, type AppUser } from "@/lib/auth/sync-user";
import { users } from "@/lib/db/schema";

export const DEMO_COOKIE = "polymath-demo-user";

// Hard-coded list of user IDs that the demo door is allowed to impersonate.
// Anyone with the cookie value set to one of these IDs gets that user's session.
// This is intentionally a backdoor for the live demo — the alternative was real
// Clerk signups, which require email verification, which is brittle on stage.
export const DEMO_USER_IDS = [
  "user_medscan",
  "user_alice",
  "user_bob",
  "user_carla",
  "user_diego",
  "user_eve",
  "user_frank",
  "user_fresh",
] as const;

export type DemoUserId = (typeof DEMO_USER_IDS)[number];

export function isDemoUserId(id: string): id is DemoUserId {
  return (DEMO_USER_IDS as readonly string[]).includes(id);
}

/**
 * Returns the current DB user — either the impersonated demo user (if the
 * `polymath-demo-user` cookie is set to a known demo ID), or the user backed
 * by a real Clerk session (mirrored into D1 via syncUser).
 *
 * Returns null if neither path resolves.
 */
export async function getCurrentDbUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const demoId = cookieStore.get(DEMO_COOKIE)?.value;
  if (demoId && isDemoUserId(demoId)) {
    const db = getDb();
    const u = await db.query.users.findFirst({ where: eq(users.id, demoId) });
    if (u) return u;
  }

  const { userId } = await auth();
  if (!userId) return null;
  const cu = await currentUser();
  if (!cu) return null;
  return syncUser(cu);
}

/**
 * Same as getCurrentDbUser but redirects to /sign-in if no session exists.
 * Use in server components that need a logged-in user.
 */
export async function requireDbUser(): Promise<AppUser> {
  const u = await getCurrentDbUser();
  if (!u) redirect("/sign-in");
  return u;
}

/** True iff the request carries a valid demo-impersonation cookie. */
export async function isDemoSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const demoId = cookieStore.get(DEMO_COOKIE)?.value;
  return !!demoId && isDemoUserId(demoId);
}

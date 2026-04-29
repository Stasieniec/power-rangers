"use server";

import { v7 as uuidv7 } from "uuid";
import { eq, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { syncUser } from "@/lib/auth/sync-user";
import { teamInvites, teamMembers, researchers } from "@/lib/db/schema";

export async function acceptInvite(
  code: string
): Promise<
  | { ok: true; teamId: string }
  | { ok: false; error: string }
  | { ok: "needs-onboard"; teamId: string }
> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  if (!clerkUser) return { ok: false, error: "not signed in" };
  const user = await syncUser(clerkUser);

  const db = getDb();
  const invite = await db.query.teamInvites.findFirst({
    where: eq(teamInvites.code, code),
  });
  if (!invite) return { ok: false, error: "invite not found" };
  if (invite.expiresAt < Date.now()) return { ok: false, error: "invite expired" };
  if (invite.usedByUserId !== null) return { ok: false, error: "invite already used" };

  const existing = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, invite.teamId), eq(teamMembers.userId, user.id)),
  });
  if (existing) return { ok: true, teamId: invite.teamId };

  if (user.role !== "researcher") return { ok: false, error: "only researchers can join teams" };

  await db.insert(teamMembers).values({
    id: uuidv7(),
    teamId: invite.teamId,
    userId: user.id,
    role: "member",
  });
  await db.update(teamInvites).set({ usedByUserId: user.id }).where(eq(teamInvites.id, invite.id));
  revalidatePath(`/teams/${invite.teamId}`);
  revalidatePath(`/teams/${invite.teamId}/manage`);

  // Researcher needs an onboarded profile to be useful on the team.
  const onboarded = await db.query.researchers.findFirst({
    where: eq(researchers.userId, user.id),
  });
  if (!onboarded) return { ok: "needs-onboard", teamId: invite.teamId };

  return { ok: true, teamId: invite.teamId };
}

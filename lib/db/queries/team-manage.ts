import { eq, and, gt, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { teams, teamMembers, teamInvites, users, researchers } from "@/lib/db/schema";

export async function getTeamForManage(teamId: string, userId: string) {
  const db = getDb();
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) return null;

  const myRole = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
  });
  if (!myRole) return null;

  const members = await db
    .select({
      id: teamMembers.id,
      userId: users.id,
      displayName: users.displayName,
      role: teamMembers.role,
      researcherId: researchers.id,
      headline: researchers.headline,
      affiliation: researchers.affiliation,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .leftJoin(researchers, eq(researchers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  const now = Date.now();
  const invites = await db
    .select()
    .from(teamInvites)
    .where(
      and(
        eq(teamInvites.teamId, teamId),
        gt(teamInvites.expiresAt, now),
        isNull(teamInvites.usedByUserId)
      )
    );

  return { team, isLead: myRole.role === "lead", members, invites };
}

import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { teams, teamMembers, applications } from "@/lib/db/schema";

export async function getEligibleTeamsForProject(userId: string, projectId: string) {
  const db = getDb();
  // Teams where user is lead
  const myLeadTeams = await db
    .select({ id: teams.id, name: teams.name })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.role, "lead")));

  if (myLeadTeams.length === 0) return [];

  // Filter out teams that already applied
  const existingApps = await db
    .select({ teamId: applications.teamId })
    .from(applications)
    .where(eq(applications.projectId, projectId));
  const appliedSet = new Set(existingApps.map((a) => a.teamId));

  return myLeadTeams.filter((t) => !appliedSet.has(t.id));
}

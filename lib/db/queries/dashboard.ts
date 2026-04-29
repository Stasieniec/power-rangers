import { eq, inArray, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  researchers,
  teams,
  teamMembers,
  applications,
  projects,
  companies,
} from "@/lib/db/schema";

export async function getResearcherDashboard(userId: string) {
  const db = getDb();
  const [researcher] = await db
    .select()
    .from(researchers)
    .where(eq(researchers.userId, userId))
    .limit(1);

  const myTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, userId));

  const teamIds = myTeams.map((t) => t.id);
  const myApps =
    teamIds.length === 0
      ? []
      : await db
          .select({
            id: applications.id,
            status: applications.status,
            matchScore: applications.matchScore,
            projectId: projects.id,
            projectTitle: projects.title,
            companyName: companies.name,
            teamName: teams.name,
          })
          .from(applications)
          .innerJoin(projects, eq(projects.id, applications.projectId))
          .innerJoin(companies, eq(companies.id, projects.companyId))
          .innerJoin(teams, eq(teams.id, applications.teamId))
          .where(inArray(applications.teamId, teamIds))
          .orderBy(desc(applications.createdAt));

  return { researcher: researcher ?? null, teams: myTeams, applications: myApps };
}

"use server";

import { v7 as uuidv7 } from "uuid";
import { customAlphabet } from "nanoid";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getCurrentDbUser } from "@/lib/auth/current-user";
import { teams, teamMembers, teamInvites } from "@/lib/db/schema";

const codeGen = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 16);

export async function createTeam(input: {
  name: string;
  description?: string;
}): Promise<{ ok: true; teamId: string } | { ok: false; error: string }> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not signed in" };
  if (user.role !== "researcher") return { ok: false, error: "only researchers can create teams" };

  const db = getDb();
  const teamId = uuidv7();
  await db.insert(teams).values({
    id: teamId,
    name: input.name.trim(),
    description: input.description != null ? input.description.trim() : null,
    createdByUserId: user.id,
  });
  await db.insert(teamMembers).values({
    id: uuidv7(),
    teamId,
    userId: user.id,
    role: "lead",
  });

  return { ok: true, teamId };
}

export async function createInvite(input: {
  teamId: string;
  email?: string;
  ttlHours?: number;
}): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not signed in" };

  const db = getDb();
  const lead = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, input.teamId),
      eq(teamMembers.userId, user.id),
      eq(teamMembers.role, "lead")
    ),
  });
  if (!lead) return { ok: false, error: "only the team lead can invite" };

  const code = codeGen();
  const ttlMs = (input.ttlHours ?? 24 * 7) * 60 * 60 * 1000;
  await db.insert(teamInvites).values({
    id: uuidv7(),
    teamId: input.teamId,
    code,
    invitedEmail: input.email ?? null,
    expiresAt: Date.now() + ttlMs,
  });
  revalidatePath(`/teams/${input.teamId}/manage`);
  return { ok: true, code };
}

export async function revokeInvite(input: {
  inviteId: string;
  teamId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not signed in" };

  const db = getDb();
  const lead = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, input.teamId),
      eq(teamMembers.userId, user.id),
      eq(teamMembers.role, "lead")
    ),
  });
  if (!lead) return { ok: false, error: "only the team lead can revoke" };

  await db.delete(teamInvites).where(eq(teamInvites.id, input.inviteId));
  revalidatePath(`/teams/${input.teamId}/manage`);
  return { ok: true };
}

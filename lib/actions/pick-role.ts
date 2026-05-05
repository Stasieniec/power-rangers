"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getCurrentDbUser } from "@/lib/auth/current-user";
import { users } from "@/lib/db/schema";

export type PickRoleResult = { ok: true } | { ok: false; error: string };

export async function pickRole(role: "company" | "researcher"): Promise<PickRoleResult> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "not signed in" };

  const db = getDb();
  await db.update(users).set({ role, updatedAt: Date.now() }).where(eq(users.id, user.id));

  revalidatePath("/dashboard");
  return { ok: true };
}

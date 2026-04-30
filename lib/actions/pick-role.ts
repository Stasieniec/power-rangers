"use server";

import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { syncUser } from "@/lib/auth/sync-user";
import { users } from "@/lib/db/schema";

export type PickRoleResult = { ok: true } | { ok: false; error: string };

export async function pickRole(role: "company" | "researcher"): Promise<PickRoleResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "not signed in" };
  const clerkUser = await currentUser();
  if (!clerkUser) return { ok: false, error: "not signed in" };
  const user = await syncUser(clerkUser);

  const db = getDb();
  await db.update(users).set({ role, updatedAt: Date.now() }).where(eq(users.id, user.id));

  revalidatePath("/dashboard");
  return { ok: true };
}

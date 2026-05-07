"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { DEMO_COOKIE, isDemoUserId } from "@/lib/auth/current-user";

export async function enterDemoAs(userId: string): Promise<void> {
  if (!isDemoUserId(userId)) {
    throw new Error("not a demo user");
  }
  const db = getDb();
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u) throw new Error("demo user not found in DB — did you run pnpm seed?");

  const cookieStore = await cookies();
  cookieStore.set(DEMO_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  redirect("/dashboard");
}

export async function exitDemo(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_COOKIE);
  redirect("/");
}

import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";
import type { User as ClerkUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export type AppUser = typeof users.$inferSelect;

export async function syncUser(clerkUser: ClerkUser): Promise<AppUser> {
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUser.id),
  });
  if (existing) return existing;

  const role =
    (clerkUser.unsafeMetadata.role as "company" | "researcher" | undefined) ?? "researcher";
  const nameParts = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");
  const displayName = nameParts || (clerkUser.username ?? "Anonymous");
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

  const rows = await db
    .insert(users)
    .values({
      id: uuidv7(),
      clerkId: clerkUser.id,
      email,
      role,
      displayName,
    })
    .returning();
  const created = rows[0];
  if (!created) throw new Error("Failed to insert user");
  return created;
}

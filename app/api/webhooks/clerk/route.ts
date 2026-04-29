import { Webhook } from "svix";
import { headers } from "next/headers";
import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(req: Request) {
  const { env } = getCloudflareContext();
  const secret = env.CLERK_WEBHOOK_SECRET;
  if (!secret) return new Response("missing secret", { status: 500 });

  const payload = await req.text();
  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature)
    return new Response("missing svix headers", { status: 400 });

  const wh = new Webhook(secret);
  interface ClerkWebhookEvent {
    type: string;
    data: {
      id: string;
      email_addresses: { email_address: string }[];
      first_name?: string;
      last_name?: string;
      unsafe_metadata?: Record<string, unknown>;
    };
  }
  let evt: ClerkWebhookEvent;
  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response("invalid signature", { status: 401 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const db = getDb();
    const clerkId = evt.data.id;
    const email = evt.data.email_addresses[0]?.email_address ?? "";
    const role =
      (evt.data.unsafe_metadata?.role as "company" | "researcher" | undefined) ?? "researcher";
    const displayName =
      [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || "Anonymous";

    const existing = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (existing) {
      await db
        .update(users)
        .set({ email, displayName, updatedAt: Date.now() })
        .where(eq(users.id, existing.id));
    } else {
      await db.insert(users).values({
        id: uuidv7(),
        clerkId,
        email,
        role,
        displayName,
      });
    }
  }
  return new Response("ok", { status: 200 });
}

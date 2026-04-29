import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { runWarmUp } from "@/scripts/warm-up";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const { env } = getCloudflareContext();
  if (!env.SEED_SECRET || secret !== env.SEED_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await runWarmUp();
  return NextResponse.json(result);
}

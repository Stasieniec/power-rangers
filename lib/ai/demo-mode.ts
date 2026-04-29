import { cookies } from "next/headers";

export async function isFallbackMode(): Promise<boolean> {
  try {
    const c = await cookies();
    return c.get("polymath-demo-fallback")?.value === "1";
  } catch {
    return false;
  }
}

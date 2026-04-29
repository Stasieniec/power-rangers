import { getCloudflareContext } from "@opennextjs/cloudflare";
import { fetchAuthorByOrcid, fetchAuthorWorks } from "@/lib/openalex/client";
import { generateQuestions } from "@/lib/ai/prompts/generate-questions";
import { DEMO_RESEARCHERS } from "@/lib/openalex/demo-researchers";

export async function runWarmUp() {
  const { env } = getCloudflareContext();
  const oaOpts = { kv: env.KV, email: env.OPENALEX_EMAIL };
  const log: string[] = [];

  for (const r of DEMO_RESEARCHERS) {
    const author = await fetchAuthorByOrcid(r.orcid, oaOpts);
    if (author) {
      await fetchAuthorWorks(author.id, 20, oaOpts);
      log.push(`OpenAlex warmed: ${r.label}`);
    }
  }

  // AI-1: regenerate on the demo project's input
  await generateQuestions({
    title: "Late-stage clinical trial outcome prediction",
    businessPlan: "MedScan partners with hospital networks running phase III oncology trials...",
    endGoal: "A risk score per enrolled participant, computed at week 4...",
  });
  log.push("AI-1 warmed");

  log.push("AI-2/3/4 are not deterministic; rely on Gemini connection warm.");

  return { ok: true, log };
}

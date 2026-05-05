"use server";

import { cookies } from "next/headers";
import { generateQuestions } from "@/lib/ai/prompts/generate-questions";
import type { GenerateQuestionsOutput } from "@/lib/ai/prompts/generate-questions";

const RATE_COOKIE = "polymath-landing-demo";
const MAX_PER_SESSION = 5;

export type LandingDemoResult =
  | { ok: true; questions: GenerateQuestionsOutput["questions"] }
  | { ok: false; error: string };

/**
 * Public, unauthenticated AI-1 endpoint exposed on the landing page so visitors
 * can watch Gemini work without signing up. Cookie-rate-limited to MAX_PER_SESSION
 * runs per browser to keep the Gemini bill bounded.
 */
export async function runLandingDemo(input: {
  title: string;
  businessPlan: string;
  endGoal: string;
}): Promise<LandingDemoResult> {
  const cookieStore = await cookies();
  const used = parseInt(cookieStore.get(RATE_COOKIE)?.value ?? "0", 10);
  if (Number.isFinite(used) && used >= MAX_PER_SESSION) {
    return {
      ok: false,
      error: `You've hit the live-demo limit (${String(MAX_PER_SESSION)} per session). Sign up to keep generating.`,
    };
  }

  // Trim whitespace; reject anything obviously empty or tiny.
  const title = input.title.trim();
  const businessPlan = input.businessPlan.trim();
  const endGoal = input.endGoal.trim();
  if (title.length < 4 || businessPlan.length < 40 || endGoal.length < 20) {
    return {
      ok: false,
      error: "Inputs are too short. Title, business plan and end-goal all need real content.",
    };
  }

  try {
    const result = await generateQuestions({ title, businessPlan, endGoal });
    cookieStore.set(RATE_COOKIE, String(used + 1), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4,
    });
    return { ok: true, questions: result.questions };
  } catch (e) {
    return {
      ok: false,
      error: `AI error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

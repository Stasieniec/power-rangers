import type { z } from "zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

interface GenerateOpts {
  system: string;
  prompt: string;
  apiKey?: string; // overrideable for tests
  fetchImpl?: typeof fetch; // injectable for tests
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public override cause?: unknown
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export async function generate<T>(schema: z.ZodType<T>, opts: GenerateOpts): Promise<T> {
  const apiKey = opts.apiKey ?? getCloudflareContext().env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY not set");
  const fetchImpl = opts.fetchImpl ?? fetch;

  // Try up to 3 times. Gemini occasionally emits JSON that doesn't match the
  // schema (wrong field names, missing required keys); a fresh sample usually
  // gets it right. Keep temperature stable; the variation comes from sampling.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const body = {
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    };

    const res = await fetchImpl(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      // 429 / 5xx are transient; retry. 4xx other than 429 won't recover.
      if (res.status === 429 || res.status >= 500) {
        lastErr = new GeminiError(`gemini ${String(res.status)}: ${errText}`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw new GeminiError(`gemini ${String(res.status)}: ${errText}`);
    }

    const rawText = await res.text();
    const json = JSON.parse(rawText) as unknown as GeminiResponse;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      lastErr = new GeminiError("no text in response");
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch (e) {
      lastErr = new GeminiError("response was not JSON", e);
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    lastErr = new GeminiError(`schema mismatch: ${result.error.message}`);
    // Loop and try again with fresh sampling.
  }
  throw lastErr instanceof Error ? lastErr : new GeminiError("retry exhausted");
}

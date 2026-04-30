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
    throw new GeminiError(`gemini ${String(res.status)}: ${errText}`);
  }

  const rawText = await res.text();
  const json = JSON.parse(rawText) as unknown as GeminiResponse;

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError("no text in response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    throw new GeminiError("response was not JSON", e);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new GeminiError(`schema mismatch: ${result.error.message}`);
  }
  return result.data;
}

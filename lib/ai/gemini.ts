import { z } from "zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent";

interface GenerateOpts {
  system: string;
  prompt: string;
  apiKey?: string; // overrideable for tests
  fetchImpl?: typeof fetch; // injectable for tests
}

export class GeminiError extends Error {
  constructor(message: string, public override cause?: unknown) {
    super(message);
    this.name = "GeminiError";
  }
}

export async function generate<T>(
  schema: z.ZodSchema<T>,
  opts: GenerateOpts
): Promise<T> {
  const apiKey =
    opts.apiKey ?? getCloudflareContext().env.GEMINI_API_KEY;
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
    const text = await res.text();
    throw new GeminiError(`gemini ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError("no text in response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new GeminiError("response was not JSON", e);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new GeminiError(`schema mismatch: ${result.error.message}`);
  }
  return result.data;
}

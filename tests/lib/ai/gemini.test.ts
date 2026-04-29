import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { generate, GeminiError } from "@/lib/ai/gemini";

const schema = z.object({ greeting: z.string() });

function mockFetch(body: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })
  );
}

describe("generate", () => {
  it("parses valid JSON matching schema", async () => {
    const fetchImpl = mockFetch({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ greeting: "hello" }) }],
          },
        },
      ],
    });
    const out = await generate(schema, {
      system: "s",
      prompt: "p",
      apiKey: "test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toEqual({ greeting: "hello" });
  });

  it("throws GeminiError on non-200", async () => {
    const fetchImpl = mockFetch({ error: "rate limited" }, 429);
    await expect(
      generate(schema, {
        system: "s",
        prompt: "p",
        apiKey: "test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toThrow(GeminiError);
  });

  it("throws on schema mismatch", async () => {
    const fetchImpl = mockFetch({
      candidates: [
        { content: { parts: [{ text: JSON.stringify({ wrong: 1 }) }] } },
      ],
    });
    await expect(
      generate(schema, {
        system: "s",
        prompt: "p",
        apiKey: "test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toThrow(/schema mismatch/);
  });

  it("throws on non-JSON response body", async () => {
    const fetchImpl = mockFetch({
      candidates: [{ content: { parts: [{ text: "not json {{" }] } }],
    });
    await expect(
      generate(schema, {
        system: "s",
        prompt: "p",
        apiKey: "test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toThrow(/not JSON/);
  });
});

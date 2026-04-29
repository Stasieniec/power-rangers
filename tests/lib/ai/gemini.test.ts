import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { generate, GeminiError } from "@/lib/ai/gemini";

const schema = z.object({ greeting: z.string() });

function mockFetch(body: unknown, status = 200) {
  return vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      })
    )
  ) as unknown as typeof fetch;
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
      fetchImpl,
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
        fetchImpl,
      })
    ).rejects.toThrow(GeminiError);
  });

  it("throws on schema mismatch", async () => {
    const fetchImpl = mockFetch({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ wrong: 1 }) }] } }],
    });
    await expect(
      generate(schema, {
        system: "s",
        prompt: "p",
        apiKey: "test",
        fetchImpl,
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
        fetchImpl,
      })
    ).rejects.toThrow(/not JSON/);
  });
});

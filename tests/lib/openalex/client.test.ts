import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import {
  fetchAuthorByOrcid,
  fetchAuthorByName,
  fetchAuthorWorks,
  reconstructAbstract,
} from "@/lib/openalex/client";

// Minimal KV stub cast via a typed helper to avoid double-cast linting noise.
function asKv(stub: {
  get: (k: string) => Promise<string | null>;
  put: (k: string, v: string) => Promise<void>;
}): KVNamespace {
  return stub as unknown as KVNamespace;
}

// Cast a vitest Mock to typeof fetch — Mock satisfies the runtime shape.
function asFetch(m: Mock): typeof fetch {
  return m as typeof fetch;
}

const memKv = new Map<string, string>();
const fakeKv = {
  get: vi.fn((k: string): Promise<string | null> => Promise.resolve(memKv.get(k) ?? null)),
  put: vi.fn((k: string, v: string): Promise<void> => {
    memKv.set(k, v);
    return Promise.resolve();
  }),
};

beforeEach(() => {
  memKv.clear();
  fakeKv.get.mockClear();
  fakeKv.put.mockClear();
});

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("fetchAuthorByOrcid", () => {
  it("returns first author and caches it", async () => {
    const author = {
      id: "A1",
      display_name: "Yann LeCun",
      orcid: "0000-0001-2345-6789",
      works_count: 100,
      cited_by_count: 200000,
      x_concepts: [],
      last_known_institution: { display_name: "NYU" },
    };
    const fetchImpl = vi.fn(() => Promise.resolve(ok({ results: [author] })));
    const out = await fetchAuthorByOrcid("0000-0001-2345-6789", {
      fetchImpl: asFetch(fetchImpl),
      kv: asKv(fakeKv),
      email: "test@example.com",
    });
    expect(out?.id).toBe("A1");
    expect(fakeKv.put).toHaveBeenCalledOnce();

    const out2 = await fetchAuthorByOrcid("0000-0001-2345-6789", {
      fetchImpl: asFetch(fetchImpl),
      kv: asKv(fakeKv),
      email: "test@example.com",
    });
    expect(out2?.id).toBe("A1");
    expect(fetchImpl).toHaveBeenCalledOnce(); // second call hit cache
  });

  it("returns null when no results", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(ok({ results: [] })));
    const out = await fetchAuthorByOrcid("0000-0000-0000-0000", {
      fetchImpl: asFetch(fetchImpl),
      kv: asKv(fakeKv),
      email: "test@example.com",
    });
    expect(out).toBeNull();
  });
});

describe("fetchAuthorByName", () => {
  it("filters by name + affiliation", async () => {
    const fetchImpl = vi.fn((url: string) => {
      expect(url).toContain("search=");
      return Promise.resolve(
        ok({
          results: [
            {
              id: "A2",
              display_name: "X",
              orcid: null,
              works_count: 1,
              cited_by_count: 1,
              x_concepts: [],
            },
          ],
        })
      );
    });
    const out = await fetchAuthorByName("Jane Doe", "Stanford", {
      fetchImpl: asFetch(fetchImpl),
      kv: asKv(fakeKv),
      email: "test@example.com",
    });
    expect(out?.id).toBe("A2");
  });
});

describe("fetchAuthorWorks", () => {
  it("calls works endpoint with author filter", async () => {
    const fetchImpl = vi.fn((url: string) => {
      expect(url).toContain("filter=author.id:A1");
      return Promise.resolve(
        ok({
          results: [
            {
              id: "W1",
              title: "Paper",
              display_name: "Paper",
              publication_year: 2024,
              cited_by_count: 5,
              doi: null,
              abstract_inverted_index: null,
            },
          ],
        })
      );
    });
    const out = await fetchAuthorWorks("A1", 5, {
      fetchImpl: asFetch(fetchImpl),
      kv: asKv(fakeKv),
      email: "test@example.com",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe("Paper");
  });
});

describe("reconstructAbstract", () => {
  it("rebuilds abstract from inverted index", () => {
    const inv = { hello: [0], world: [1] };
    expect(reconstructAbstract(inv)).toBe("hello world");
  });
  it("returns null when index is null", () => {
    expect(reconstructAbstract(null)).toBeNull();
  });
});

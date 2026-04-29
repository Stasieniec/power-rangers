import type { OAAuthor, OAAuthorsResponse, OAWork, OAWorksResponse } from "./types";

interface Opts {
  fetchImpl?: typeof fetch;
  kv: KVNamespace;
  email: string;
  ttlSeconds?: number;
}

const BASE = "https://api.openalex.org";
const DEFAULT_TTL = 60 * 60 * 24; // 24h

function ua(email: string) {
  return `polymath/0.1 (mailto:${email})`;
}

async function getCached<T>(
  kv: KVNamespace,
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = await kv.get(key);
  if (hit) return JSON.parse(hit) as T;
  const fresh = await fetcher();
  await kv.put(key, JSON.stringify(fresh), { expirationTtl: ttl });
  return fresh;
}

async function oaFetch<T>(url: string, fetchImpl: typeof fetch, email: string): Promise<T> {
  const res = await fetchImpl(url, {
    headers: { "user-agent": ua(email) },
  });
  if (!res.ok) throw new Error(`openalex ${String(res.status)}`);
  return JSON.parse(await res.text()) as T;
}

export async function fetchAuthorByOrcid(orcid: string, opts: Opts): Promise<OAAuthor | null> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL;
  const key = `oa:author:orcid:${orcid}`;
  return getCached(opts.kv, key, ttl, async () => {
    const url = `${BASE}/authors?filter=orcid:${encodeURIComponent(orcid)}&per-page=1&mailto=${encodeURIComponent(opts.email)}`;
    const json = await oaFetch<OAAuthorsResponse>(url, fetchImpl, opts.email);
    return json.results[0] ?? null;
  });
}

export async function fetchAuthorByName(
  name: string,
  affiliation: string | undefined,
  opts: Opts
): Promise<OAAuthor | null> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL;
  const key = `oa:author:name:${name.toLowerCase()}|${(affiliation ?? "").toLowerCase()}`;
  return getCached(opts.kv, key, ttl, async () => {
    const search = encodeURIComponent(`${name} ${affiliation ?? ""}`.trim());
    const url = `${BASE}/authors?search=${search}&per-page=1&mailto=${encodeURIComponent(opts.email)}`;
    const json = await oaFetch<OAAuthorsResponse>(url, fetchImpl, opts.email);
    return json.results[0] ?? null;
  });
}

export async function fetchAuthorWorks(
  authorId: string,
  perPage: number,
  opts: Opts
): Promise<OAWork[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL;
  const key = `oa:works:${authorId}:${String(perPage)}`;
  return getCached(opts.kv, key, ttl, async () => {
    const url = `${BASE}/works?filter=author.id:${encodeURIComponent(authorId)}&per-page=${String(perPage)}&sort=cited_by_count:desc&mailto=${encodeURIComponent(opts.email)}`;
    const json = await oaFetch<OAWorksResponse>(url, fetchImpl, opts.email);
    return json.results;
  });
}

export function reconstructAbstract(inv: Record<string, number[]> | null): string | null {
  if (!inv) return null;
  const positions: { word: string; pos: number }[] = [];
  for (const [word, posList] of Object.entries(inv)) {
    for (const p of posList) positions.push({ word, pos: p });
  }
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map((p) => p.word).join(" ");
}

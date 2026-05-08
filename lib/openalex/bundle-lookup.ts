import bundle from "@/scripts/fixtures/openalex-bundle.json";
import type { OAAuthor, OAWork } from "./types";

interface BundleEntry {
  author: OAAuthor;
  works: OAWork[];
}
const BUNDLE = bundle as Record<string, BundleEntry>;

function stripOrcid(orcid: string): string {
  return orcid.replace(/^https?:\/\/orcid\.org\//, "").trim();
}

const BY_ORCID: Map<string, BundleEntry> = (() => {
  const m = new Map<string, BundleEntry>();
  for (const entry of Object.values(BUNDLE)) {
    const o = entry.author.orcid;
    if (o) m.set(stripOrcid(o), entry);
  }
  return m;
})();

export function lookupBundledByOrcid(orcid: string): BundleEntry | null {
  return BY_ORCID.get(stripOrcid(orcid)) ?? null;
}

export function listBundledOrcids(): { orcid: string; displayName: string }[] {
  return [...BY_ORCID.entries()].map(([orcid, entry]) => ({
    orcid,
    displayName: entry.author.display_name,
  }));
}

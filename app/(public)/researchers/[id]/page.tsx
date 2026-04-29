import { notFound } from "next/navigation";
import { Container } from "@/components/shell/container";
import { PublicationList } from "@/components/researcher/publication-list";
import { ExpertiseTags } from "@/components/researcher/expertise-tags";
import { getResearcherDetail } from "@/lib/db/queries/researchers";

export const dynamic = "force-dynamic";

export default async function ResearcherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getResearcherDetail(id);
  if (!r) notFound();

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="text-text-dim font-mono text-xs tracking-widest uppercase">Researcher</p>
        <h1 className="font-display mt-3 text-5xl">{r.displayName}</h1>
        {r.headline && <p className="text-text mt-4 text-lg">{r.headline}</p>}
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs">
          {r.affiliation && (
            <>
              <dt className="text-text-dim tracking-widest uppercase">Affiliation</dt>
              <dd className="text-text">{r.affiliation}</dd>
            </>
          )}
          {r.orcid && (
            <>
              <dt className="text-text-dim tracking-widest uppercase">ORCID</dt>
              <dd>
                <a
                  href={`https://orcid.org/${r.orcid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan hover:underline"
                >
                  {r.orcid}
                </a>
              </dd>
            </>
          )}
        </dl>

        {r.aiSummary && (
          <section className="border-gold/60 bg-paper/5 mt-10 border-l-4 p-6">
            <p className="text-gold font-mono text-xs tracking-widest uppercase">AI summary</p>
            <p className="font-display text-text mt-3 text-lg leading-relaxed italic">
              {r.aiSummary}
            </p>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl">Expertise</h2>
          <p className="text-text-dim mt-2 text-sm">
            Concept tags from OpenAlex, weighted by author score.
          </p>
          <div className="mt-6">
            <ExpertiseTags concepts={r.concepts} />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Selected publications</h2>
          <div className="mt-6">
            <PublicationList publications={r.publications} />
          </div>
        </section>
      </Container>
    </main>
  );
}

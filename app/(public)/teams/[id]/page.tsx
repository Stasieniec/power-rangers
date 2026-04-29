import { notFound } from "next/navigation";
import { Container } from "@/components/shell/container";
import { ExpertiseCloud } from "@/components/team/expertise-cloud";
import { ResearcherCard } from "@/components/researcher/researcher-card";
import { getTeamDetail } from "@/lib/db/queries/teams";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeamDetail(id);
  if (!team) notFound();

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="text-text-dim font-mono text-xs tracking-widest uppercase">Research team</p>
        <h1 className="font-display mt-3 text-5xl">{team.name}</h1>
        {team.description && <p className="text-text-dim mt-4 max-w-prose">{team.description}</p>}

        <section className="mt-12">
          <h2 className="font-display text-2xl">Aggregate expertise</h2>
          <p className="text-text-dim mt-2 text-sm">
            Synthesized from members' OpenAlex publication concepts.
          </p>
          <div className="mt-6">
            <ExpertiseCloud concepts={team.concepts} />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Members</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {team.members.map((m) => (
              <ResearcherCard
                key={m.userId}
                researcherId={m.researcherId}
                displayName={m.displayName}
                headline={m.headline}
                affiliation={m.affiliation}
                role={m.role}
              />
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}

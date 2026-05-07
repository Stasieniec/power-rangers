import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";
import { requireDbUser } from "@/lib/auth/current-user";
import { getTeamForManage } from "@/lib/db/queries/team-manage";
import { InviteLinkCard } from "./_components/invite-link-card";
import { MemberList } from "./_components/member-list";

export default async function TeamManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireDbUser();

  const data = await getTeamForManage(id, user.id);
  if (!data) notFound();

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  return (
    <main className="py-16">
      <Container width="narrow">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-cyan font-mono text-xs tracking-widest uppercase">Team</p>
            <h1 className="font-display mt-3 text-5xl">{data.team.name}</h1>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/teams/${data.team.id}`}>Public page →</Link>
          </Button>
        </div>
        {data.team.description && <p className="text-text-dim mt-4">{data.team.description}</p>}

        {data.isLead && (
          <div className="mt-12">
            <InviteLinkCard teamId={data.team.id} invites={data.invites} baseUrl={baseUrl} />
          </div>
        )}

        <div className="mt-12">
          <MemberList members={data.members} />
        </div>
      </Container>
    </main>
  );
}

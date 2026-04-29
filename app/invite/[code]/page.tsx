import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";
import { getDb } from "@/lib/db/client";
import { teamInvites, teams } from "@/lib/db/schema";
import { AcceptButton } from "./_components/accept-button";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = getDb();
  const invite = await db.query.teamInvites.findFirst({
    where: eq(teamInvites.code, code),
  });
  if (!invite) notFound();

  const [team] = await db.select().from(teams).where(eq(teams.id, invite.teamId)).limit(1);
  if (!team) notFound();

  const expired = invite.expiresAt < Date.now();
  const used = invite.usedByUserId !== null;

  const { userId } = await auth();

  return (
    <main className="py-32">
      <Container width="narrow" className="text-center">
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">Team invitation</p>
        <h1 className="font-display mt-4 text-5xl">
          You&apos;re invited to join <span className="text-text-dim italic">{team.name}</span>.
        </h1>
        {team.description && <p className="text-text-dim mt-6">{team.description}</p>}

        <div className="mt-12">
          {expired ? (
            <p className="text-rose">This invite has expired.</p>
          ) : used ? (
            <p className="text-rose">This invite has already been used.</p>
          ) : !userId ? (
            <Button asChild size="lg">
              <Link href={`/sign-up?redirect_url=/invite/${code}`}>Sign up to accept</Link>
            </Button>
          ) : (
            <AcceptButton code={code} />
          )}
        </div>
      </Container>
    </main>
  );
}

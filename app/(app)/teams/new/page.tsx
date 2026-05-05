import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Container } from "@/components/shell/container";
import { CreateTeamForm } from "./_components/create-team-form";
import { requireDbUser } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db/client";
import { researchers } from "@/lib/db/schema";

export default async function NewTeamPage() {
  const user = await requireDbUser();
  if (user.role !== "researcher") redirect("/dashboard");

  // require a researcher profile first
  const r = await getDb().query.researchers.findFirst({
    where: eq(researchers.userId, user.id),
  });
  if (!r) redirect("/onboard");

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">New team</p>
        <h1 className="font-display mt-3 text-5xl">Form a research team.</h1>
        <p className="text-text-dim mt-4">
          You'll be the team lead. Invite collaborators via a shareable link after creating the
          team.
        </p>
        <div className="mt-12">
          <CreateTeamForm />
        </div>
      </Container>
    </main>
  );
}

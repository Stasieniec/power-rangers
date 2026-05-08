import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";
import { requireDbUser } from "@/lib/auth/current-user";
import { getResearcherDashboard } from "@/lib/db/queries/dashboard";
import { getCompanyDashboard } from "@/lib/db/queries/company-dashboard";
import { CompanyDashboard } from "./_components/company-dashboard";

export default async function DashboardPage() {
  const user = await requireDbUser();

  if (user.role === "company") {
    const { projects } = await getCompanyDashboard(user.id);
    return <CompanyDashboard displayName={user.displayName} projects={projects} />;
  }

  const { researcher, teams, applications } = await getResearcherDashboard(user.id);
  if (!researcher) redirect("/onboard");

  return (
    <main className="py-16">
      <Container>
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">Researcher</p>
        <h1 className="font-display mt-3 text-4xl">Welcome, {user.displayName}</h1>
        <p className="text-text-dim mt-2">{researcher.headline}</p>

        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Your teams</h2>
            <Button asChild size="sm" variant="secondary">
              <Link href="/teams/new">+ New team</Link>
            </Button>
          </div>
          {teams.length === 0 ? (
            <p className="text-text-dim mt-4">
              You're not on any teams yet. Create one or accept an invite.
            </p>
          ) : (
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {teams.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/teams/${t.id}`}
                    className="border-ink-3 bg-ink-2 hover:border-cyan/60 block rounded-md border p-5"
                  >
                    <p className="text-text-dim font-mono text-xs tracking-widest uppercase">
                      {t.role}
                    </p>
                    <p className="font-display mt-2 text-xl">{t.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Applications</h2>
          {applications.length === 0 ? (
            <p className="text-text-dim mt-4">
              No applications yet.{" "}
              <Link href="/projects" className="text-cyan underline-offset-4 hover:underline">
                Browse open projects →
              </Link>
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {applications.map((a) => (
                <li
                  key={a.id}
                  className="border-ink-3 bg-ink-2 flex items-center justify-between rounded-md border p-4"
                >
                  <div>
                    <p className="font-display text-lg">{a.projectTitle}</p>
                    <p className="text-text-dim font-mono text-xs">
                      {a.companyName} · {a.teamName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan font-mono text-2xl">{a.matchScore}</p>
                    <p className="text-text-dim font-mono text-xs tracking-widest uppercase">
                      {a.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </main>
  );
}

import Link from "next/link";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  title: string;
  status: string;
  createdAt: number;
  applicantCount: number;
}

export function CompanyDashboard({
  displayName,
  projects,
}: {
  displayName: string;
  projects: Project[];
}) {
  return (
    <main className="py-16">
      <Container>
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">Company</p>
        <h1 className="font-display mt-3 text-4xl">Welcome, {displayName}</h1>

        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Your projects</h2>
            <Button asChild>
              <Link href="/projects/new">+ New project</Link>
            </Button>
          </div>
          {projects.length === 0 ? (
            <p className="text-text-dim mt-6">
              No projects yet. Post one and let researchers compete.
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="border-ink-3 bg-ink-2 flex items-center justify-between rounded-md border p-5"
                >
                  <div>
                    <Link
                      href={
                        p.status === "draft" ? `/projects/${p.id}/edit` : `/projects/${p.id}/manage`
                      }
                      className="font-display hover:text-cyan text-xl"
                    >
                      {p.title}
                    </Link>
                    <p className="text-text-dim mt-1 font-mono text-xs">
                      {p.status} · {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan font-mono text-2xl">{p.applicantCount}</p>
                    <p className="text-text-dim font-mono text-xs tracking-widest uppercase">
                      applicants
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

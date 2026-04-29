import { Container } from "@/components/shell/container";
import { ProjectCard } from "@/components/project/project-card";
import { listOpenProjects } from "@/lib/db/queries/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsListPage() {
  const projects = await listOpenProjects();

  return (
    <main className="py-16">
      <Container>
        <header className="mb-12 max-w-2xl">
          <p className="text-cyan font-mono text-xs tracking-widest uppercase">Open projects</p>
          <h1 className="font-display mt-3 text-5xl">
            {projects.length} {projects.length === 1 ? "project" : "projects"} taking applications.
          </h1>
        </header>
        {projects.length === 0 ? (
          <p className="text-text-dim">No open projects yet. Check back after the demo runs.</p>
        ) : (
          <div>
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}

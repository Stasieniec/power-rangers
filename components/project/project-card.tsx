import Link from "next/link";
import type { ProjectListItem } from "@/lib/db/queries/projects";

export function ProjectCard({ p }: { p: ProjectListItem }) {
  return (
    <Link
      href={`/projects/${p.id}`}
      className="group border-ink-3 hover:bg-ink-2/30 block border-b py-8 transition-colors"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-text-dim font-mono text-xs tracking-widest uppercase">{p.companyName}</p>
        <p className="text-text-dim font-mono text-xs">
          {new Date(p.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
      <h3 className="font-display text-text group-hover:text-cyan mt-3 text-2xl">{p.title}</h3>
      <p className="text-text-dim mt-3 max-w-2xl">{p.endGoal}</p>
    </Link>
  );
}

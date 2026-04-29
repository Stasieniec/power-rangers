export function ProjectMeta({
  status,
  applicantCount,
  createdAt,
}: {
  status: string;
  applicantCount: number;
  createdAt: number;
}) {
  return (
    <dl className="border-ink-3 grid grid-cols-3 gap-6 border-y py-4 font-mono text-xs">
      <div>
        <dt className="text-text-dim tracking-widest uppercase">Status</dt>
        <dd className="text-text mt-1">{status}</dd>
      </div>
      <div>
        <dt className="text-text-dim tracking-widest uppercase">Applicants</dt>
        <dd className="text-text mt-1">{applicantCount}</dd>
      </div>
      <div>
        <dt className="text-text-dim tracking-widest uppercase">Posted</dt>
        <dd className="text-text mt-1">
          {new Date(createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </dd>
      </div>
    </dl>
  );
}

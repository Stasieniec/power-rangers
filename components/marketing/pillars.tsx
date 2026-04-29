import { Container } from "@/components/shell/container";

const pillars = [
  {
    n: "01",
    title: "Project Posting",
    body: "A company writes its end-goal in plain language. An AI translation layer converts it into structured research questions — versioned, editable, defensible.",
  },
  {
    n: "02",
    title: "Application Process",
    body: "Researchers connect their ORCID. Their publication history becomes a living expertise profile. Teams form. Match scores combine real concept overlap with AI-written rationale.",
  },
  {
    n: "03",
    title: "Alignment Environment",
    body: "Teams submit weekly reports in their own technical language. Polymath translates them into business-side cards — KPI deltas, timeline impact, plain-English findings.",
  },
];

export function Pillars() {
  return (
    <section className="py-32">
      <Container>
        <h2 className="font-display mb-16 max-w-2xl text-4xl">
          Three pillars, <span className="text-text-dim italic">one common ground.</span>
        </h2>
        <div className="grid gap-12 md:grid-cols-3">
          {pillars.map((p) => (
            <article key={p.n} className="border-ink-3 border-l pl-6">
              <div className="text-cyan font-mono text-xs">{p.n}</div>
              <h3 className="font-display mt-2 text-2xl">{p.title}</h3>
              <p className="text-text-dim mt-4">{p.body}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

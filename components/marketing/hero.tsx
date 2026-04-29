import Link from "next/link";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";
import { CircuitPattern } from "./circuit-pattern";

export function Hero() {
  return (
    <section className="border-ink-3/60 relative overflow-hidden border-b py-32">
      <CircuitPattern className="absolute inset-0 -z-0 h-full w-full opacity-60" />
      <Container className="relative">
        <p className="text-cyan mb-6 font-mono text-xs tracking-widest uppercase">
          Research × Business
        </p>
        <h1 className="font-display max-w-3xl text-6xl leading-[1.05] md:text-7xl">
          Research,
          <br />
          <span className="text-text-dim italic">posed as a competition.</span>
        </h1>
        <p className="text-text-dim mt-8 max-w-xl text-lg">
          Polymath translates business goals into structured research questions, matches them to the
          right teams using real publication data, and keeps progress legible to both sides.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Button size="lg" asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href="/projects">Browse open projects →</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}

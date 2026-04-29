import Link from "next/link";
import { Container } from "@/components/shell/container";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="border-ink-3/60 border-t py-32">
      <Container width="narrow" className="text-center">
        <h2 className="font-display text-5xl">
          Post a project, <span className="text-text-dim italic">find a team.</span>
        </h2>
        <p className="text-text-dim mt-6 text-lg">
          Or start a research team and put your work to use beyond the paper.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/sign-up">Sign up</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/projects">See open projects</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}

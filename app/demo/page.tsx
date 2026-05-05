import Link from "next/link";
import { Container } from "@/components/shell/container";
import { PublicNav } from "@/components/shell/public-nav";
import { Footer } from "@/components/shell/footer";
import { PersonaCard } from "./_components/persona-card";

export const metadata = {
  title: "Demo — Polymath",
};

export default function DemoPage() {
  return (
    <>
      <PublicNav />
      <main className="py-20">
        <Container width="narrow">
          <p className="text-cyan font-mono text-xs tracking-widest uppercase">Demo door</p>
          <h1 className="font-display mt-3 text-5xl">Step into a seeded persona.</h1>
          <p className="text-text-dim mt-4 max-w-prose">
            For the live walk-through. Pick a persona to bypass authentication and inspect the
            authenticated views — company dashboard, application rankings, alignment cards. No email
            round-trip. Real database, real AI outputs.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <PersonaCard
              userId="user_medscan"
              accent="gold"
              eyebrow="Company"
              title="MedScan Diagnostics"
              subtitle="The company side: post projects, review applications, watch alignment cards arrive."
              unlock="Company dashboard · /projects/p1/manage · /projects/p2/dashboard"
            />
            <PersonaCard
              userId="user_alice"
              eyebrow="Researcher · Convex Lab"
              title="Daphne Koller"
              subtitle="Team lead. Browse open projects, apply with Convex Lab, see your match score."
              unlock="Researcher dashboard · /teams/team_convex/manage · apply to P1"
            />
            <PersonaCard
              userId="user_carla"
              eyebrow="Researcher · Lattice Sciences (lead)"
              title="Nigam H. Shah"
              subtitle="Already applied to P1. Inspect the application from the team-lead view."
              unlock="Researcher dashboard · /teams/team_lattice/manage"
            />
            <PersonaCard
              userId="user_frank"
              eyebrow="Researcher · BioFlux Lab (accepted on P2)"
              title="Eran Halperin"
              subtitle="On the accepted team. Submit a new weekly report — watch the cards animate in on the company's dashboard."
              unlock="/projects/p2/report (live AI)"
            />
          </div>

          <div className="border-ink-3 mt-16 border-t pt-8">
            <p className="text-text-dim text-sm">
              Want real auth instead?{" "}
              <Link href="/sign-up" className="text-cyan underline-offset-4 hover:underline">
                Sign up
              </Link>{" "}
              or{" "}
              <Link href="/sign-in" className="text-cyan underline-offset-4 hover:underline">
                sign in
              </Link>
              .
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

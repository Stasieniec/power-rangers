import { Hero } from "@/components/marketing/hero";
import { Pillars } from "@/components/marketing/pillars";
import { Cta } from "@/components/marketing/cta";
import { LiveAIDemo } from "@/components/marketing/live-ai-demo";

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <Pillars />
      <LiveAIDemo />
      <Cta />
    </main>
  );
}

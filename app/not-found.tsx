import Link from "next/link";
import { Container } from "@/components/shell/container";

export default function NotFound() {
  return (
    <main className="py-32">
      <Container width="narrow" className="text-center">
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">404</p>
        <h1 className="font-display mt-4 text-5xl">Not found.</h1>
        <p className="text-text-dim mt-4">That page doesn't exist, or it isn't public.</p>
        <Link href="/" className="text-cyan mt-8 inline-block underline-offset-4 hover:underline">
          ← Back home
        </Link>
      </Container>
    </main>
  );
}

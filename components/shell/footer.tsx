import { Container } from "./container";

export function Footer() {
  return (
    <footer className="border-ink-3/60 mt-32 border-t py-10">
      <Container className="text-text-dim flex items-center justify-between text-sm">
        <span className="font-display">Polymath</span>
        <span className="font-mono text-xs">built by Power Rangers · 2026</span>
      </Container>
    </footer>
  );
}

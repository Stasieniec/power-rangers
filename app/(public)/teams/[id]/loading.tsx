import { Container } from "@/components/shell/container";

export default function Loading() {
  return (
    <main className="py-16">
      <Container width="narrow">
        <div className="bg-ink-3 h-3 w-24 animate-pulse rounded" />
        <div className="bg-ink-3 mt-4 h-12 w-3/4 animate-pulse rounded" />
        <div className="bg-ink-3 mt-8 h-4 w-full animate-pulse rounded" />
        <div className="bg-ink-3 mt-2 h-4 w-5/6 animate-pulse rounded" />
      </Container>
    </main>
  );
}

import Link from "next/link";
import { Container } from "./container";
import { ThemeToggle } from "./theme-toggle";

export function PublicNav() {
  return (
    <header className="border-ink-3/60 border-b">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-xl tracking-tight">
          Polymath
        </Link>
        <nav className="flex items-center gap-8 text-sm">
          <Link href="/projects" className="text-text-dim hover:text-text">
            Projects
          </Link>
          <Link href="/sign-in" className="text-text-dim hover:text-text">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="bg-cyan text-ink hover:bg-cyan-dim hover:text-text rounded-sm px-4 py-1.5 font-medium"
          >
            Get started
          </Link>
          <ThemeToggle />
        </nav>
      </Container>
    </header>
  );
}

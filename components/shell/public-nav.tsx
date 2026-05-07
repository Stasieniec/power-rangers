import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { Container } from "./container";
import { ThemeToggle } from "./theme-toggle";
import { isDemoSession } from "@/lib/auth/current-user";
import { exitDemo } from "@/lib/actions/demo";

export async function PublicNav() {
  const isDemo = await isDemoSession();
  const { userId } = await auth();
  const signedIn = isDemo || !!userId;

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

          {signedIn ? (
            <>
              <Link href="/dashboard" className="text-text-dim hover:text-text">
                Dashboard
              </Link>
              {isDemo ? (
                <form action={exitDemo}>
                  <button
                    type="submit"
                    className="text-gold hover:text-text cursor-pointer bg-transparent text-sm"
                  >
                    Exit demo
                  </button>
                </form>
              ) : (
                <SignOutButton redirectUrl="/">
                  <button
                    type="button"
                    className="text-text-dim hover:text-text cursor-pointer bg-transparent text-sm"
                  >
                    Sign out
                  </button>
                </SignOutButton>
              )}
            </>
          ) : (
            <>
              <Link href="/demo" className="text-gold hover:text-text">
                Demo
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
            </>
          )}
          <ThemeToggle />
        </nav>
      </Container>
    </header>
  );
}

import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="bg-ink flex min-h-screen items-center justify-center">
      <SignUp forceRedirectUrl="/pick-role" signInUrl="/sign-in" />
    </main>
  );
}

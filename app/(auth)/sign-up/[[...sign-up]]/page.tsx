import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="bg-ink flex min-h-screen items-center justify-center">
      <SignUp fallbackRedirectUrl="/dashboard" signInUrl="/sign-in" />
    </main>
  );
}

import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="bg-ink flex min-h-screen items-center justify-center">
      <SignIn fallbackRedirectUrl="/dashboard" signUpUrl="/sign-up" />
    </main>
  );
}

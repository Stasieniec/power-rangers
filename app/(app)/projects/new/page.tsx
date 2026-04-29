import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { BusinessPlanForm } from "./_components/business-plan-form";
import { syncUser } from "@/lib/auth/sync-user";

export default async function NewProjectPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");
  const user = await syncUser(clerkUser);
  if (user.role !== "company") redirect("/dashboard");

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">
          New project · Step 1 of 2
        </p>
        <h1 className="font-display mt-3 text-5xl">Tell us your end-goal.</h1>
        <p className="text-text-dim mt-4">
          Polymath translates your business intent into research questions you can compete on.
          You&apos;ll get a chance to edit them before publishing.
        </p>
        <div className="mt-12">
          <BusinessPlanForm />
        </div>
      </Container>
    </main>
  );
}

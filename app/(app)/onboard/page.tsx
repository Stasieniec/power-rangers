import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { OrcidForm } from "./_components/orcid-form";
import { DemoPicker } from "./_components/demo-picker";
import { syncUser } from "@/lib/auth/sync-user";
import { getDb } from "@/lib/db/client";
import { researchers } from "@/lib/db/schema";

export default async function OnboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await syncUser(clerkUser);
  if (user.role === "company") redirect("/dashboard");

  const existing = await getDb().query.researchers.findFirst({
    where: eq(researchers.userId, user.id),
  });
  if (existing) redirect(`/researchers/${existing.id}`);

  return (
    <main className="py-16">
      <Container width="narrow">
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">Onboarding · 1 of 1</p>
        <h1 className="font-display mt-3 text-5xl">Build your researcher profile.</h1>
        <p className="text-text-dim mt-4">
          Enter your ORCID and we'll fetch your publications from OpenAlex and synthesize an
          expertise profile. Don't have one handy? Use a demo researcher to skip ahead.
        </p>
        <div className="mt-12">
          <OrcidForm />
        </div>
        <div className="mt-10">
          <DemoPicker />
        </div>
      </Container>
    </main>
  );
}

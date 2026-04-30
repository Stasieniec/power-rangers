import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Container } from "@/components/shell/container";
import { syncUser } from "@/lib/auth/sync-user";
import { RoleButtons } from "./_components/role-buttons";

export default async function PickRolePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");
  await syncUser(clerkUser);

  return (
    <main className="py-24">
      <Container width="narrow">
        <p className="text-cyan font-mono text-xs tracking-widest uppercase">Welcome to Polymath</p>
        <h1 className="font-display mt-3 text-5xl">How will you use Polymath?</h1>
        <p className="text-text-dim mt-4 max-w-prose">
          Pick how you'll use the platform. You can change this later from your account settings.
        </p>
        <div className="mt-12">
          <RoleButtons />
        </div>
      </Container>
    </main>
  );
}

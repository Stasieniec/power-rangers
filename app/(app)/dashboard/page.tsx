import { auth, currentUser } from "@clerk/nextjs/server";
import { syncUser } from "@/lib/auth/sync-user";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;
  const clerkUser = await currentUser();
  if (!clerkUser) return null;
  const user = await syncUser(clerkUser);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-text text-4xl">Welcome, {user.displayName}</h1>
      <p className="text-text-dim mt-3 font-mono text-sm">
        role: {user.role} · id: {user.id}
      </p>
    </main>
  );
}

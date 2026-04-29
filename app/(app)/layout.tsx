import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PublicNav } from "@/components/shell/public-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return (
    <>
      <PublicNav />
      {children}
    </>
  );
}

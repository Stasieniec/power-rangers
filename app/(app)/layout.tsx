import { redirect } from "next/navigation";
import { PublicNav } from "@/components/shell/public-nav";
import { getCurrentDbUser } from "@/lib/auth/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");
  return (
    <>
      <PublicNav />
      {children}
    </>
  );
}

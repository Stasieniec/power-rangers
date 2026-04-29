import { PublicNav } from "@/components/shell/public-nav";
import { Footer } from "@/components/shell/footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      {children}
      <Footer />
    </>
  );
}

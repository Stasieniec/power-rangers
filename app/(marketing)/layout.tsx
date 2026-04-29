import { PublicNav } from "@/components/shell/public-nav";
import { Footer } from "@/components/shell/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      {children}
      <Footer />
    </>
  );
}

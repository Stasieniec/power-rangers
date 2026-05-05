import { PublicNav } from "@/components/shell/public-nav";
import { Footer } from "@/components/shell/footer";
import { DemoDataBanner } from "@/components/shell/demo-data-banner";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <DemoDataBanner />
      {children}
      <Footer />
    </>
  );
}

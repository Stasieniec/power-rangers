import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { fraunces, inter, jetbrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Praxis",
  description: "Research as a competition.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <ClerkProvider>
      <html
        lang="en"
        data-theme={theme}
        className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      >
        <body className="bg-ink text-text antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}

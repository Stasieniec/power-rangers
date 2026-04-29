import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { fraunces, inter, jetbrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polymath",
  description: "Research as a competition.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      >
        <body className="bg-ink text-text antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}

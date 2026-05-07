import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { fraunces, inter, jetbrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polymath",
  description: "Research as a competition.",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        data-theme="light"
        suppressHydrationWarning
        className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body className="bg-ink text-text antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}

import type { Metadata } from "next";
import { serverEnv } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(serverEnv().SITE_URL),
  title: { default: "said-next", template: "%s · said-next" },
  description: "A Next.js 16 SAID starter template — RSC-first, contract-driven content, ships as a container.",
};

/** Root layout — a Server Component with no client providers by default (ADR-NEXT-S08). */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

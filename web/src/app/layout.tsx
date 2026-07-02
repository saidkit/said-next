import type { Metadata } from "next";
import Link from "next/link";
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
        <header className="site-header">
          <nav className="container">
            <Link href="/" className="brand">said-next</Link>
            <span className="links">
              <Link href="/blog">Blog</Link>
              <Link href="/contact">Contact</Link>
            </span>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

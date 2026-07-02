import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <h1>said-next</h1>
      <p>
        A Next.js 16 SAID starter template. The <Link href="/blog">blog</Link> is a working reference
        implementation of the CMS-contract pattern — MDX by default, WordPress with one env var, no
        route or component changes.
      </p>
      <p>
        Read the decisions in <code>docs/adr/</code> and the code patterns in <code>docs/conventions.md</code>.
      </p>
    </section>
  );
}

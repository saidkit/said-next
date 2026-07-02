import Link from "next/link";

// Rendered by `notFound()` for expected "missing" (ADR-NEXT-S09).
export default function NotFound() {
  return (
    <section>
      <h1>404 — Not found</h1>
      <p>
        <Link href="/">Back home</Link>
      </p>
    </section>
  );
}

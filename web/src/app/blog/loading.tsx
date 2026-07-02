// Instant Suspense fallback for the blog segment (ADR-NEXT-S07 / S09).
export default function Loading() {
  return <p aria-busy="true">Loading…</p>;
}

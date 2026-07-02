"use client"; // error boundaries must be Client Components (ADR-NEXT-S09)

import { useEffect } from "react";

/**
 * Segment boundary — an unexpected throw in the blog renders this fallback while
 * the app chrome above stays alive (ADR-NEXT-S09). `reset` re-renders the segment.
 */
export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Single swap-point for real logging (Sentry, etc.). error.digest ↔ server log.
    console.error(error);
  }, [error]);

  return (
    <section role="alert">
      <h2>Something went wrong loading this section.</h2>
      <button onClick={() => reset()}>Try again</button>
    </section>
  );
}

"use client"; // global-error replaces the root layout, so it owns <html>/<body> (ADR-NEXT-S09)

// Root safety net — catches throws in the root layout itself. It renders WITHOUT
// the app's providers or globals.css (it replaces the layout), so keep it
// self-sufficient. No `metadata` export — use a React <title>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong</title>
        <main style={{ maxWidth: "44rem", margin: "0 auto", padding: "3rem 1.25rem", fontFamily: "system-ui, sans-serif" }}>
          <h1>Something went wrong.</h1>
          <p>An unexpected error reached the root of the app.</p>
          <button onClick={() => reset()}>Try again</button>
        </main>
      </body>
    </html>
  );
}

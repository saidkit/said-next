# ADR-NEXT-S09: Error handling — containment layers (RSC)

**Date:** 2026-06-28
**Status:** Accepted
**Class:** System (portable across Next.js SSR web projects)

> Adapted from the said-web ADR-NEXT-S09 (error handling) — re-cast from a Vite + React SPA (`react-error-boundary` root/route boundaries, TanStack Query `QueryCache.onError` toasts, a `parseResponse` Zod-at-the-axios-boundary) to **Next.js 16 App Router** conventions: `error.tsx` / `global-error.tsx` / `not-found.tsx`, expected-errors-as-return-values, and Server Actions. The error-**island** model carries over; the client query cache and its global toast layer do not — RSC fetches on the server, so failures surface through boundaries, not cache events. Builds on [ADR-NEXT-S02](ADR-NEXT-S02-frontend-stack.md) (the data tree), [ADR-NEXT-S03](ADR-NEXT-S03-feature-structure.md) (where boundary files sit), and [ADR-NEXT-S04](ADR-NEXT-S04-pure-service-modules.md) (the validated seam).

## Problem

Without a deliberate error contract, an RSC app degrades two ways. **Uncaught exceptions** — a render-time throw (undefined access, schema drift in a server fetch) — bubble to the root and blank the whole page when no boundary sits between the fault and the document. **Silent degradation** — a fetch that returns the wrong shape, or a `data ?? []` fallback, renders an empty UI indistinguishable from "genuinely empty," so a broken backend looks like a quiet one. The App Router ships file-based primitives for both, but only once a project decides *which* boundary owns *which* failure class and *where* it sits — otherwise every feature improvises.

## Decision

Five containment layers, cheapest-to-most-invasive. Each catches a different failure class; removing one re-opens a specific mode.

**1. Expected errors are return values, not throws.** Foreseeable failures — form validation, "not found," a request that may fail — are modelled as data:

```ts
// features/contact/server/submit.ts — return the failure; don't throw it
"use server"
export async function submitContact(_prev: unknown, formData: FormData) {
  const parsed = ContactSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: "Check the highlighted fields." }
  await sendMessage(parsed.data)               // service-module seam (ADR-NEXT-S04)
  return { ok: true }
}
// client: const [state, action, pending] = useActionState(submitContact, { ok: true })
```

```tsx
// app/blog/[slug]/page.tsx — a missing entity is expected → not-found.tsx, not a crash
import { notFound } from "next/navigation"
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const post = await loadPost((await params).slug)
  if (!post) notFound()
  return <Article post={post} />
}
```

A Server Component may also branch on a result (render an inline message or `redirect()`). This is the RSC form of said-web's "detail screen renders its own inline fallback, not the route boundary."

**2. Per-segment `error.tsx` for uncaught exceptions.** A `"use client"` `error.tsx` wraps its segment's `page`, `loading`, `not-found`, nested `layout`, and children in a React error boundary; an unexpected throw renders its fallback while the layout *above* it (the app chrome, sibling sections) keeps rendering. Place boundaries by blast radius.

```tsx
// app/blog/error.tsx — section boundary; site chrome above stays alive
"use client"                                   // error boundaries must be Client Components
import { useEffect } from "react"
import { logError } from "@/lib/observability/log-error"

export default function BlogError({ error, unstable_retry }: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => logError(error), [error])    // single swap-point (Sentry later)
  return (
    <section role="alert">
      <h2>Something went wrong loading this section.</h2>
      <button onClick={() => unstable_retry()}>Try again</button>
    </section>
  )
}
```

`unstable_retry()` (Next ≥16.2) re-fetches + re-renders the segment — it supersedes the older `reset()` (which only clears boundary state without re-fetching). `error.tsx` does **not** catch errors in its *own* segment's `layout.tsx`/`template.tsx` — that is layer 3.

**3. `global-error.tsx` — the root safety net.** Catches throws in the root layout itself. It replaces the root layout when active, so it owns its `<html>`/`<body>`; it is a client component and cannot export `metadata` (use a React `<title>`).

```tsx
// app/global-error.tsx
"use client"
export default function GlobalError({ unstable_retry }: {
  error: Error & { digest?: string }; unstable_retry: () => void
}) {
  return (
    <html><body>
      <title>Something went wrong</title>
      <button onClick={() => unstable_retry()}>Try again</button>
    </body></html>
  )
}
```

**4. Component-level islands for fail-in-place widgets.** A widget that should fail *in its own rectangle* (a dashboard card, a side panel) without taking down its section's `error.tsx` gets its own boundary — Next's `unstable_catchError` (`next/error`) wraps any subtree — paired with a scoped `<Suspense>` so it streams independently. A failed island is a missing widget, not a missing screen.

```tsx
"use client"
import { unstable_catchError as catchError } from "next/error"
const CardBoundary = catchError(function Fallback(_props, { unstable_retry }) {
  return <CardErrorState onRetry={unstable_retry} />
})
// <Suspense fallback={<CardSkeleton />}><CardBoundary><MetricCard /></CardBoundary></Suspense>
```

(A plain client `ErrorBoundary` component is the stable fallback if you prefer not to depend on the `unstable_` API.)

**5. Validate at the service-module seam; type and log the failure.** External responses (CMS, API) are parsed with Zod inside `src/lib/<service>/` (ADR-NEXT-S04) *before* a component reads them — a compile-time `as T` cast is not validation. Drift throws a typed error that a boundary renders:

```ts
// lib/cms/posts.ts — drift is a typed, logged error, not a silent bad render
export async function getPosts(): Promise<Post[]> {
  const raw = await fetch(CMS_URL, { next: { revalidate: 3600 } }).then((r) => r.json())
  const parsed = PostsSchema.safeParse(raw)
  if (!parsed.success) throw new ResponseShapeError(CMS_URL, parsed.error.issues)
  return parsed.data
}
```

Server-thrown errors reach the client as a generic message + `error.digest`; match that digest to the server log. One `src/lib/observability/log-error.ts` swap-point is called from `error.tsx` (`useEffect`), `global-error.tsx`, and Server Action `catch`.

**Why no global toast layer.** said-web toasts on every query failure because its data lives in a client cache. In RSC there is no client cache event to hook — failures surface through layers 1–4. A toast is optional *client* feedback for a mutation result, not an architectural layer.

**Why no auto-retry.** Failures surface once, visibly; `unstable_retry()` is the explicit recovery. Auto-retry on a failing backend amplifies load and hides signal (per said-web S09). Opt back in per-call only for genuinely transient work.

## Rules

1. **Every fetching segment has a recovery story** — an `error.tsx` at or above it, or it returns / `notFound()`s expected failures inline. No segment relies on the root blanking.
2. **`notFound()` for "missing," `throw` for "broken."** A 404 is expected (→ `not-found.tsx`); an exception is a bug (→ `error.tsx`). Don't crash a boundary to mean "not found."
3. **Don't throw expected errors from Server Actions** — return `{ ok: false, … }` and render it via `useActionState`. Reserve `throw` for the genuinely unexpected.
4. **Validate external data at the `src/lib/<service>/` seam (Zod), not in components** (ADR-NEXT-S04). Local/MDX content typed at build needs no re-parse.
5. **One error-reporting swap-point** — boundaries and action `catch` call `logError()`; never scatter `Sentry.captureException` across components.
6. **Typed errors get distinct copy** — new conditions (`ResponseShapeError`, `RateLimitError`) are classes in `src/lib/errors.ts` with a stable `name`, mapped to user copy centrally, not remapped per call site.
7. **`error.tsx` / `global-error.tsx` are `"use client"`** and thin presentational shells.

## Alternatives considered

- Rejected - **Root `global-error.tsx` only, no per-segment `error.tsx`**
  - one section's throw blanks the whole app; segment boundaries keep chrome + siblings alive
- Rejected - **`try/catch` + `throw` for form validation**
  - expected failures are return values (`useActionState`); throwing routes foreseeable errors through the uncaught path
- Rejected - **A client error store / global toast (porting said-web's `QueryCache.onError`)**
  - no client query cache in RSC; failures surface via boundaries + returned values
- Rejected - **Trust the TypeScript type of `fetch().json()`**
  - a compile-time cast isn't runtime validation; drift slips to the first reader (Zod at the seam, Rule 4)
- Rejected - **Auto-retry by default**
  - amplifies load on a failing backend, hides signal; `unstable_retry()` is explicit

## Consequences

**Positive:**
- No whole-page blank for a localized fault — boundaries are placed by blast radius.
- "Missing" vs "broken" is distinct in UX (`not-found.tsx` vs `error.tsx`) *and* in code.
- Schema drift is caught at the seam and correlatable to server logs via `error.digest`.
- One observability swap-point; one place to add typed-error copy.

**Negative:**
- Boundary placement is a per-feature design decision — needs review discipline (where does this segment's failure stop?).
- `error.tsx` / `global-error.tsx` add small client components to an otherwise-server tree.
- `unstable_retry()` and `unstable_catchError` are `unstable_`-prefixed (Next ≥16.2) — current best, but may rename; `reset()` and a plain client `ErrorBoundary` are the stable fallbacks.

## Related

- **Source:** said-web ADR-NEXT-S09 (error handling) + its `ux/errors.md` — re-cast from the SPA (react-error-boundary + TanStack Query + Sonner) to App Router conventions.
- **Frontend stack:** [ADR-NEXT-S02](ADR-NEXT-S02-frontend-stack.md) — the RSC data tree these boundaries protect.
- **Feature structure:** [ADR-NEXT-S03](ADR-NEXT-S03-feature-structure.md) — where `error.tsx` / `loading.tsx` / `not-found.tsx` sit per segment.
- **Service modules:** [ADR-NEXT-S04](ADR-NEXT-S04-pure-service-modules.md) — the validated seam (Rule 4).
- **Conventions:** [`../conventions.md`](../conventions.md) — boundary files, Server Action and rendering patterns.

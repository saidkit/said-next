# NextJs Frontend Code Conventions — said-nextjs

How to write code in this starter. **Patterns + copyable examples** — verify against the actual files before acting; this doc describes intent, not current state.

## Core Philosophy

- **KISS** — simple solutions over complex ones.
- **YAGNI** — build only what's needed now.
- **MVP First** — working version, then iterate.
- **Type Safety** — Zod for runtime, TypeScript for compile-time.
- **RSC by default** — fetch on the server; `"use client"` only at the edges.

## Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 16 (App Router) + React 19.2 — server-first, Turbopack, `output: "standalone"` |
| Language | TypeScript (strict) |
| Styling | a single explicit styling layer — project's choice (Tailwind, a vendored DS, CSS Modules…); never two |
| Content | file-based **MDX** under `content/`, read by a `src/lib/` loader |
| Validation | Zod (runtime + compile-time) |
| Lint | ESLint (flat config) |
| Commands | `make` facade → `package.json` scripts (see **Quality gates**) |

---

## Feature Structure

Routes under `src/app/` are **thin** — `page.tsx` resolves deps and **calls a feature** or compose from feature components.
Every feature lives in `src/features/<name>/` (feature structure: **ADR-NEXT-S03**):

```
src/features/<name>/
├── components/   # Feature-scoped UI (PascalCase.tsx) — RSC unless interactive
├── hooks/        # Client hooks (use<Name>.ts) — "use client", state/effects
├── server/       # Server-only logic: data resolution, service calls (RSC)
├── types/        # Feature-owned types (<name>.types.ts)
└── index.ts      # Public API re-exports (optional)
```

Only `components/` is expected in every feature; the rest are added when needed. There is **no SPA `screens/` or `store/`** — route targets are `src/app/<route>/page.tsx`; client state is local or URL-driven (see the decision tree).

- Routes call features; **features never import another feature's internals** — share via `src/components/`, `src/lib/`, or dependency injection (**ADR-NEXT-S05**).
- Shared cross-feature UI in `src/components/`; shared utilities + **service modules** (external systems behind a contract, ADR-NEXT-S04) in `src/lib/` (imported as `@/lib/*`).

Canonical structure: [`adr/ADR-NEXT-S01-repository-structure.md`](adr/ADR-NEXT-S01-repository-structure.md).

### File granularity

> Files map to sources of truth, not to concerns. Co-locate derivatives with their source; split only when sources are independent.

A new file is justified when **all** hold: (1) it's an **independent source of truth**;
(2) it's expected to **multiply** (N+1 of the same kind); 
(3) it's **not** a sub-20-line single-export wrapping another file's contract.

- NOT: A `postDefaultValues` object that must satisfy `CreatePostInput` → bottom of `validations.ts`, not `defaults.ts`.
- NOT: A `getPostStatusLabel` helper keyed by `PostStatus` → next to `POST_STATUSES` in `types.ts`, not `utils.ts`.
- YES: A second independent loader that will gain siblings → its own file.

Failing test: a single function/object whose existence is governed by another file's contract is a **derivative** — co-locate it.

### Service modules (external systems behind a contract)

See **ADR-NEXT-S04**. Short version:

> Any external system (CMS, scheduler, analytics, search) is wrapped behind a **typed contract** in `src/lib/<service>/` and consumed through that interface — features depend on the contract, not the vendor SDK. Swapping the backing implementation is a localized change.

- NOT: `getAllPosts(): Promise<Post[]>` contract; MDX adapter today, CMS adapter tomorrow, callers unchanged.
- YES: `import { createClient } from "@some/cms-sdk"` inside a route or component.

### File naming

| Type         | Convention                  | Example                    |
|--------------|-----------------------------|----------------------------|
| Components   | `PascalCase.tsx`            | `Hero.tsx`, `PostCard.tsx` |
| Client hooks | `use<Name>.ts`              | `useScrollSpy.ts`          |
| Server logic | `kebab-case.ts`             | `load-posts.ts`            |
| Types        | `<name>.types.ts`           | `post.types.ts`            |
| Utilities    | `kebab-case.ts`             | `format-date.ts`           |
| Tests        | co-located `<name>.test.ts` | `format-date.test.ts`      |

### Cross-feature import rules

**Allowed:** `@/features/<name>/types/*` (type-only); `@/features/<name>` (via `index.ts`); `@/components/*`; `@/lib/*`.
**Forbidden:** reaching into another feature's `components/`, `hooks/`, or `server/` internals (unless exposed via its `index.ts`).

---

## Server / Client boundary

**Default to Server Components; fetch on the server.** Server components fetch data directly — no client API layer — and pass it down as props.

```tsx
// app/blog/page.tsx — async RSC: fetch on the server, pass props down
import { loadPosts } from "@/features/blog/server/load-posts"
import { PostList } from "@/features/blog/components/PostList"

export default async function BlogPage() {
  const posts = await loadPosts()      // runs on the server only
  return <PostList posts={posts} />    // PostList receives props; it does not fetch
}
```

`"use client"` only where it **earns it** — event handlers, stateful hooks, browser APIs, or client-only libraries:

```tsx
// features/blog/components/ArticleShell.tsx — a client island
"use client"
import { useState } from "react"

export function ArticleShell({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState(0)   // scroll-spy state lives here
  // ... reading-progress handlers
  return <article>{children}</article>
}
```

- **Data is resolved on the server.** Client components **receive props** — they don't fetch.
- **Browser APIs** (`window`, `document`, `new Date()` for live values) belong in **effects inside client components** — never in render / RSC (hydration mismatch).
- Keep `"use client"` at the **leaf**: a client island deep in the tree keeps its server-rendered ancestors server-only.

---

## Data fetching & caching

Fetch in Server Components or feature `server/` modules. Deduplicate per-request work with React `cache()`:

```ts
// features/blog/server/load-posts.ts
import { cache } from "react"
import { getAllPosts } from "@/lib/content"          // service-module contract

export const loadPosts = cache(async () => getAllPosts())
// Called from multiple server components in one request → runs once.
```

`fetch` is **uncached by default** (as are GET Route Handlers) — opt into caching explicitly:

```ts
await fetch(url, { next: { revalidate: 3600 } })     // ISR: re-fetch hourly
await fetch(url, { cache: "force-cache" })           // opt back into caching (until revalidated)
await fetch(url, { cache: "no-store" })              // always dynamic (uncached = the default)
```

- **Never fetch in a client component** to render initial data — fetch on the server, pass props.
- **React `cache()` dedupes within a single request only** — ephemeral, no tags, no cross-request persistence; use it to avoid double-fetching in one render (as `loadPosts` above).
- **To persist a non-`fetch` source (SDK call, file read) across requests with tag-based revalidation, use `unstable_cache`** (`next/cache`). The [`use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache) directive is the more declarative alternative — opt into it (and PPR) by enabling `cacheComponents` in `next.config` when a project wants component/function-level caching.

---

## Mutations (when needed)

A content/marketing site is mostly read-only; for the occasional form, use **Server Actions + Zod** — no client API layer:

```ts
// features/contact/server/submit.ts
"use server"
import { z } from "zod"

const Schema = z.object({ email: z.string().email(), message: z.string().min(1) })

export async function submitContact(prevState: unknown, formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten() }
  await sendToService(parsed.data)        // service-module contract (ADR-NEXT-S04)
  return { ok: true }
}
```

Validate at the boundary with Zod; revalidate affected routes with `revalidatePath(...)` (or `revalidateTag(...)`).

On the client, wire it with React 19's **`useActionState`** (pending state + last result), **`useFormStatus`** (submit-button pending), and **`useOptimistic`** for optimistic UI — still no client API layer.

---

## Rendering posture (SSG / ISR / SSR)

Default to **static**; opt into freshness deliberately. Decision:

| Content kind | Posture | How |
|---|---|---|
| Owned, build-time (marketing pages) | **SSG** | default; `export const dynamic = "force-static"` to assert it |
| External / CMS-backed | **ISR** | `export const revalidate = N` + on-demand `revalidatePath` |
| Genuinely per-request | **SSR / dynamic** | `export const dynamic = "force-dynamic"`, or `await cookies()` / `await headers()` (async — await them) |

**Full rendering + SEO contract:** [ADR-NEXT-S07](adr/ADR-NEXT-S07-rendering-performance-seo.md) — static-first posture, the `post.seo` seam on the S04 content contract, source adapters, progressive loading.

Dynamic route segments enumerate their params at build:

```ts
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await loadPosts()
  return posts.map((p) => ({ slug: p.slug }))
}
export const revalidate = 3600   // ISR for new/edited posts
```

---

## Routing, metadata & boundaries

- **Routes are file-based folders** under `src/app/`; add a route = add a folder + `page.tsx`.
- **Metadata** via `generateMetadata` (dynamic) or a static `metadata` export; set `metadataBase` in the root layout.
- **Boundaries are files**, not wrappers: `loading.tsx` (Suspense fallback), `error.tsx` (`"use client"` error boundary), `not-found.tsx` (404). One per route segment as needed. Full error contract — containment layers, expected-vs-uncaught, islands: [ADR-NEXT-S09](adr/ADR-NEXT-S09-error-handling.md).

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = await loadPost((await params).slug)
  return post ? { title: post.title, description: post.excerpt } : {}
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await loadPost((await params).slug)
  if (!post) notFound()                    // → renders not-found.tsx
  return <Article post={post} />
}
```

---

## File-based content (MDX)

Content lives under `content/`, read by a `src/lib/` loader — never inlined in routes:

```ts
// lib/content/mdx.ts — the loader behind the content contract
import { readFile, readdir } from "node:fs/promises"
import matter from "gray-matter"

export async function getAllPosts(): Promise<Post[]> {
  const files = await readdir("content/blog")
  const posts = await Promise.all(files.map(async (f) => {
    const { data, content } = matter(await readFile(`content/blog/${f}`, "utf8"))
    return { slug: f.replace(/\.mdx$/, ""), ...data, body: content } as Post
  }))
  return posts.sort((a, b) => +new Date(b.date) - +new Date(a.date))
}
```

Keep the loader behind the **service-module contract** (ADR-NEXT-S04) so a CMS adapter can replace MDX without touching callers.

---

## Data & State Decision Tree

1. **Server data** → fetch in a Server Component / `server/` module; dedup with `cache()`.
2. **Mutations** → Server Actions (or route handlers) + Zod.
3. **URL-driven state** (filters, tabs, pagination) → `searchParams` — async (`await` in Server Components; unwrap with `use()` in Client Components).
4. **Local interactivity** (single client component) → `"use client"` + `useState` / `useReducer`.
5. **Cross-component client state** → lift to a client provider **only when shared**; no global store by default.

**Rule:** never reach for a global client store (Zustand/Redux) for data the server already has — server data flows down as props from RSC.

**Full client-state contract** — provider tiers, server-seeding, theme without hydration mismatch, provider-vs-error-boundary placement: [ADR-NEXT-S08](adr/ADR-NEXT-S08-client-shared-state.md).

---

## Hook patterns

Client hooks are `"use client"` and live in `features/<name>/hooks/`.

### DOM-measurement effects use callback refs

Attaching a `ResizeObserver` / `IntersectionObserver` (or any DOM-attach-time wiring) to an element that may render **conditionally** — behind `loading.tsx`, a Suspense boundary, an `if`/`else` — needs a `useCallback` ref, not `useRef + useEffect`:

```ts
// ✗ Wrong: empty deps + early return → observer silently never attaches
//   when the ref element renders after the first effect run.
const ref = useRef<HTMLDivElement | null>(null)
useEffect(() => {
  if (!ref.current) return            // null on first run; never retries
  const obs = new ResizeObserver(/* … */)
  obs.observe(ref.current)
  return () => obs.disconnect()
}, [])

// ✓ Right: callback ref fires when the DOM attaches/detaches, regardless of state.
const obsRef = useRef<ResizeObserver | null>(null)
const ref = useCallback((el: HTMLDivElement | null) => {
  obsRef.current?.disconnect(); obsRef.current = null
  if (!el) return
  obsRef.current = new ResizeObserver(/* … */)
  obsRef.current.observe(el)
}, [])
```

**Why it's a footgun:** the `useEffect + empty deps` form fails only when the measured element renders *later* than first commit (after a Suspense/Skeleton). The symptom is invisible at the developer's viewport whenever the fallback value happens to match the real one — so it ships unnoticed. Use the callback ref for any conditionally-rendered measured node.

**React 19** lets a ref callback **return a cleanup function** — disconnect the observer there instead of tracking it in a module-scoped ref (the same ref-as-prop model that makes `forwardRef` unnecessary):

```ts
const ref = useCallback((el: HTMLDivElement | null) => {
  if (!el) return
  const obs = new ResizeObserver(/* … */)
  obs.observe(el)
  return () => obs.disconnect()      // React 19: ref-callback cleanup — runs on detach/unmount
}, [])
```

---

## Import order

```typescript
// 1. React / framework
import { cache } from "react"
// 2. External packages
import { z } from "zod"
// 3. Project aliases (@/ — alphabetical by path)
import { getAllPosts } from "@/lib/content"
import type { Post } from "@/features/blog/types/post.types"
// 4. Feature-local (relative within own feature)
import { PostCard } from "./PostCard"
```

- Path alias `@/*` → `src/*`. Cross-directory imports use `@/`; within a feature use relative.
- Never use `../../` to reach another feature, `lib`, or route folder.

---

## Named constants over literals

Numeric or string knobs that recur across the codebase live as named exports, not inline literals — recurring literals are under-noticed sites of drift (three call sites type the same value, one gets edited, the rest silently diverge).

**Rule:** if a literal appears at more than one call site **and** means *the same idea* at each, give it a named export. Litmus: *if the value changed, would I update more than one file?* Yes → extract; no → leave inline.

- YES: `REVALIDATE_SECONDS = 3600` shared by every ISR route → one export.
- YES: Status enum tuples (`POST_STATUSES`) in `types.ts`, consumed by schema + UI.
- NOT: `setTimeout(fn, 200)` once in a single component → keep inline; not recurring.

Applies equally to magic strings — error keys, env-var names, route prefixes.

---

## Forbidden practices

- **No competing styling systems** — pick one styling layer and keep it singular; never add a second CSS framework alongside it.
- **No data fetching in client components** — fetch on the server, pass props.
- **No business logic in components** — extract to hooks or feature `server/` logic.
- **No direct external-API calls in components** — go through a service module / contract (ADR-NEXT-S04).
- **No `new Date()` / `Math.random()` in render** — effects only (hydration mismatch).
- **No nested ternaries in JSX** — extract to variables or early returns.
- **No `any`** — use `unknown` and narrow.
- **No `../../` across features** — use `@/`.
- **No root-level dump-all `types.ts`** — types belong in the owning feature.
- **No commits without explicit user request.**

---

## Testing

Vitest for unit tests, co-located with source (`<name>.test.ts`) — add the first tests alongside the first non-trivial pure function or service contract (e.g. the MDX loader's frontmatter parsing, a CMS contract adapter). Prefer testing **pure functions and service contracts** over rendering.

```ts
// lib/content/mdx.test.ts
import { describe, it, expect } from "vitest"
import { parseFrontmatter } from "./mdx"

describe("parseFrontmatter", () => {
  it("extracts title + date", () => {
    expect(parseFrontmatter("---\ntitle: Hi\n---\n").title).toBe("Hi")
  })
})
```

---

## Quality gates

Before marking a task complete, pass the `applies-to: any` gates in
[`qa/feature-qa-checklist.md`](qa/feature-qa-checklist.md):

```bash
make pre-commit    # R-GATE-LINT → R-GATE-TYPECHECK → R-GATE-BUILD, fails closed
```

`make` is the command facade (→ `package.json` scripts); never inline a package-manager command in the docs. Concrete commands live in the `Makefile`.

---

## References

- [`adr/ADR-NEXT-S01-repository-structure.md`](adr/ADR-NEXT-S01-repository-structure.md) — repo layout / where code goes / RSC boundary
- [`adr/ADR-NEXT-S02-frontend-stack.md`](adr/ADR-NEXT-S02-frontend-stack.md) — framework, validation, styling policy, data/state tree
- [`adr/ADR-NEXT-S03-feature-structure.md`](adr/ADR-NEXT-S03-feature-structure.md) — feature anatomy along the RSC / client boundary
- [`adr/ADR-NEXT-S04-pure-service-modules.md`](adr/ADR-NEXT-S04-pure-service-modules.md) — external systems behind a contract
- [`adr/ADR-NEXT-S05-dependency-injection.md`](adr/ADR-NEXT-S05-dependency-injection.md) — cross-feature wiring via a `Deps` interface
- [`adr/ADR-NEXT-S06-deployment.md`](adr/ADR-NEXT-S06-deployment.md) — build / container / CI gates / env seam / ISR runtime
- [`adr/ADR-NEXT-S07-rendering-performance-seo.md`](adr/ADR-NEXT-S07-rendering-performance-seo.md) — rendering posture (SSG/ISR/dynamic) + contract-driven SEO seam
- [`adr/ADR-NEXT-S08-client-shared-state.md`](adr/ADR-NEXT-S08-client-shared-state.md) — client-state tiers, server-seeded providers, theme without hydration mismatch
- [`vision.md`](vision.md) — architecture overview

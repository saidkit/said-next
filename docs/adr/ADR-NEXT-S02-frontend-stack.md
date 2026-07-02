# ADR-NEXT-S02: Frontend Stack

**Date:** 2026-06-27
**Status:** Accepted
**Class:** System (portable across Next.js SSR web projects)

> This ADR governs the **nextjs** layer's runtime stack: framework, language, validation, styling-layer policy, build output, and — above all — *where data and state live*. It does **not** pick a design system; the styling layer is the project's choice (Rule 4). Repo layout is [ADR-NEXT-S01](ADR-NEXT-S01-repository-structure.md); feature internals are ADR-NEXT-S03.

## Problem

A Next.js SSR web app needs one settled answer for its frontend runtime — framework, language, validation, styling-layer policy, build output, and most of all *where data and state live* — so capabilities land the same way every time and the server/client boundary is never improvised per feature. Without it, teams reach for SPA reflexes (a client query cache, a global store, client-side routing) that fight the grain of React Server Components and ship JavaScript the server already rendered.

**Context:**
- App Router + React Server Components by default; server runtime (`output: "standalone"`).
- AI-native development — TypeScript-first, Zod-validated boundaries; an agent needs ONE data-placement tree, not a per-library state matrix.
- Backend-agnostic — external systems (a CMS, etc.) sit behind a service-module seam (ADR-NEXT-S04), not baked into the stack.
- Styling-layer-agnostic — the stack fixes everything *except* the design system, which each project picks for itself.

## Decision

Next.js 16 (App Router) + React 19.2 (Server + Client Components) + TypeScript (strict) + Zod + ESLint (flat config), built with the Next CLI (Turbopack, the default bundler) to `output: "standalone"`, with file-based MDX content and optional headless CMS integration, internal commands run through `make`.

No global client store, no client query cache, no client-side router: RSC fetches on the server, Server Actions mutate, `searchParams` carries URL state.

**Why:** one runtime, one mental model. Data is fetched where it is rendered (the server), so there is no client/server cache to reconcile and far less to wire. Each tool has a single responsibility and they compose without overlap; everything beyond the core is added only when a feature needs it.

## Stack

### Core (always present)

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | File-based routing, RSC, server runtime, SSR/standalone |
| UI runtime | React 19.2 (Server + Client Components) | Server-first rendering; client islands only at the edges |
| Language | TypeScript (strict) | Compile-time safety; `any` forbidden — narrow `unknown` |
| Validation | Zod | Runtime + compile-time types at every untrusted boundary |
| Styling | One explicit styling layer (project's choice) | Tailwind, a vendored DS, CSS Modules… — exactly one, never two (Rule 4) |
| Content | File-based MDX under `content/` | Read by a `src/lib/` loader, never inlined in routes |
| Lint | ESLint (flat config) | `eslint.config.mjs` — single lint authority |
| Build / Dev | Next CLI (Turbopack — default), `output: "standalone"` | Self-contained server build; container-deployable |
| Task runner | `make` | One entry point wrapping dev/build/lint/typecheck/pre-commit |

### Optional additions (add only when a feature needs it)

| Concern | Choice | When |
|---|---|---|
| Headless CMS | A provider adapter behind a pure service module (`src/lib/<cms>/`) | Content comes from an external CMS — swap MDX ↔ CMS without touching routes (ADR-NEXT-S04) |
| Testing | Vitest (unit) / Playwright (e2e) | A non-trivial pure function, service contract, or critical flow needs regression cover |
| Client state | A client provider / state library | State is genuinely shared across the client tree and Context + `useState` no longer suffice (data tree §5) |
| URL-state helper | nuqs | Many typed query params need syncing and raw `searchParams` parsing gets heavy |

## Rules

1. **RSC by default; `"use client"` only at the edges.** A component is a Server Component unless it needs event handlers, stateful hooks (`useState`/`useEffect`), browser APIs, or a client-only library — then push the `"use client"` boundary to the leaf. Presentational sections and design-system primitives stay on the server (ADR-NEXT-S01 Rule 3).
2. **Fetch on the server; never fetch from a client component.** Async Server Components and feature `server/` logic resolve data and pass it down as props; client components *receive* props. Dedup repeated reads within a request with React `cache()`.
3. **Validate every untrusted boundary with Zod.** Server Action input, external/CMS responses, route params, and `process.env` are parsed through a schema before use; derive types from the schema (`z.infer`) rather than hand-maintaining a parallel type.
4. **Exactly one styling layer, chosen by the project.** Pick Tailwind, a vendored design system, or CSS Modules — *one* — and never run two competing systems (specificity wars + drift). This ADR fixes the runtime, not the design system; the project records its choice and applies it in `globals.css` + the root layout.
5. **One path alias: `@/*` → `src/*`.** Cross-directory imports use `@/`; relative imports only within a route/feature folder; never `../../` across the tree. Next reads the alias from `tsconfig.json` natively — no bundler alias config needed.
6. **Build to `output: "standalone"` via the Next CLI (Turbopack is the default bundler).** The build is a self-contained Node server (container-deployable), not a static export; routes that can be static still prerender, but standalone is the server posture.
7. **Content is file-based and loaded through `src/lib/`.** MDX lives under `content/`, read by a loader module — never inlined in routes. An external CMS is an *adapter behind the same seam* (ADR-NEXT-S04), not a second content path bolted onto routes.
8. **Commands run through `make`.** `make dev` · `make build` · `make lint` · `make typecheck` · `make pre-commit` (= lint + typecheck + build). Agents and CI call these, not raw package-manager invocations; the runner is the stable contract over the underlying CLI.
9. **Add beyond the core only on need.** A test runner, a client-state library, nuqs, or a CMS adapter enters when a feature requires it (see Optional additions) — never preinstalled "just in case."

## Where data and state live (the RSC data tree)

The SPA "decide which store owns this" question is replaced by "*where in the request does this belong*". In order:

1. **Server data** (anything fetched/read — CMS, files, a DB) → fetch in a **Server Component or a feature `server/` module**; dedup within the request with React `cache()`. No client fetch, no client cache.
2. **Mutations** (writes, form submits) → a **Server Action**, with its input parsed by **Zod** at the action boundary; revalidate with `revalidatePath` / `revalidateTag`. (A route handler is the alternative when a non-form HTTP endpoint is needed.)
3. **URL state** (filters, pagination, tabs, active item) → **`searchParams`** read in the Server Component — shareable, bookmarkable, and reload-surviving for free. Reach for **nuqs** only when typed multi-param sync gets heavy.
4. **Local interactivity** (open/closed, hover, input focus, one widget's state) → **`"use client"` + `useState`/`useReducer`** at the leaf component.
5. **Cross-component client state** (genuinely shared across the client tree) → a **client provider (Context)**, added *only* when sharing is real. **No global store by default.**

**Rule:** don't pull server data into client state. The server already has it — pass it as props; `cache()` dedups within the request. There is no client query cache to keep in sync, by design.

```ts
// a feature server/ loader — fetched on the server, deduped per request, passed as props
import { cache } from "react";
export const loadItems = cache(async () => getAllItems());
```

## Root layout (providers)

`src/app/layout.tsx` is the single root layout: `<html>` / `<body>`, fonts → CSS vars, `metadata`, JSON-LD, and the styling-layer import. **It is a Server Component and needs no providers by default** — there is no client query cache and no client router to mount (the App Router *is* the router; the server *is* the data layer).

```tsx
// src/app/layout.tsx — minimal by default; RSC needs no providers
export const metadata = { /* … */ };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Add a provider **only** when data tree §5 is real — a `"use client"` component wrapping `{children}` for genuinely-shared client state. Do **not** add a data-fetching/query provider (servers fetch + `cache()`) or a router provider (file-based routing). This is the deliberate replacement for the SPA's nested query-cache + router provider stack: none of those mount here, and there is no separate client bootstrap/entry module — the root layout *is* the app shell. Service resolution does **not** happen here either: routes/features receive concrete services from factories resolved at the **route/server boundary** (ADR-NEXT-S05), not from a global composition root.

## Alternatives considered

| Option | Verdict |
|--------|---------|
| Next.js 16 App Router + RSC, server-first (chosen) | **Chosen** — one runtime, file routing, data fetched where rendered, SSR/standalone, least to wire |
| Vite + React SPA with a client query cache + global store | **Rejected** — client-only data layer, no SSR, duplicate server+client cache; fights the grain of RSC |
| Next.js Pages Router | Rejected — no RSC; `getServerSideProps` / `getStaticProps` split; App Router is the forward path |
| A global client store by default | Rejected — RSC + `searchParams` + Server Actions cover the common cases; a client store is opt-in only when state is genuinely shared (data tree §5) |
| Two styling systems in one app | Rejected — exactly one styling layer; competing systems cause specificity wars and drift (Rule 4) |
| Static export (`output: "export"`) as the default | Rejected — Server Actions + per-request RSC assume a Node server; standalone is the posture (Rule 6) |

## Consequences

**Positive:**
- One mental model: server-first, data fetched where it's rendered; no client/server cache to reconcile.
- Less to wire: no global store, no client query cache, no router provider — RSC + `searchParams` + Server Actions cover the common cases.
- Type-safe boundaries: Zod validates every untrusted edge, and types derive from schemas rather than parallel hand-maintained shapes.
- `output: "standalone"` yields a self-contained server build that deploys as a container.
- Exactly one styling layer keeps visuals unambiguous and the ADR portable (it doesn't bind a design system).
- An agent learns a single data-placement tree, not a multi-library state matrix — targeted context, fewer wrong reaches.

**Negative:**
- The server/client boundary is a real discipline — `"use client"` placement and "don't fetch on the client" must be enforced by review (and ADR-NEXT-S01).
- RSC + Server Actions assume a Node server (standalone) — a static-only host needs rework.
- Fewer batteries than an opinionated SPA kit: forms, tables, and client state are added per-need, not preinstalled (intentional — see Optional additions).
- Turbopack is the default bundler; teams with webpack-specific config must opt out via `--webpack` or migrate it.

## Related

- **Source:** said-web ADR-NEXT-S02 (Vite + React SPA frontend stack) — re-cast to this Next.js 16 RSC stack.
- **Repository structure:** [ADR-NEXT-S01](ADR-NEXT-S01-repository-structure.md) — where the stack's code lives (`src/app/`, `src/features/`, `src/lib/`).
- **Feature internals:** ADR-NEXT-S03 (feature structure) — the anatomy of `src/features/<name>/` the stack composes.
- **Service modules:** [ADR-NEXT-S04](ADR-NEXT-S04-pure-service-modules.md) — external systems (a CMS, …) behind a contract; the optional-CMS seam.
- **Dependency injection:** ADR-NEXT-S05 — how routes/features receive services (day-one).
- **Conventions:** [`../conventions.md`](../conventions.md) — full how-to (RSC boundary, import order, naming, data patterns).
- **Vision:** [`../vision.md`](../vision.md) — the stack at a glance + optional layers.

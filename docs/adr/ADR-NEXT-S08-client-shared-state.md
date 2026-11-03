# ADR-NEXT-S08: Client & shared state (Next.js SSR)

**Date:** 2026-06-29
**Status:** Accepted
**Class:** System (portable across Next.js SSR web projects)

> Adapted from the said-web ADR-NEXT-S02 client-state posture — a Vite + React SPA pairing **TanStack Query** (server state in a client cache) with **Zustand** (a global client store) — re-cast to the App Router, where most client state evaporates: RSC fetches on the server, `searchParams` carries URL state, Server Actions mutate. It elaborates tier 5 (*Cross-component client state*) of [ADR-NEXT-S02](ADR-NEXT-S02-frontend-stack.md) and deepens [ADR-NEXT-S03](ADR-NEXT-S03-feature-structure.md)'s "no `store/`" — the genuinely-client residue (interaction/UI state, theme, session-for-UI) and how each provider coexists with RSC. Vendor choices (auth protocol, store library) are the instance's; this template fixes only *where the residue lives and how it is seeded*.

## Problem

Under a server-first App Router the SPA question "which client store owns this?" mostly dissolves — server data flows down as props, URL state lives in `searchParams`, writes are Server Actions. But a real **residue** remains: a disclosure flag, a theme toggle, the display slice of a session, cross-cutting preferences. Without a settled tier order and seeding contract it drifts two ways, both against the grain of RSC.

- **SPA reflexes creep back.** A team reaches for a global store or a client query cache "for consistency," re-introducing a client data layer that mirrors server data the server already rendered — the duplicate cache RSC exists to remove.
- **Providers break the server tree.** A provider in `layout.tsx` turns the root into a client component; reads `window`/`localStorage` in render (hydration mismatch); fetches its own initial data; is server-seeded in the *root* (`await cookies()`/`headers()`), opting the whole route tree into dynamic rendering; or throws where only `global-error.tsx` — rendering *without* provider context — can catch it.

**Context:**
- App Router + RSC by default; `layout.tsx` is a Server Component with no providers by default (ADR-NEXT-S02 *Root layout*) — no client query cache, no client router to mount.
- The data tree (ADR-NEXT-S02 §*Where data and state live*) resolves tiers 1–4; this ADR owns tier 5 and its "no global store by default" rule.
- The root layout renders in *every* route, so any dynamic API there (`await cookies()`/`headers()`, async in Next 16) makes the whole site dynamic. Theme is not per-request (S07 Rule 3 reserves dynamic for auth/personalization); session is — so theme stays static via a pre-hydration script while session's dynamic read is scoped to its own segment.
- A throw in a root-layout provider escapes every `error.tsx`; only `global-error.tsx` catches it, re-declaring `<html>`/`<body>` with no provider context (ADR-NEXT-S09 layer 3).

## Decision

**RSC shrinks client state to a residue (interaction/UI state plus a few cross-cutting concerns — theme, session-for-UI); manage it by escalating the smallest sharing scope that works — local → URL → a scoped Client Context provider (only when sharing is real) → a client store library (last resort) — with no global store by default and no client data cache. Providers are `"use client"` islands: static-safe ones (theme) nest inside the Server *root* layout and stay SSG; per-request server-seeded ones (session) live in their own dynamic route segment, never the root.**

### Rules

1. **Escalate the smallest sharing scope that works.** local `useState`/`useReducer` → URL `searchParams`/nuqs (shareable, reload-surviving) → a scoped **Client Context** provider (real cross-subtree sharing) → a client store library (last resort). Move up only when the lower scope cannot express the sharing; record the tier in the provider's `silencio` comment and the feature spec. (conventions.md *Data & State Decision Tree*.)
2. **No global store by default; never mirror server data into client state.** A provider holds UI/shared-interaction state plus server-seeded values — never a cache of server data (data flows down as props; `cache()` dedups per request). A store library is the tier-5 last resort, admitted *only* when a scoped Context provider is measurably insufficient: (a) high-frequency updates cause consumer re-render storms memoization can't contain, (b) state must be read/written outside the React tree, or (c) N independent slices with distinct cadences would need N nested providers. Else Context is the ceiling. (ADR-NEXT-S02 *No global store*; ADR-NEXT-S03 "no `store/`".)
3. **Providers are `"use client"` islands — static-safe at the root, dynamic in a dynamic segment.** Keep `layout.tsx` a Server Component. Compose static-safe providers in one root `"use client"` boundary — theme, and any *purely-client pref* (persisted client-side only, no server authority — reduced-motion, density) following the Rule 5 contract; no dynamic API, so the root stays SSG (ADR-NEXT-S07 Rule 1). Any provider server-seeded from a per-request read (`await cookies()`/`getSessionView()`) is composed in the *dynamic route-segment* `layout.tsx` that owns the read — never the root, or the whole site turns dynamic. Order outermost = most widely read; tiebreak by dependency.
4. **Seed from the server; never fetch initial data on the client.** A server-seeded provider's initial value (session, server-owned prefs) is read on the server (`await cookies()`/`headers()`) and passed as props; the client provider *receives* the seed and never fetches to populate itself. Mutations/refresh route through Server Actions (or route handlers), not a client fetch layer. Theme is the carve-out — seeded by the pre-hydration script from its cookie (Rule 5), no render-time server read. (conventions.md "Never fetch in a client component"; ADR-NEXT-S06 seam.)
5. **Seed theme without a render-phase DOM read and without breaking SSG.** Set the `<html>` class from a blocking pre-hydration `<script>` in `<head>` that reads the `theme` cookie, falls back to `matchMedia("(prefers-color-scheme: dark)")`, and defaults to `"light"` — the class is correct before first paint (no FOUC) for returning and first-time visitors, with no `await cookies()` in the root (SSG preserved). Add `suppressHydrationWarning` to `<html>` (the script, not React, owns the class). The client provider is **mount-gated**: `useState` starts at the server-matching default (`"light"`) so the first client render equals SSR, then a mounting `useEffect` reads the applied class and syncs it — never reading `window`/`matchMedia`/`localStorage`/`document` during render; a toggle persists to the cookie for the script's next load. This is the contract for *any* static-safe root provider whose visible state derives from a persisted cookie/localStorage value: pre-hydration script + `suppressHydrationWarning` + mount-gate. A pref with server authority is *not* static-safe — route it through the server-seeded segment (Rules 4/6). (conventions.md *RSC boundary* :119/:343 — no `window`/`document` in render.)
6. **Auth/session is server-owned, client-seeded — in its dynamic segment.** The session is established and verified on the server (middleware / Server Actions / route handlers); the client provider carries only what the UI needs — display name, role flags, an `authenticated` boolean — seeded as props from the dynamic segment layout (Rule 3), not the root. Token refresh and secret access stay server-side; a client hook never imports `server/` and never reads secrets. (ADR-NEXT-S03 Rule 5.)
7. **Provider placement respects the error model.** A provider is *failing-capable* if its render body (or a synchronous initializer) can throw, does async/suspending work, or dereferences a possibly-undefined seed. A throw in a *root-layout* provider is caught only by `global-error.tsx` (ADR-NEXT-S09 layer 3), which renders *without* provider context — no segment `error.tsx` wraps a root-composed provider (those boundaries live inside `{children}`, below the providers). So keep root providers non-failing (seeded synchronously from props, no throwing/async in render). For `error.tsx` coverage, relocate a failing-capable provider into a nested segment `layout.tsx` whose `error.tsx` wraps it; otherwise contain it with a component-level boundary (ADR-NEXT-S09 layer 4, `unstable_catchError`).
8. **Client hooks live in the feature; cross-cutting providers live shared.** Feature-local client state is a `"use client"` hook in `features/<name>/hooks/` (own state/effects, `use*` prefix, no server imports). A provider read across features is cross-cutting UI infrastructure and lives in `src/components/` (or `src/app/` for root/segment composition) — never inside one feature. (ADR-NEXT-S03 *File naming*; conventions.md *Hook patterns*.)

### Worked examples

```ts
// src/app/theme-script.ts — blocking, pre-hydration; sets the class before paint (no FOUC, no server read)
export const themeScript = `(function(){try{
  var m = document.cookie.match(/(?:^|; )theme=(dark|light)/);
  var t = m ? m[1] : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.className = t;
} catch (e) { document.documentElement.className = "light"; }})()`
```

```tsx
// src/app/layout.tsx — Server Component, NO dynamic reads → stays SSG (ADR-NEXT-S07 Rule 1)
import { themeScript } from "./theme-script"
import { ThemeProvider } from "@/components/theme/ThemeProvider"   // static-safe "use client" island

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>          {/* class owned by the script, not React */}
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><ThemeProvider>{children}</ThemeProvider></body>   {/* more providers: outermost = most widely read */}
    </html>
  )
}
```

```tsx
// src/app/(app)/layout.tsx — DYNAMIC segment; server-seeds session HERE, not the root (marketing/ISR stay static)
import { SessionProvider } from "@/components/session/SessionProvider"
import { getSessionView } from "@/lib/auth/session"   // server-only seam (ADR-NEXT-S06); UI-safe view, no secrets

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionView()               // reads cookies → per-request dynamic (ADR-NEXT-S07 Rule 3)
  return <SessionProvider initial={session}>{children}</SessionProvider>
}
```

```tsx
// src/components/theme/ThemeProvider.tsx — mount-gated; NEVER reads the DOM in render (Rule 5)
"use client"
import { createContext, useContext, useEffect, useState } from "react"
import type { Theme } from "./theme.types"

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")   // first render "light" server AND client → matches SSR
  useEffect(() => {                                          // theme already VISIBLE via the script; sync post-hydration
    setThemeState(document.documentElement.className === "dark" ? "dark" : "light")
  }, [])
  function setTheme(t: Theme) {                              // handler, not render — DOM access safe here
    document.cookie = `theme=${t}; path=/; max-age=31536000` // persist for the script's next load
    document.documentElement.className = t
    setThemeState(t)
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)!
```

## Out of scope

- The concrete auth vendor/protocol (session provider, token format, middleware) — this ADR fixes *server-owned, client-seeded*, not the vendor.
- The concrete client store library — picked only when **Rule 2's tier-5 trigger is met**, recorded as a per-project decision.

## Alternatives considered

- **Chosen** - **Tiered residue: local → URL → Context → store, server-seeded; theme via pre-hydration script + mount-gated provider**
  - minimal client JS; escalates only on real need; theme correct before first paint with SSG preserved and no hydration mismatch; session server-seeded only in its dynamic segment; clean line between residue and server data
- Rejected - **Server-seed theme via `await cookies()` in the root layout**
  - the root renders in every route, so this opts the whole site (static marketing routes, ISR blog routes) into dynamic rendering (ADR-NEXT-S07 Rule 1); theme is not per-request, and a pre-hydration script gets the same no-flash result statically
- Rejected - **A global client store (Zustand/Redux) by default**
  - RSC + `searchParams` + Server Actions cover the common cases; a global store is unjustified SSR weight and invites mirroring server data; enters only when Rule 2's tier-5 trigger fires
- Rejected - **A client query cache (TanStack Query) by default**
  - no client data cache under RSC; opt in *only* for genuinely client-owned remote state (a third-party polling widget), never the site's own content
- Rejected - **Context for everything, including server data** 
  - server data flows down as props from RSC; Context recreates a client cache to keep in sync
- Rejected - **Read theme/prefs from `window`/`document`/`localStorage` at render (or a DOM-reading `useState` initializer)**
  - the server has no DOM; a render-phase read diverges from SSR at hydration. Use a pre-hydration script + mount-gated provider (Rule 5)

## Consequences

**Positive:**
- Minimal client JavaScript — the residue is small and the server ships what it already rendered.
- Genuinely-shared client state works through one sanctioned provider boundary rather than ad-hoc stores; a store library has a concrete, reviewable admission test (Rule 2).
- No flash *and* no hydration mismatch: the pre-hydration script sets the theme class before paint, the mount-gated provider's first render matches SSR (Rule 5), and the root stays SSG.
- A clear, reviewable line between client residue and server data — "is this in Context?" has a rule-driven answer.

**Negative:**
- Requires review discipline: server-seed every per-request provider, no client fetch for initial data, no server-data-in-Context, no dynamic API in the root, no DOM read in render.
- A mount-gated theme value is `"light"` for the first client render even when the visible class is `"dark"`; UI branching on `theme` (not CSS) resolves one paint later. The *visible* theme is never wrong (it's CSS-driven off the script-set class) — the accepted cost of guaranteed-clean hydration.
- `global-error.tsx` renders without provider context (accepted) — the root fallback must be self-sufficient and root providers must stay non-failing (Rule 7).
- Session is genuinely per-request, so its server-seed makes *its dynamic segment* dynamic (accepted per ADR-NEXT-S07 Rule 3), deliberately scoped to `(app)` so static/ISR routes are unaffected.
- Theme carries a small blocking inline `<script>` and needs `suppressHydrationWarning` on `<html>` — the accepted cost of keeping theme static and flash-free.

## Related

- **Source:** said-web ADR-NEXT-S02 (Vite + React SPA — TanStack Query for server state + Zustand for client state), re-cast to RSC where most client state evaporates. No direct said-ts sibling — S08 is the free S-slot (said-ts stops at S05; S06 = deploy, S07 = rendering) anchored on the said-ts S-number line for cross-project consistency.
- **Elaborates:** [ADR-NEXT-S02](ADR-NEXT-S02-frontend-stack.md) — deepens tier 5 (*Cross-component client state*) of its data tree and its "no global store by default" root-layout rule; does not restate the tree.
- **Feature structure:** [ADR-NEXT-S03](ADR-NEXT-S03-feature-structure.md) — "no `store/`", where client hooks (`hooks/`) versus shared providers (`@/components`) live, `<name>.types.ts` naming, the hook/`server/` separation (Rules 6/8).
- **Error model:** [ADR-NEXT-S09](ADR-NEXT-S09-error-handling.md) — provider-in-root vs boundary placement; why root-layout providers must be non-failing and which boundary catches them (Rule 7).
- **Rendering posture:** [ADR-NEXT-S07](ADR-NEXT-S07-rendering-performance-seo.md) — a root-layout `cookies()`/`headers()` read forces the whole site dynamic (Rule 1); theme is kept static via the pre-hydration script and session's per-request read is scoped to its dynamic segment (Rule 3).
- **Service seam:** [ADR-NEXT-S06](ADR-NEXT-S06-pure-service-modules.md) — the server-only session/auth module a provider is seeded from (Rules 4/6).
- **Conventions:** [`../conventions.md`](../conventions.md) — *Data & State Decision Tree*, RSC boundary and hydration rules (:119/:343), `<name>.types.ts` file naming, *Hook patterns*.

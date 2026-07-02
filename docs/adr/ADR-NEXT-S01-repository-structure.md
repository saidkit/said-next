# ADR-NEXT-S01: Repository Structure (Next.js SSR)

**Date:** 2026-06-23
**Status:** Accepted
**Class:** System (portable across Next.js SSR web projects)

## Problem

A Next.js (App Router) SSR website needs a predictable internal organization so that features land in the same places every time, server/client boundaries are obvious, and context loading stays targeted. Without a canonical layout, route code, shared UI, utilities, external-API access, and styling drift into ad-hoc locations.

**Context:**
- App Router + React Server Components by default; server runtime (`output: standalone`).
- Single app (not a monorepo) — but external integrations (CMS, etc.) still need a seam.
- Optimised for both humans and LLMs finding code by convention.

## Decision

**A single Next.js app with a conventional `src/` layout. Routes compose components; shared logic lives in `src/lib/`; external systems sit behind pure service modules; the design system is the styling layer.**

### Canonical layout

```
project/
├── src/
│   ├── app/                      # App Router — ROUTES ONLY (thin entry points)
│   │   ├── layout.tsx            # root layout: fonts→CSS vars, metadata, JSON-LD
│   │   ├── page.tsx              # thin: resolves deps, calls a feature + shared components
│   │   ├── globals.css           # global rules + styling-layer imports + token overrides
│   │   └── <route>/              # one folder per route
│   │       ├── page.tsx          # route entry (RSC) — resolves deps, calls feature(s)
│   │       └── [slug]/           # dynamic segment (generateStaticParams)
│   ├── features/                 # FEATURE MODULES — where capability lives (see ADR-NEXT-S03)
│   │   └── <name>/               # e.g. blog/, booking/: components, hooks, server/, <name>.types.ts
│   ├── components/               # shared, cross-feature UI primitives
│   │   └── ds/                   # design-system primitives (RSC-safe)
│   ├── lib/                      # shared utilities + pure service modules (import as @/lib/*)
│   │   └── <service>/            # external-system wrapper (e.g. cms/) — see ADR-NEXT-S04
│   └── ds/                       # vendored design system (CSS) — the styling layer
├── content/                      # file-based content (e.g. MDX) read at build/request
├── public/                       # static assets
├── next.config.ts                # output: "standalone"; build via turbopack
├── tsconfig.json                 # strict; "@/*" → src/*
├── eslint.config.mjs             # flat config
└── dockerfile                    # standalone container build
```

### Rules

1. **A page composes; it doesn't implement.** 
  - `page.tsx` is a thin entry point — it resolves dependencies (services via factories, ADR-NEXT-S04/S05) and calls a **feature** (`src/features/<name>/`) plus shared `src/components/`. 
  - Markup, state, and data logic live in the feature, never inline in the page.
2. **Features are the unit of implementation.** 
  - A cohesive capability (blog, booking, concierge, …) lives in `src/features/<name>/` and owns its components, hooks, server logic, and types — see ADR-NEXT-S03. 
  - **Routes call features.** Use route groups `(group)/` only when a subtree needs its own layout/isolation.
3. **RSC by default; `"use client"` only at the edges** - (handlers, hooks, browser APIs).
   - Presentational sections and `components/ds` primitives stay server components.
4. **External systems behind pure service modules in `src/lib/<service>/`** 
  - never scatter raw fetch/SDK calls across routes/UI. The module is the swappable seam (e.g. a CMS client behind a contract). See ADR-NEXT-S04.
5. **`src/lib/` is domain-agnostic-to-app utilities + services.** 
  - UI imports from it via `@/lib/*`; `src/lib/` never imports from `src/app/`.
6. **Styling layer is explicit.** 
  - The design system (vendored CSS in `src/ds/` + rules in `globals.css`) owns visuals; no second CSS framework competing with it.
7. **Content is file-based** under `content/`, read by a `src/lib/` loader — not inlined
   in routes. Static assets in `public/`.
8. **Imports:** 
  - `@/` alias for `src/*`; 
  - relative imports only within a route/feature folder. 
  - No `../../` reaching across the tree.

### Dependency direction

```
app/<route>/page.tsx  →  features/<name>/*  →  lib/* (utils, services)  →  external (CMS, …)
                      ↘   components/* (shared UI)   ↗
```

Lower layers never import upward. **Features never import another feature's internals** - share via `components/`, `lib/`, or dependency injection (ADR-NEXT-S05). Routes stay sideways-independent; cross-feature code goes up into `components/`/`lib/`.

## Out of scope (project concerns, not this system ADR)

- The **multi-stage repo** (any outer layout the consuming project wraps this in) - project-specific; owned by the consuming project.
- **Rendering/perf posture** (SSG-first, ISR-for-CMS) - see ADR-NEXT-S07.
- **Feature internals** - see ADR-NEXT-S03 (feature structure). **Wiring / DI** — see ADR-NEXT-S05.
- **External-service wrapper internals** — see ADR-NEXT-S04 (pure service modules).

## Alternatives considered

1. Thin `app/` routes + `src/features/` (logic) + shared `components/`/`lib/` (chosen) 
  - **Chosen** — routes stay thin; features are reusable + testable
2. "Route is the feature" — logic inside `app/<route>/` 
  - Rejected — pages accrete logic; no reuse across routes; hard to test
3. Flat `app/` with no `features/`/`components/`/`lib/` split
  - Rejected — everything in routes; no seams
4. Monorepo (`apps/*` + `packages/*`)
  - Rejected — single web app; no second consumer to justify the overhead

## Consequences

**Positive:** predictable locations for humans + LLMs; clean RSC/client split; one swappable seam per external system; styling layer unambiguous; targeted context loading.

**Negative:** more folders than a flat app; discipline required to keep raw API calls out of routes (enforced by ADR-NEXT-S04 + code review).

## Related

- **Source:** `said-ts` ADR-NEXT-S01 (monorepo structure), ADR-NEXT-S03 (feature structure).
- **Instance:** the consuming project realizes this layout via its feature specs (`docs/features/`), which also choose the styling layer.
- **Feature internals:** ADR-NEXT-S03 (feature structure) — the anatomy of `src/features/<name>/`.
- **Service modules:** [ADR-NEXT-S04](ADR-NEXT-S04-pure-service-modules.md) (pure service modules) — the `src/lib/<service>/` seam.
- **Dependency injection:** ADR-NEXT-S05 — how routes/features receive services (day-one).
- **Conventions:** `../conventions.md`.

# Technical Architecture

## System Design

Next.js (App Router) SSR web app with feature-based architecture, designed for AI-native development. React Server Components by default; client interactivity only at the edges. Composable: stacks into any backend project as the `web/` directory, or stands alone.

## Technology Stack

- **Framework**: Next.js 16 — App Router, React Server Components, Turbopack (`output: "standalone"`)
- **UI runtime**: React 19.2 (Server + Client Components)
- **Language**: TypeScript (strict)
- **Styling**: a single explicit styling layer — the project's choice (Tailwind, a vendored DS, CSS Modules…); never two
- **Content**: file-based MDX under `content/`, read by a `src/lib/` loader
- **Validation**: Zod (runtime + compile-time)
- **Lint**: ESLint (flat config)
- **Build / Dev**: Next CLI (Turbopack)

## Optional Layers (add as needed)

- **Headless CMS**: external content source behind a pure service module (`src/lib/<cms>/`) — swap MDX ↔ CMS without touching routes
- **Rendering posture**: SSG-first; ISR for CMS-backed routes; SSR where genuinely dynamic
- **Forms / mutations**: Server Actions (or route handlers) + Zod
- **Client state**: local `useState` / `useReducer` or URL `searchParams` — no global store by default
- **Testing**: Vitest / Playwright (add when the app needs it)

## Core Principles

- **Type Safety**: End-to-end types from Zod schemas
- **Feature-Based**: Each capability is self-contained in `features/<name>/`; routes compose features
- **RSC by default**: Data fetching on the server; `"use client"` only at the edges (handlers, hooks, browser APIs)
- **Service-module seam**: External systems sit behind pure modules in `src/lib/<service>/` — the one swappable boundary
- **Styling layer is explicit**: one owned CSS / design-token layer; no second framework competing with it
- **Composability**: Stacks into any backend; zero coupling to backend internals

## Architecture Decisions

See `docs/adr/` for detailed architectural decisions.

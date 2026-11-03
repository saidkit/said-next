# ADR-NEXT-S10: Deployment (Next.js SSR)

**Date:** 2026-06-29
**Status:** Accepted
**Class:** System (portable across Next.js SSR web projects)

> Patterns (GitHub CI builds the image, the host pulls + runs) are portable across Next.js SSR projects: it fixes *how an app ships to production*, not *where* — the concrete host / orchestrator (Dokploy, K8s, Fly, Vercel) is a project choice (Out of scope), and the freshness posture (which route is SSG vs ISR) stays owned by S07 and is only *delivered* here.

## Problem

A Next.js SSR app must decide how it turns source into a running production process — what artifact ships, who builds it, and how configuration and content freshness reach it — before every project improvises its own pipeline. Two failure modes recur.

- **Build coupled to runtime.** Building on the host makes the artifact non-reproducible (it depends on the box's toolchain), ties build capacity to serving capacity, and turns rollback into a rebuild rather than a re-point.
- **Freshness via redeploy.** Treating a content edit as a code change forces a rebuild + redeploy for every CMS update — slow, and it couples editorial cadence to the deploy pipeline instead of the framework's revalidation primitives.

**Context:**
- `output: "standalone"` produces a self-contained Node server (a minimal `server.js` + traced dependencies), container-deployable, not a static bundle (ADR-NEXT-S02 Rule 6).
- Next 16 / Turbopack build; the runtime is a Node process (≥20.9), so `next/image` optimization, ISR, and Server Actions all run — none of which a static export can serve. `next/image` depends on sharp, whose musl/Alpine binary must be provisioned (`libc6-compat`) or optimization throws at request time.
- The freshness contract (static-by-default, ISR-for-CMS, `revalidatePath`/`revalidateTag`) is owned by ADR-NEXT-S07; deployment only has to give it a runtime with a writable/shared incremental cache.
- Configuration reaches code through the S04 service-module seam and a validated `process.env`, along a strict build-vs-runtime seam: `NEXT_PUBLIC_*` is inlined into the client bundle at build time and must be environment-invariant; runtime secrets and env-varying config load — and validate once — at container start, not at build.

## Decision

**Ship a containerized Node server built from `output: "standalone"`, produced by CI (never on the host) and gated fail-closed through `make`; runtime config is validated at boot, and content freshness is ISR / on-demand revalidation, never a redeploy.**

### Rules

1. **Standalone server, not static export.** `next.config` sets `output: "standalone"` so the build emits a self-contained Node server that a container runs; routes that can prerender still do (SSG/ISR per S07), but the deploy target is a server, not a CDN-only static tree. (ADR-NEXT-S02 Rule 6; S07 rejects `output: "export"`.)
2. **Build in CI, run as a container.** CI builds a multi-stage image (`deps` → `builder` → `runner`), copies the standalone output into a slim Node Alpine runner (floor **≥20.9**; the example pins `node:22-alpine`), runs as a **non-root** user, listens on `HOSTNAME=0.0.0.0` and caller-overridable `PORT` (default `3000`; `EXPOSE` is documentation-only), and provisions sharp's musl runtime (`libc6-compat`) so `next/image` works on Alpine. The image carries a `HEALTHCHECK` that probes a **dedicated cheap liveness route (`/api/health`, no CMS I/O) on the runtime `PORT`** — so a `docker run -e PORT=…` override stays healthy and a CMS/upstream hiccup can't restart-loop a live process — or delegates readiness/liveness to the orchestrator (Out of scope). CI pushes to a registry; the host **pulls and runs** that image — it never builds on the box. (CI is the single build authority.)
3. **Gates fail-closed through `make`; the gated build is the shipped artifact.** CI runs `make lint` (R-GATE-LINT) and `make typecheck` (R-GATE-TYPECHECK), then builds the image — and **R-GATE-BUILD (`make build`) runs *inside* the builder stage**, so there is exactly one build and it *is* the artifact that ships (never a second raw `next build`, no double build). `make` is the command facade with **no exemption**: the frozen dependency install goes through a `make deps` verb (→ `pnpm install --frozen-lockfile`, the reproducibility contract), not a raw `pnpm` call in the Dockerfile; and because the facade must stay authoritative in-container, **both the `deps` and `builder` stages install `make`** (the `deps` stage also copies the `Makefile` so `make deps` resolves). A red gate blocks the image; there is no "deploy anyway." (conventions.md *Quality gates*; ADR-NEXT-S02 Rule 8.)
4. **Env validated at the boundary, split by build-vs-runtime, and fail-fast at boot.** `process.env` is parsed through Zod (ADR-NEXT-S02 Rule 3), along a strict seam:
   - **Runtime** secrets/config (`CMS_URL`, `REVALIDATE_SECRET`, `SITE_URL`) arrive as container env at *start* and are **absent during `make build`** — so they are validated **once at process startup, in Next's `instrumentation.ts` `register()` hook**, behind `import 'server-only'`. A top-level module parse is rejected: it would evaluate during R-GATE-BUILD, when the secrets are absent. `register()` runs *after* container start but *before* the server accepts traffic, so a missing/malformed runtime secret **crashes boot** — the container never becomes healthy and never takes a request — instead of throwing deep in an RSC render through the S09 per-request boundary (reserved for data/render failures, not fatal deploy misconfiguration).
   - Build-time **`NEXT_PUBLIC_*`** values are inlined into the client bundle and must be **environment-invariant** (an app name, a feature flag). Anything that varies per environment — the site URL most of all — is a *runtime* value read server-side and passed down as props, **never baked** via `ARG`.
   - Env access stays **inside** service modules (ADR-NEXT-S06), not scattered through routes.
5. **`outputFileTracingIncludes` captures runtime assets.** Any non-JS file the app reads at request time — e.g. `content/**` MDX — is listed in `outputFileTracingIncludes` so the standalone tracer copies it into the image; otherwise the file-based loader 404s at runtime while working locally.
6. **Freshness = ISR / on-demand revalidation, not redeploy.** A content change flows through `export const revalidate = N` plus on-demand `revalidatePath` / `revalidateTag` webhooks (owned by S07), so an editorial edit never triggers a rebuild. The Node runtime this ADR ships is what lets `next/image` optimization and ISR run at all; the rendering/performance knobs stay owned by S07 — do not re-decide the posture here.
7. **One image, runtime config only (12-factor).** The **same** production image runs across every environment; behavior differs by **runtime-injected** env vars, not per-environment builds — promotion is re-pointing a tag, not rebuilding. This holds *only* because no env-varying value is baked into the client bundle (Rule 4). **Tagging:** each build is an immutable `:$SHA`; an environment is a moving pointer (e.g. `:staging`, `:prod`) re-pointed at a `:$SHA` to promote or roll back.
8. **ISR needs a writable / shared incremental cache.** The runtime writes revalidated pages to `.next/cache`, so the runner stage **creates and `chown`s `.next/cache` to the non-root user** — a purely ephemeral or read-only filesystem loses the incremental cache and ISR silently degrades. For **multi-replica** deploys, configure a shared `cacheHandler` (Redis / S3-backed) via `next.config` so replicas share one cache. The concrete store is a project choice (Out of scope); its *necessity* under multi-replica is not.

### Build & ship — worked examples

```ts
// next.config.ts — Rules 1, 5
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",                       // S06-R1 — self-contained Node server
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],                // S06-R5 — MDX read at request time
  },
  // S06-R8 — multi-replica ISR adds a shared cacheHandler here
}
export default nextConfig
```

```dockerfile
# Dockerfile — CI builds this; the host only pulls + runs (Rules 2, 3)
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat make        # S06-R2/R3 — sharp musl + in-container facade
COPY Makefile package.json pnpm-lock.yaml ./
RUN corepack enable && make deps                # S06-R3 — facade verb → frozen install

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && apk add --no-cache make  # S06-R3 — facade must exist in-container
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN make build                                  # S06-R3/R7 — R-GATE-BUILD; the gated build IS the artifact

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat             # S06-R2 — sharp at request time
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next/cache   # S06-R8 — writable ISR cache
USER nextjs                                     # S06-R2 — never root
EXPOSE 3000                                     # docs-only; server binds $PORT
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1  # S06-R2
CMD ["node", "server.js"]
```

```ts
// src/instrumentation.ts — validate runtime env ONCE at boot, before serving (Rule 4)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { serverEnv } = await import("@/lib/env")
    serverEnv()  // S06-R4 — bad runtime config crashes boot, not a request
  }
}
```

```ts
// src/lib/env.ts — RUNTIME config: server-only, parsed at startup, not during `make build` (Rule 4)
import "server-only"
import { z } from "zod"

const ServerEnv = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  SITE_URL: z.string().url(),                   // env-varying → runtime, never baked
  CMS_URL: z.string().url(),
  REVALIDATE_SECRET: z.string().min(1),         // on-demand revalidation auth (S07)
})

let cached: z.infer<typeof ServerEnv> | undefined
export const serverEnv = () => (cached ??= ServerEnv.parse(process.env))  // S06-R4 — memoized; first call is register()
```

The remaining pieces follow the same rules and are elided for brevity: the `make deps` verb (`pnpm install --frozen-lockfile`) in the Makefile (Rule 3); the `/api/health` route — `export const dynamic = "force-dynamic"` + `GET = () => new Response("ok")`, liveness with no CMS I/O (Rule 2); the CI workflow — runner-side `make deps` / `lint` / `typecheck` gates, then `docker build`/`push` of an immutable `:$SHA`, with runtime secrets injected at `docker run` (Rules 2, 3, 7); and the build-time `env.client.ts` — a small Zod parse of environment-invariant `NEXT_PUBLIC_*` constants only (Rules 4, 7).

## Out of scope

- The concrete host / orchestrator (Dokploy, K8s, Fly, Vercel…) and its provisioning, ingress, TLS, secret store, and readiness/liveness probing — a project choice layered on this container.
- The multi-replica incremental-cache store (Redis / S3 `cacheHandler`) — Rule 8 mandates *a* shared cache when replicas > 1; the concrete backend is a project choice.
- Consuming-project dev-sandbox constraints (restricted registry, operator-run installs) — repo-specific (root `CLAUDE.md`), not a portable deployment decision.
- The rendering / caching / SEO posture (which route is static vs ISR, revalidation wiring) — owned by ADR-NEXT-S07; this ADR only gives it a runtime.

## Alternatives considered

- **Chosen** - **Containerized standalone built in CI**
  - portable, reproducible artifact; CI is the single build authority; a Node runtime serves ISR / Server Actions / image optimization
- Rejected - **Build on the host / VPS**
  - slow, non-reproducible (depends on the box's toolchain), couples build to runtime capacity, makes rollback a rebuild
- Rejected - **Static export (`output: "export"`)**
  - no ISR, Server Actions, or on-demand revalidation; CMS content can't refresh without a full rebuild
- Rejected - **Baking env-varying `NEXT_PUBLIC_*` per environment**
  - freezes the site URL etc. into the client bundle, breaking one-image promotion; env-varying values stay runtime-resolved (Rules 4, 7)
- Rejected - **Validating runtime env lazily at first request (or eagerly at module top-level)**
  - top-level parse throws during R-GATE-BUILD (secrets absent); lazy-at-request surfaces a fatal misconfig through the S09 boundary and can pass a `/`-only healthcheck while every data route 500s. `instrumentation.ts` fails fast at boot instead (Rule 4)
- Rejected - **`HEALTHCHECK` on `/`**
  - `/` is SSR/ISR and can depend on the CMS, so an upstream outage restart-loops a healthy process; probe a CMS-free `/api/health` on the runtime `PORT` (Rule 2)
- Rejected as default - **Serverless / edge-only runtime**
  - standalone Node is the portable default; edge is opt-in per-route / middleware where a genuine need exists
- Rejected as default - **Platform-managed (e.g. Vercel) as the assumed target**
  - the template stays host-agnostic / container-first; a managed platform is an opt-in project choice

## Consequences

**Positive:**
- The production artifact is a portable, reproducible container — the same image runs in every environment, promotion is re-pointing a tag, and rollback is re-pointing it back.
- CI is the single build authority and R-GATE-BUILD runs inside the image, so the gated build *is* the shipped artifact — a red gate cannot reach production and there is no double build to drift.
- Fatal misconfiguration fails fast at boot via `instrumentation.ts`, so a broken deploy (e.g. `CMS_URL` unset) never becomes healthy and never takes traffic — not a silently-green container serving request-time 500s.
- Content freshness is decoupled from deploys — an editorial edit revalidates via S07 primitives, never triggering a rebuild.

**Negative:**
- Requires a Node host (a static CDN alone is insufficient) — there is a running process to operate and observe (hence the `HEALTHCHECK` / delegated probe).
- The liveness probe deliberately targets a CMS-free `/api/health` on the runtime `PORT`, so it reports process liveness, not content readiness; app-vs-data failures are absorbed by ISR-stale serving + the S09 boundary, not by the healthcheck.
- ISR requires a writable `.next/cache` (single-replica, chowned in the runner) or a shared `cacheHandler` (multi-replica) — Rule 8; a purely ephemeral filesystem is unsupported for ISR.
- The build/runtime env seam is a real discipline: runtime secrets must stay server-only and validated at boot, and env-varying values must not become `NEXT_PUBLIC_*`, or the one-image invariant breaks — enforced by review.
- The image build is a CI dependency: no green pipeline, no deploy.

## Related

- **Standalone build & facade:** [ADR-NEXT-S02](ADR-NEXT-S02-frontend-stack.md) — `output: "standalone"` as the server posture (Rule 6) and `make` as the command facade (Rule 8).
- **Freshness / ISR runtime:** [ADR-NEXT-S07](ADR-NEXT-S07-rendering-performance-seo.md) — the SSG / ISR / revalidation posture this container runs; do not re-decide it here.
- **Error model:** [ADR-NEXT-S09](ADR-NEXT-S09-error-handling.md) — the per-request boundary (`error.tsx`) is for data/render failures; fatal config errors fail at boot (Rule 4), not through it.
- **Env inside modules:** [ADR-NEXT-S06](ADR-NEXT-S06-pure-service-modules.md) — env access lives in the service module, not routes; [ADR-NEXT-S02](ADR-NEXT-S02-frontend-stack.md) Rule 3 — `process.env` validated with Zod at the boundary.
- **Layout / config files:** [ADR-NEXT-S01](ADR-NEXT-S01-repository-structure.md) — where `next.config`, `Dockerfile`, `instrumentation.ts`, and `content/` sit.
- **Conventions:** [`../conventions.md`](../conventions.md) (*Quality gates* — `make pre-commit` fails closed; the command facade — the frozen install is a `make deps` verb, never an inline package-manager command).

# ADR-NEXT-S05: Dependency Injection

**Date:** 2026-06-27
**Status:** Accepted
**Class:** System (portable across Next.js SSR web projects)

> In RSC, DI is **light** — most features take only their own service/config; a `Deps` interface is reserved for genuine cross-feature needs. This ADR is the *how* behind [ADR-NEXT-S01](ADR-NEXT-S01-repository-structure.md)'s "features never import another feature's internals," and the injected-services half of [ADR-NEXT-S06](ADR-NEXT-S06-pure-service-modules.md).

## Problem

A Next.js App Router app is built from many features (`src/features/<name>/`), and a few of them genuinely need a capability another feature owns — a digest reads recent posts; a search page indexes content from several features. When a feature reaches directly into another's service or `server/` module, the two couple: the dependency direction breaks (ADR-NEXT-S01), neither feature can be tested in isolation, and swapping an implementation ripples across consumers.

The server-style answer — a single composition root that wires every feature up front — does not exist in App Router. There is no `index.ts` / `app.ts`; routes are the entry points and are evaluated per request. And in an RSC app *most* features need nothing from other features, so a heavyweight DI container would be ceremony for a problem most features don't have.

**Context:**
- RSC by default; routes (`src/app/<route>/page.tsx`) are the per-request entry points — the natural composition seam (ADR-NEXT-S01: "a page composes; it doesn't implement").
- A feature's own service / external client is resolved via a factory (ADR-NEXT-S06), not held as a cross-feature singleton.
- Features must stay sideways-independent (ADR-NEXT-S01) and unit-testable without a route, a request, or the network.
- Cross-feature needs are the exception, not the rule — the mechanism must stay near-zero-cost when absent.

## Decision

**There is no single composition root. The composition point is the route (`src/app/<route>/page.tsx`) or a feature's `server/` wiring module — the one place that imports more than one feature's services. A feature's server logic declares the cross-feature functions it needs as a `Deps` interface, co-located with the factory; the composition point wires concrete implementations; tests wire mocks. In RSC this is light: most features take only their own service/config and never declare `Deps` at all.**

The mechanics live as numbered rules below; full how-to (the `server/` boundary, cross-feature import rules, Vitest) is in [conventions.md](../conventions.md). This ADR records the decision and its boundaries, not a tutorial.

## Rules

1. **RSC DI is light — default to the feature's own service/config.** Most features need nothing from another feature: their `server/` logic takes only its own service (resolved via the ADR-NEXT-S06 factory) and/or `config`, and passes data down as props. Do NOT add a `Deps` interface "for consistency." Reach for one ONLY when a feature genuinely needs a function that another feature owns.

2. **Declare `Deps` in the factory file, next to the factory — not in `types/`.** When a feature's server logic does need cross-feature functions, it declares a `Deps` interface co-located with the factory in its `server/` module. `Deps` is this feature's *consumption contract* (what it needs from elsewhere), not a shared domain type, so it does not belong in the feature's `types/`.

   ```ts
   // src/features/digest/server/digest.ts
   import { cache } from "react";
   import type { PostSummary } from "@/features/posts/types";    // cross-feature TYPE — allowed
   import type { EventSummary } from "@/features/events/types";   // cross-feature TYPE — allowed
   import type { DigestService } from "./digest-service";

   // Genuine cross-feature needs — co-located with the factory, NOT in types/.
   export interface DigestDeps {
     getRecentPosts: (since: Date) => Promise<PostSummary[]>;   // owned by features/posts
     getUpcomingEvents: () => Promise<EventSummary[]>;          // owned by features/events
     track: (event: string) => Promise<void>;                  // not built yet — stub (Rule 5)
   }

   export function createDigestLoader(service: DigestService, deps: DigestDeps) {
     return cache(async () => {
       const [posts, events] = await Promise.all([
         deps.getRecentPosts(service.since()),
         deps.getUpcomingEvents(),
       ]);
       await deps.track("digest.view");
       return service.assemble(posts, events);
     });
   }
   ```

3. **Wire concrete implementations at the composition point.** The route (or a feature `server/` wiring module) is the ONLY place that imports more than one feature's services. It resolves each feature's own service via that feature's factory, then injects the cross-feature functions into the consumer's factory. The consumer never imports the producer.

   ```tsx
   // src/app/digest/page.tsx — the composition point (imports >1 feature's services)
   import { createPostsService } from "@/features/posts";    // cross-feature service — via its public surface (index.ts)
   import { createEventsService } from "@/features/events";  // cross-feature service — via its public surface (index.ts)
   import { createDigestService } from "@/features/digest/server/digest-service";  // route's own feature — server module
   import { createDigestLoader } from "@/features/digest/server/digest";           // route's own feature — server module

   export default async function DigestPage() {
     const posts = createPostsService();
     const events = createEventsService();

     const loadDigest = createDigestLoader(createDigestService(), {
       getRecentPosts: posts.getRecent,
       getUpcomingEvents: events.getUpcoming,
       track: async () => {},   // stub — analytics feature not built yet (Rule 5)
     });

     return <DigestView digest={await loadDigest()} />;
   }
   ```

   (Factory-style services that return a plain method object — not classes — let you pass `posts.getRecent` without `.bind`.)

4. **Test with mock deps typed via `Parameters<typeof factory>[1]`.** Call the factory with mocked deps — no route, no request, no network. Type the mock object as `Parameters<typeof createDigestLoader>[1]` so TypeScript enforces that every dep is supplied; build the functions with Vitest `vi.fn()`. Run with `make test`.

   ```ts
   // src/features/digest/server/digest.test.ts
   import { vi, it, expect } from "vitest";
   import { createDigestLoader } from "./digest";
   import { createDigestService } from "./digest-service";

   function mockDeps(): Parameters<typeof createDigestLoader>[1] {
     return {
       getRecentPosts: vi.fn(async () => [makePost("p-1")]),
       getUpcomingEvents: vi.fn(async () => []),
       track: vi.fn(async () => {}),
     };
   }

   it("assembles a digest from injected sources", async () => {
     const loadDigest = createDigestLoader(createDigestService(), mockDeps());
     const digest = await loadDigest();
     expect(digest.items).toHaveLength(1);
   });
   ```

5. **Stub a missing dep as an inline no-op at the composition point.** When a needed capability doesn't exist yet, satisfy its slot with a typed no-op *at the composition point* — never a placeholder module or a feature flag. The consumer's factory and its tests already depend on the `Deps` signature, not the implementation, so they don't change.

   ```ts
   track: async () => {},   // no-op — delete + import when features/analytics ships
   ```

   When the real feature ships: delete the stub, inject the real function. Zero changes to the consumer.

6. **Know when NOT to use DI.** (a) **No cross-feature deps** → skip `Deps`; pass the feature's own service/config (Rule 1). (b) **A domain-agnostic utility in `src/lib/*`** (formatting, error helpers, a shared pure function) → import it directly; a shared util is not a cross-feature dependency. (c) **An external-system client** → resolve it via its ADR-NEXT-S06 factory at the composition point and inject the *contract*; don't `new` an adapter inside feature logic.

7. **Cross-feature imports: types yes, services/server modules no.** A feature's server logic may import another feature's `types/` (type-only) — `Deps` signatures lean on those. It may NOT import another feature's service or `server/` module; that dependency flows through `Deps` and is wired at the composition point.

   ```
   A feature's server logic may import:   own service/config · own types · @/lib/* · another feature's types/ (type-only)
   A feature's server logic may NOT import: another feature's service or server/ module → inject via Deps instead
   The composition point (route / server wiring) may import: multiple features' services — the one place that may
   ```

## DO / DON'T

**DO**
- Pass the feature's own service/config when there are no cross-feature deps
- Declare `Deps` in the feature's `server/` factory file
- Wire everything at the composition point (route / `server/` module)
- Inject another feature's function via `Deps`
- Type mocks as `Parameters<typeof factory>[1]`
- Use Vitest `vi.fn()` for assertable deps
- Stub a missing dep as an inline no-op at the composition point
- Import another feature's `types/` (type-only)
- Resolve external clients via the ADR-NEXT-S06 factory and inject the contract

**DON'T**
- Don't add an empty/placeholder `Deps` "for consistency"
- Don't put `Deps` in the feature's `types/`
- Don't import another feature's service or `server/` module from feature logic
- Don't reach across features with a deep import
- Don't hand-type mock objects
- Don't build a mock framework / render a route to test logic
- Don't use a feature flag or placeholder module
- Don't import another feature's service / `server/` (use DI)
- Don't `new` a provider adapter inside feature logic

## Alternatives considered

- Chosen: **Per-route / `server/` composition point + `Deps` only for real cross-feature needs**
  - matches RSC's "route composes" model; keeps most features dependency-free; testable without a route/request
- Rejected: **A single composition root (`app.ts` / `container.ts`) wiring every feature up front**
  - no such entry exists in App Router; routes already are the composition seam; a central container fights per-request RSC resolution
- Rejected: **A DI container / service-locator library (decorators, reflection)**
  - runtime ceremony for what a function parameter already does; obscures the dependency graph
- Rejected: **Direct cross-feature imports (feature A imports feature B's service)**
  - couples features, breaks the dependency direction (ADR-NEXT-S01), defeats isolated testing
- Rejected: **Module-scope singletons shared across features** 
  - capture request state across requests in RSC; not injectable for tests

## Consequences

**Positive:** features stay isolated and individually testable (mock the deps — no route, request, or network); the dependency graph is explicit and visible at each composition point; the common case (no cross-feature deps) carries zero DI overhead; stubbing an unbuilt capability or swapping a provider is a one-line change at the seam; no container or framework to learn.

**Negative:** a cross-feature contract lives in two places (the `Deps` interface plus the wiring at each composition point that uses it); a function consumed by several routes is wired at each one (acceptable — explicit beats a hidden global); discipline is required to keep feature-to-feature service imports out — enforced by ADR-NEXT-S01's dependency direction and code review.

## Related

- **Source:** said-ts server ADR-S05 (dependency injection) — re-cast from a single MCP/Hono composition root to the Next RSC route / `server/` boundary.
- **Dependency direction:** [ADR-NEXT-S01](ADR-NEXT-S01-repository-structure.md) — declares "features never import another feature's internals"; this ADR is the *how* (inject via `Deps`, wire at the composition point).
- **Service modules:** [ADR-NEXT-S06](ADR-NEXT-S06-pure-service-modules.md) — external clients are resolved via their factory and injected as the contract (the same seam, for external systems).
- **Feature structure:** ADR-NEXT-S03 (feature anatomy — `server/`, `types/`; planned) — where `Deps` factories and feature services live.
- **Conventions:** [conventions.md](../conventions.md) — cross-feature import rules, the server/client boundary, and Vitest.

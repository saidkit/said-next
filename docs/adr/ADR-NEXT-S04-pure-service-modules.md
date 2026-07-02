# ADR-NEXT-S04: Pure Service Modules (external systems behind a contract)

**Date:** 2026-06-23
**Status:** Accepted
**Class:** System (portable across Next.js SSR web projects)

> Adapted from `said-ts` ADR-NEXT-S04 (pure service modules) — re-cast from Bun/Hono/MCP to Next.js RSC. Service modules are **consumed via dependency injection — see ADR-NEXT-S05** (a day-one citizen, not folded here). Governs `src/lib/<service>/` per [ADR-NEXT-S01](ADR-NEXT-S01-repository-structure.md).

## Rule

**When code talks to an external system** (a CMS, payment/email/analytics API, search index, object store) **— put it behind a pure service module in `src/lib/<service>/`:** a typed **contract**, one or more **provider adapters**, and a **factory**. Routes and components depend on the contract + factory, **never** on raw `fetch`/SDK calls or provider response shapes.

This is the seam the rest of the app is built against. It's what lets the provider change (or be mocked) without touching feature code.

## Directory structure

```
src/lib/<service>/
├── <service>-client.ts     # the CONTRACT — abstract class/interface + domain types
├── <provider>.ts           # an ADAPTER — implements the contract for one provider
├── create-<service>-client.ts  # the FACTORY — picks an adapter from env (the DI seam)
└── index.ts                # re-exports the contract + factory (the public surface)
```

Concrete instance for this project — the CMS wrapper (see NEXT-01):

```
src/lib/cms/
├── cms-client.ts           # CmsClient (abstract) + Cms.ContentItem/Category/Tag/…
├── wordpress.ts            # WordpressClient implements CmsClient  (wp-json REST)
├── create-cms-client.ts    # createCmsClient(type) — reads CMS_CLIENT env
└── index.ts
```

## The three parts

### 1. Contract (`<service>-client.ts`)

An `abstract class` (or interface) whose methods return **domain types owned by this module** — not provider shapes. This file has **no provider dependency**; it's pure types + signatures, so anything can implement it and consumers type against it.

### 2. Adapter (`<provider>.ts`)

A class that `implements` the contract for one provider. **All** provider-specific logic lives here: endpoint/SDK calls, query building, pagination, and the **mapping from provider response → domain type**. Provider response shapes never escape this file. There can be several adapters (e.g. `wordpress.ts`, `mdx.ts`).

### 3. Factory (`create-<service>-client.ts`) — the DI seam

A `create<Service>Client(type?)` function that selects an adapter from an env var via a tiny local registry/switch and returns it typed as the **contract**. This is the composition point: **consumers call the factory, never an adapter constructor.**

```ts
// src/lib/cms/create-cms-client.ts  (no @kit/* — a local map replaces @kit/shared/registry)
import type { CmsClient } from './cms-client';

const CMS_CLIENT = (process.env.CMS_CLIENT ?? 'wordpress') as 'wordpress' | 'mdx';

export async function createCmsClient(type = CMS_CLIENT): Promise<CmsClient> {
  switch (type) {
    case 'wordpress': {
      const { WordpressClient } = await import('./wordpress');
      return new WordpressClient(process.env.WORDPRESS_API_URL as string);
    }
    case 'mdx': {
      const { MdxClient } = await import('./mdx');
      return new MdxClient();
    }
    default:
      throw new Error(`Unknown CMS client: ${type}`);
  }
}
```

Dynamic `import()` keeps each adapter's deps out of bundles that don't use it.

## Conventions

- **Domain types in, domain types out.** Map at the adapter boundary; never leak provider JSON shapes (e.g. WP `rendered` fields) into routes/components.
- **Instantiate via the factory inside Server Components** (per request). No module-scope singletons that capture request state.
- **Env access stays inside the module** (the factory/adapter read `process.env.*`), not scattered through routes.
- **Errors are discriminated inside the module.** Check error *shape*, not message strings; expose a typed error or an optional fallback wrapper (`withFallback(op, fallback)`) rather than letting provider errors surface raw.
- **Route-level concerns stay at the route.** SEO `getHead`/Rank Math, caching (`revalidate`), and `revalidatePath` belong in the route, not the client (SEO is fetched at the route, not per-item).

## Dependency injection (see ADR-NEXT-S05)

Service modules are designed to be **injected, not imported as singletons** — DI is a day-one citizen (ADR-NEXT-S05). This ADR only states how a service *participates*:

- Consumers depend on the **contract**, never a concrete adapter. The **factory** (`create<Service>Client`) returns the contract; the route/feature boundary resolves it and passes it down. The wiring rules live in ADR-NEXT-S05.
- **Testing:** pass a mock that `implements` the contract — no network.
- No module-scope singletons that capture request state; instantiate per request.

## DO / DON'T

**DO**
- Put external calls in `src/lib/<service>/`
- Return domain types from the contract
- Select the provider in the factory via env
- Keep one adapter per provider
- Discriminate errors by shape inside the module
- Instantiate per request in RSC

**DON'T**
- Don't call `fetch('…/wp-json/…')` from a route/component
- Don't Leak provider response shapes outward
- Don't `new WordpressClient()` directly in a route
- Don't branch on provider inside feature code
- Don't catch by message string in consumers
- Don't hold a module-scope client with request state

## Worked example

The CMS wrapper in the repos library is the first instance: `CmsClient` contract, `WordpressClient` adapter (REST to `wp-json/wp/v2`, `_embed` media, `X-WP-Total` pagination, WP→`ContentItem` mapping), and `createCmsClient` factory. Acceptance: **zero `wp-json` strings outside `src/lib/cms/`.** 

## Consequences

**Positive:** one swappable seam per external system; provider changes/mocks don't touch feature code; testable without network; bundles stay lean via dynamic import.

**Negative:** a little ceremony (contract + adapter + factory) for a single provider — justified the moment a second provider, a mock, or a provider swap appears.

## Related

- **Source:** `said-ts` ADR-NEXT-S04 (pure service modules) + ADR-NEXT-S05 (dependency injection).
- **Dependency injection:** ADR-NEXT-S05 — services are injected, not imported (day-one).
- **Lives under:** ADR-NEXT-S01 (repository structure) — `src/lib/<service>/`.

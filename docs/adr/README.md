# Architecture Decision Records

Point-in-time records of **why** a non-obvious decision was made. ADRs are history, not live state — read the relevant one when working in that area; **don't preload all of them**, and verify against the actual code (an ADR may have been superseded).

All ADRs here are **System ADRs** (`ADR-NEXT-S0x`) — cross-cutting decisions
**portable across SAID Next.js projects** (repository anatomy, stack, patterns). This is a starter template, so it ships **no application ADRs**: project- and product-specific decisions live in **feature specs** (`docs/features/NEXT-0x-*.md`), not here.

## Quick Reference

| Load this | When you need to |
|-----------|------------------|
| [ADR-NEXT-S01](ADR-NEXT-S01-repository-structure.md) | Understand where code goes (Next.js SSR app layout) |
| [ADR-NEXT-S02](ADR-NEXT-S02-frontend-stack.md) | Choose / understand the frontend stack (Next 16, RSC, Zod, styling policy) |
| [ADR-NEXT-S03](ADR-NEXT-S03-feature-structure.md) | Lay out a feature's internals (components / hooks / server, RSC boundary) |
| [ADR-NEXT-S04](ADR-NEXT-S04-pure-service-modules.md) | Wrap an external system (CMS, scheduler) behind a contract |
| [ADR-NEXT-S05](ADR-NEXT-S05-dependency-injection.md) | Wire cross-feature deps (a `Deps` interface at the route/server composition point) |
| [ADR-NEXT-S06](ADR-NEXT-S06-deployment.md) | Build + ship to production (standalone container, CI-gated build, env seam, ISR runtime) |
| [ADR-NEXT-S07](ADR-NEXT-S07-rendering-performance-seo.md) | Choose a route's rendering (SSG / ISR / dynamic) + produce SEO from the content contract |
| [ADR-NEXT-S08](ADR-NEXT-S08-client-shared-state.md) | Manage genuinely-client state (theme, session-for-UI, providers) under RSC |
| [ADR-NEXT-S09](ADR-NEXT-S09-error-handling.md) | Handle failures (`error.tsx` / `not-found.tsx` / Server Action returns; the error-island model) |

## Index

| ADR | Topic | Status |
|-----|-------|--------|
| [ADR-NEXT-S01](ADR-NEXT-S01-repository-structure.md) | Repository structure (Next.js SSR app layout) | Accepted |
| [ADR-NEXT-S02](ADR-NEXT-S02-frontend-stack.md) | Frontend stack (Next 16 App Router, RSC, Zod, styling-layer policy) | Accepted |
| [ADR-NEXT-S03](ADR-NEXT-S03-feature-structure.md) | Feature structure (feature anatomy along the RSC / client boundary) | Accepted |
| [ADR-NEXT-S04](ADR-NEXT-S04-pure-service-modules.md) | Pure service modules (external systems behind a contract) | Accepted |
| [ADR-NEXT-S05](ADR-NEXT-S05-dependency-injection.md) | Dependency injection (`Deps` at the route / server composition point) | Accepted |
| [ADR-NEXT-S06](ADR-NEXT-S06-deployment.md) | Deployment (standalone container built in CI; fail-closed `make` gates; env boot-validation; ISR runtime) | Accepted |
| [ADR-NEXT-S07](ADR-NEXT-S07-rendering-performance-seo.md) | Rendering, performance & SEO (static-first; contract-driven SEO seam) | Accepted |
| [ADR-NEXT-S08](ADR-NEXT-S08-client-shared-state.md) | Client & shared state (residue-tiering; server-seeded providers; no global store, no client cache) | Accepted |
| [ADR-NEXT-S09](ADR-NEXT-S09-error-handling.md) | Error handling (RSC containment layers: `error.tsx` / `global-error` / `not-found`, expected-as-values) | Accepted |

## Relationships

- **ADR-NEXT-S01 is the structural spine.** S03 (feature internals), S04 (service modules), and S05 (dependency injection) each elaborate one seam of the S01 layout.
- **ADR-NEXT-S02 sets the stack** (framework, validation, styling policy) that the S01 layout assumes.
- **ADR-NEXT-S07 (rendering / perf / SEO)** layers the runtime posture over the S01 layout and reads the S04 content contract for SEO — sources swap behind adapters.
- **ADR-NEXT-S06 (deployment)** ships what S07 renders — the standalone container, CI-gated build, and ISR runtime; it *delivers* the S07 freshness posture, it doesn't re-decide it.
- **ADR-NEXT-S08 (client & shared state)** elaborates S02's data-tree tier 5 and reconciles client providers with S07 (static-by-default: theme stays SSG, session is scoped-dynamic) and S09 (provider vs error boundary).
- **ADR-NEXT-S09 (error handling)** spans the whole structure — containment layers across routes, features, and service seams.

## Roadmap (planned — not yet written)

The System ADR S-series is **anchored on said-ts** so the S-number → topic mapping
stays consistent across SAID projects: **S01** repository structure (done) · **S02**
frontend stack (done) · **S03** feature structure (done) · **S04** pure service modules
(done) · **S05** dependency injection (done) · **S06** deployment (done) · **S07** rendering /
performance / SEO (done) · **S08** client & shared state (done) · **S09** error handling (done).
Write each ADR when its area is first touched — don't preload the whole set.

## Naming

- **ADR-NEXT-S0x** = System ADR — cross-cutting, portable across SAID Next.js projects.
- Project- / product-specific decisions are **not** ADRs here — they live in feature specs (`docs/features/NEXT-0x-*.md`).

## Creating a new ADR

1. **Confirm it's cross-cutting.** System ADRs capture portable, multi-feature, hard-to-reverse decisions. A decision specific to one project's product/domain belongs in a **feature spec** (`docs/features/NEXT-0x-*.md`), not an ADR.
2. **Propose the next sequential number** in the S-series (`ADR-NEXT-S0x`) — anchored on the said-ts mapping above.
3. **Use [`template.md`](template.md).**
4. Create an ADR when the decision **affects multiple features or is hard to reverse**. Record the decision and its *why*; link the feature / working notes that drove it.
5. **Cross-reference** related ADRs in the Relationships section.
6. **After landing:** add a row to the Index (and Quick Reference) and update Relationships. Don't list an ADR file that doesn't exist (**no dangling pointers**).

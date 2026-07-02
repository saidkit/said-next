# Claude.md - said-nextjs Development Guide

## Project Overview
**Project**: said-nextjs — Next.js SSR + headless-CMS starter template
**Stack**: Next.js 16 App Router + React 19.2, TypeScript strict, single styling layer (project's choice), file-based MDX content, headless CMS
**Architecture**: thin App-Router routes (`src/app/`) compose features (`src/features/<name>/`) + shared components; RSC by default
**Composability**: stacks into any backend as the `web/` directory, or stands alone

## Quick Start

Start with **this file only**. Then load deeper context by task — see **Implementation References** (what to read before changing code) and **Context Loading** (what to load, when).

## Implementation References (Check BEFORE changing code)

| Creating / Changing... | Read first |
|------------------------|------------|
| ADR landscape (index, relationships, naming) | [`docs/adr/README.md`](docs/adr/README.md) |
| Repo structure / where code goes | [`docs/adr/ADR-NEXT-S01-repository-structure.md`](docs/adr/ADR-NEXT-S01-repository-structure.md) |
| Frontend stack (framework, validation, styling policy, data/state) | [`docs/adr/ADR-NEXT-S02-frontend-stack.md`](docs/adr/ADR-NEXT-S02-frontend-stack.md) |
| Feature internals (anatomy, naming, RSC boundary, imports) | [`docs/adr/ADR-NEXT-S03-feature-structure.md`](docs/adr/ADR-NEXT-S03-feature-structure.md) |
| External systems / service modules (CMS, API) | [`docs/adr/ADR-NEXT-S04-pure-service-modules.md`](docs/adr/ADR-NEXT-S04-pure-service-modules.md) |
| Cross-feature dependencies / wiring | [`docs/adr/ADR-NEXT-S05-dependency-injection.md`](docs/adr/ADR-NEXT-S05-dependency-injection.md) |
| Build / deploy / CI / env / container | [`docs/adr/ADR-NEXT-S06-deployment.md`](docs/adr/ADR-NEXT-S06-deployment.md) |
| Rendering / caching / SEO (SSG·ISR·dynamic, metadata) | [`docs/adr/ADR-NEXT-S07-rendering-performance-seo.md`](docs/adr/ADR-NEXT-S07-rendering-performance-seo.md) |
| Client & shared state (theme, session-for-UI, providers) | [`docs/adr/ADR-NEXT-S08-client-shared-state.md`](docs/adr/ADR-NEXT-S08-client-shared-state.md) |
| Error / loading / not-found boundaries | [`docs/adr/ADR-NEXT-S09-error-handling.md`](docs/adr/ADR-NEXT-S09-error-handling.md) |
| Coding conventions (how-to, code patterns) | [`docs/conventions.md`](docs/conventions.md) |
| Content / CMS integration (the copy-paste lib) | [`src/lib/cms/`](src/lib/cms) — `CmsClient` contract + MDX / WordPress adapters (ADR-NEXT-S04) |
| Screen UX shape / review gate | [`docs/ux/README.md`](docs/ux/README.md) + [`docs/qa/feature-ux-checklist.md`](docs/qa/feature-ux-checklist.md) |
| Architecture overview | [`docs/vision.md`](docs/vision.md) |
| Feature spec template | [`docs/features/template.md`](docs/features/template.md) |
| Editing a specific feature | `docs/features/NEXT-XX-name.md` |

## Context Loading Strategy

**Start light → add as needed → keep the working set lean (< ~50k tokens).**
When this starter is stacked under a root orchestrator, the root owns progressive loading — trim this to a pointer.

**1. Session start (always):** this guide.

**2. Add by task type:**
- Code review / understanding → `docs/conventions.md`
- Feature development → `docs/conventions.md` + `docs/features/NEXT-XX-name.md`
- New feature → `docs/conventions.md` + `docs/features/template.md` (+ `ADR-NEXT-S03`)
- Architecture → `docs/vision.md` + `docs/idea.md` + `docs/adr/`

**3. Load implementation files (only when editing):**
- Feature work → `src/features/<name>/`
- Routes / layout → `src/app/<route>/page.tsx` + `src/app/layout.tsx`
- Shared utils + service modules → `src/lib/`

## Navigation Map

| Type | Location | Load When |
|------|----------|-----------|
| Feature specs | `docs/features/NEXT-XX-name.md` | working on that feature |
| Routes (thin entry points) | `src/app/<route>/page.tsx` | adding / changing a route |
| Root layout / providers | `src/app/layout.tsx` | fonts, metadata, global providers |
| Feature modules | `src/features/<name>/` | building a feature |
| Feature components | `src/features/<name>/components/` | editing feature UI |
| Client hooks (`"use client"`) | `src/features/<name>/hooks/` | client state / interactivity |
| Shared cross-feature UI | `src/components/` | extracting shared UI |
| Shared utils + service modules | `src/lib/` (`@/lib/*`) | utils / external-system seam |
| Styling layer | `src/app/globals.css` + styling tokens / config | touching styling |
| File-based content | `content/` | adding / editing MDX |
| ADRs | `docs/adr/ADR-NEXT-*.md` | an architectural decision |

## Development Commands

Run via `make` (the `Makefile` maps each verb to a `package.json` script):

```bash
make dev          # Next.js dev server
make build        # Production build (standalone) — R-GATE-BUILD
make start        # Serve the production build
make lint         # R-GATE-LINT
make typecheck    # R-GATE-TYPECHECK
make pre-commit   # All gates (husky / CI entry point)
```

## Workflow Process
1. **Analyze** - Understand the task (load minimal context)
2. **Plan** - Propose implementation (add relevant context)
3. **Wait** - Get approval before coding
4. **Implement** - Follow `docs/conventions.md`
5. **Test** - Verify (`make dev` smoke + `make build`; unit tests where present)
6. **Update** - Update feature progress
7. **Commit** - Save to branch (only when asked)

## SAID workflow — the `said:` plugin

This template is the **docs spine** (`docs/conventions.md` · `docs/adr/` · `docs/features/` · `docs/working/`); the **`said:` plugin** drives the phases *over* that spine. Each command reads/writes the spine — invoke the phase you're in.

- **Triage** (find where a bug/behavior lives) → `/said:triage`
- **Phase 1 · Scope** → `/said:scope-refine` (from a handoff / current branch) or `/said:scope-grill` (ideate a thin idea) → writes `docs/working/<feature>/scope.md`
- **Phase 1.5 · Spec TOC** → `/said:uxtoc` (descriptive outline of a spec, for fast iteration)
- **Phase 2 · Architect** → `/said:architect` (`scope.md` → `docs/features/NEXT-XX-*.md` + `NEXT-XX.tasks.md`); `/said:add-task` to append a task discovered mid-flight
- **Phase 3 · Implement** → `/said:impl` (drive a task `Todo → Done` under TDD); `/said:review-ux` (per-task UX gate for web/UI)
- **Phase 3.5 · Verify** → `/said:review-qa` (quality gates + `### Fix` integrity) then `/said:accept` (acceptance-criteria contract)
- **Phase 4 · Debrief** → `/said:debrief` (feature retro; backport lessons into `docs/adr/` + `docs/conventions.md`)

The **Workflow Process** above is the lightweight per-change loop; the `said:` phases are the full feature lifecycle. Both land in the same spine.

## Core Principles
- **Context Efficiency** - Load only what you need
- **KISS** - Simple solutions over complex
- **MVP First** - Working version, then improve
- **Test Everything** - Untested code is broken code
- **Type Safety** - Zod for validation, TypeScript for compile-time
- **RSC by default** - data fetching on the server; `"use client"` only at the edges (handlers, hooks, browser APIs)

## Data & State Decision Tree

1. **Server data** → fetch in a Server Component (or route handler); dedup with `cache()`
2. **Mutations** → Server Actions (or route handlers) + Zod
3. **URL-driven state** (filters, tabs, pagination) → `searchParams`
4. **Local interactivity** (single client component) → `"use client"` + `useState` / `useReducer`
5. **Cross-component client state** → lift to a client provider only when shared; no global store by default

## Claude Code Reminders
- **Context Management**: Start with this guide only, add incrementally
- **File Loading**: Only load files you're actively editing
- **Quality Gates**: Run `make pre-commit` before marking complete
- **Commit Policy**: NEVER commit without explicit user request
- **Read First**: Always read files before editing them
- **Styling**: one explicit styling layer — pick it once (Tailwind, a vendored DS, CSS Modules…); never run a second competing framework
- **Diagrams**: Mermaid or nested outlines — NEVER ASCII art
- **Markdown**: one line per paragraph; bullets one line each; no hard-wrap; prefer lists over tables - use tables only when necessary

### Earned rules (one-liners — full context in linked ADR)
- **A page composes, it doesn't implement** — routes are thin entry points that call features + shared components → ADR-NEXT-S01
- **RSC by default** — `"use client"` only at the edges (handlers, hooks, browser APIs) → ADR-NEXT-S01
- **Static by default** — SSG for owned pages; ISR (`revalidate`) for external/CMS content; dynamic only per-request → ADR-NEXT-S07
- **SEO rides the content contract** — `post.seo` on the S04 contract; `generateMetadata` / `sitemap` read it, adapters fill it; no vendor SEO calls in routes → ADR-NEXT-S07
- **Ship a CI-built standalone container** — `output: "standalone"`; the gated `make build` inside the image is the shipped artifact; runtime env validated at boot; freshness = ISR, not redeploy → ADR-NEXT-S06
- **Client state is a server-seeded residue** — escalate local → URL → Context → store; no global store, no client data cache; providers are `"use client"` islands seeded from the server (theme via pre-hydration script stays SSG) → ADR-NEXT-S08
- **Service-module seam** — external systems (CMS, APIs) sit behind pure modules in `src/lib/<service>/`; no raw fetch/SDK calls scattered across routes/UI → ADR-NEXT-S04
- **Content is file-based** — read `content/` via a `src/lib/` loader, not inline in routes → ADR-NEXT-S01
- **One styling layer** — a single explicit styling layer (the project's choice); no second framework competing with it → ADR-NEXT-S01
- **Cross-feature wiring** — features never import another feature's internals; inject via a `Deps` interface at the route/server composition point → ADR-NEXT-S05
- **Errors: missing vs broken** — `notFound()` → `not-found.tsx` for expected; `throw` → `error.tsx` for unexpected; expected Server Action failures are returned, not thrown → ADR-NEXT-S09
- **Imports** — `@/` for `src/*`; relative only within a feature/route folder; `src/lib/` never imports from `src/app/` → ADR-NEXT-S01

## Task Log Rules (NEXT-XX.tasks.md)
Append-only historical records. Authoring discipline + close-of-task review live in [`docs/features/template-tasks.md`](docs/features/template-tasks.md) — canonical source. Read it before writing or closing any task entry.

Critical rules (full set in template-tasks.md):
- **NEVER overwrite or strip detail** from existing entries
- **New tasks get new IDs** appended at the end (no mid-task amendments)
- **`### Fix` = one verification line** + optional one-liners (spec edits, working artifacts) — never `**Files added:**` blocks; files are derivable from `git log --name-only`
- **When updating status**: change only `Status:` line; add/update `### Fix`, optionally `### Deviations` and `### Gotchas`

## Quality Gates

Before marking complete:
- [ ] `make lint` clean — R-GATE-LINT
- [ ] `make typecheck` clean — R-GATE-TYPECHECK
- [ ] `make build` succeeds — R-GATE-BUILD
- [ ] Feature / task log updated

`make pre-commit` runs all three (`.husky/pre-commit` + CI entry point). Rule defs: [`docs/qa/feature-qa-checklist.md`](docs/qa/feature-qa-checklist.md).

---

**Usage Philosophy**: Start minimal, expand thoughtfully, clean up regularly.

<!-- PROJECT-SPECIFIC SECTION — intentionally empty in the said-nextjs starter.
     A consuming app appends its Route Map / Design System / Key Files here
     (Model A: one file = template + project section). -->

# SAID-next - Structured AI Delivery for Next.js

AI-native **Next.js 16** starter: RSC-first, contract-driven content, ships as a standalone container. Self-contained - its own conventions, ADRs, scaffold, and AI development guide (`CLAUDE.md`).

## Quickstart

```bash
git clone <your-fork> said-next
cd said-next/web
make install
make dev # http://localhost:3000
```

Boots in **MDX mode** by default - the seed post in `web/content/blog/` renders through the CMS contract, no backend required. Point it at WordPress (below), same routes.

## What's included

### Documentation (`docs/`)
- **`CLAUDE.md`** - AI development guide (entry point for Claude Code)
- **`conventions.md`** - code patterns, the RSC boundary, import rules
- **`idea.md` / `vision.md`** - project context templates
- **`adr/ADR-NEXT-SXX`** - STARTER ADRs, provided by the starter (repo structure, stack, features, service modules, DI, deployment, rendering/SEO, client state, error handling)
- **`features/`, `ux/`, `qa/`** - feature-spec + task-log stencils, UX shape specs, quality-gate checklists

### The Next app (`web/`)
- **`src/app/`** - routes: home, blog index + `[slug]`, `sitemap`/`robots`, `api/health`, `error`/`not-found`/`loading` boundaries
- **`src/features/blog/`** - the reference feature: `server/` loaders (RSC + `cache()`), prop-driven components
- **`src/lib/cms/`** - the **content contract** + adapters (see below)
- **`src/lib/env.ts` + `src/instrumentation.ts`** - boot-time env validation (fail-fast, ADR-NEXT-S06)

### The CMS library (`web/src/lib/cms/`) - copy-paste into any derived project
A single `CmsClient` contract with swappable adapters (ADR-NEXT-S04):

- `cms-client.ts` - the contract + domain types (`Post`, `Seo`, …). No provider dependency.
- `mdx.ts` - **MDX adapter** (default): reads `web/content/blog/*.mdx`.
- `wordpress.ts` + `rank-math.ts` - **WordPress adapter**: `wp-json` REST, Zod-validated, SEO via Rank Math. Lift these two files to add a WordPress source.
- `create-cms-client.ts` - env-selected factory. Consumers call this, never an adapter.

SEO rides `post.seo` (ADR-NEXT-S07): `generateMetadata`, JSON-LD, and `sitemap.ts` read the contract - never a vendor API.

## Local WordPress backend (`server/`)

A throwaway WordPress + MariaDB stack so the WordPress adapter has something to talk to:

```bash
cd server
cp .env.example .env
docker compose up -d        # WordPress at http://localhost:8080
```

Then in `web/.env`: `CMS_CLIENT=wordpress` and `WORDPRESS_API_URL=http://localhost:8080`, and `cd web && pnpm dev` - the blog renders from WordPress through the same contract, no source changes (ADR-NEXT-S05). Setup details: [`server/README.md`](server/README.md).

## Commands

From `web/`, run through `make` (the command facade → `package.json` scripts):

```bash
cd web
make dev          # dev server
make build        # production build (standalone) - R-GATE-BUILD
make lint         # R-GATE-LINT
make typecheck    # R-GATE-TYPECHECK
make pre-commit   # all gates
```

## After cloning

1. Update `web/package.json` name, `docs/idea.md`, and `docs/vision.md`.
2. Replace the seed post in `web/content/blog/`; wire your CMS via `web/.env` + `server/`.
3. Pick a styling layer (`web/src/app/globals.css` is intentionally minimal - ADR-NEXT-S02).
4. Read `CLAUDE.md`, then `docs/adr/README.md` for the decision landscape.

## License

MIT - see [LICENSE](./LICENSE).

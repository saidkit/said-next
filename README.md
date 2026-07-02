# said-next — Standalone Next.js SAID Template

A composable, AI-native **Next.js 16** starter: RSC-first, contract-driven content, ships as a
standalone container. Self-contained — its own conventions, ADRs, scaffold, and AI development
guide (`CLAUDE.md`). The Next analog of [`said-ts`](../said-ts) (backend core) and
`said-web` (React SPA).

## Quickstart

```bash
git clone <your-fork> said-next
cd said-next
pnpm install
pnpm dev            # http://localhost:3000
```

Boots in **MDX mode** by default — the seed post in `content/blog/` renders through the CMS
contract, no backend required. Point it at WordPress with two env vars (below), same routes.

## What's included

### Docs spine (`docs/`)
- **`CLAUDE.md`** — AI development guide (entry point; thin orchestrator, progressive loading)
- **`conventions.md`** — code patterns, the RSC boundary, import rules
- **`idea.md` / `vision.md`** — project context templates
- **`adr/ADR-NEXT-S01..S09`** — System ADRs (repo structure, stack, features, service modules, DI, deployment, rendering/SEO, client state, error handling)
- **`features/` · `ux/` · `qa/`** — feature-spec + task-log stencils, UX shape specs, quality-gate checklists

### Runnable scaffold (`src/`)
- **`app/`** — routes: home, blog index + `[slug]`, `sitemap`/`robots`, `api/health`, `error`/`not-found`/`loading` boundaries
- **`features/blog/`** — the reference feature: `server/` loaders (RSC + `cache()`), prop-driven components
- **`lib/cms/`** — the **content contract** + adapters (see below)
- **`lib/env.ts` + `instrumentation.ts`** — boot-time env validation (fail-fast, ADR-NEXT-S06)

### The CMS library (`src/lib/cms/`) — copy-paste into any derived project
A single `CmsClient` contract with swappable adapters (ADR-NEXT-S04):

- `cms-client.ts` — the contract + domain types (`Post`, `Seo`, …). No provider dependency.
- `mdx.ts` — **MDX adapter** (default): reads `content/blog/*.mdx`.
- `wordpress.ts` + `rank-math.ts` — **WordPress adapter**: `wp-json` REST, Zod-validated, SEO via Rank Math. Lift these two files to add a WordPress source.
- `create-cms-client.ts` — env-selected factory. Consumers call this, never an adapter.

SEO rides `post.seo` (ADR-NEXT-S07): `generateMetadata`, JSON-LD, and `sitemap.ts` read the
contract — never a vendor API.

## Switching to WordPress

```bash
CMS_CLIENT=wordpress WORDPRESS_API_URL=https://cms.example.com pnpm dev
```

Same screens, real data. No source changes — the factory (ADR-NEXT-S05) selects the adapter at
load; the whole app depends on the contract, not the vendor.

## Commands

Run through `make` (the command facade → `package.json` scripts; see `Makefile`):

```bash
make dev          # dev server
make build        # production build (standalone) — R-GATE-BUILD
make lint         # R-GATE-LINT
make typecheck    # R-GATE-TYPECHECK
make pre-commit   # all gates
```

## After cloning

1. Update `package.json` name, `docs/idea.md`, and `docs/vision.md`.
2. Replace the seed post in `content/blog/`; wire your real CMS via `CMS_CLIENT` / `WORDPRESS_API_URL`.
3. Pick a styling layer (`src/app/globals.css` is intentionally minimal — ADR-NEXT-S02).
4. Read `CLAUDE.md`, then `docs/adr/README.md` for the decision landscape.

## License

MIT — see [LICENSE](./LICENSE).

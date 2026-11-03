# ADR-NEXT-S07: Rendering, Performance & SEO (Next.js SSR)

**Date:** 2026-06-29
**Status:** Accepted
**Class:** System (portable across Next.js SSR web projects)

## Problem

A Next.js SSR site must decide, **per route**, how fresh its content is — built once, periodically revalidated, or rendered per request — and how its **SEO metadata** is produced. Two failure modes recur:

- **Rendering drift.** Without a default, routes slide into all-dynamic SSR (slow, no static optimization) or, conversely, a static export that can't revalidate CMS content.
- **SEO coupling.** Metadata gets welded to one CMS's API inside route files (`generateMetadata` calling `wp-json` directly), so the site can't swap content sources and the starter can't ship CMS-agnostic.

**Context:**
- App Router + RSC by default; `fetch` is **uncached by default** in Next 16; Turbopack build.
- Content reaches the UI through a **service-module contract** (ADR-NEXT-S06) — MDX today, a CMS tomorrow.
- The native **Metadata API** (`generateMetadata`, `sitemap.ts`, `robots.ts`) is the SEO surface — no vendor SEO library needed.

## Decision

**Static-first rendering with deliberate opt-in to freshness; SEO as a field-set on the content
contract, populated by adapters; progressive loading via file-based boundaries.**

### Rules

1. **Static by default.** Owned, build-time pages are SSG; assert it with `export const dynamic = "force-static"` when it matters.
2. **ISR for external / CMS content.** Pages backed by a live source use `export const revalidate = N` + on-demand `revalidatePath` / `revalidateTag` — SSG-with-revalidation, not dynamic.
3. **Dynamic only when genuinely per-request.** Reach for `export const dynamic = "force-dynamic"` (or `await cookies()` / `await headers()` — async in Next 16) only when the response truly varies per request (auth, personalization).
4. **SEO rides the content contract.** The S04 `ContentItem` carries a `seo` field-set — `{ title, description, ogImage?, canonical?, jsonLd? }`. `generateMetadata`, the JSON-LD `<script>`, `sitemap.ts`, and `robots.ts` read **the contract**, never a CMS/vendor API.
5. **Adapters populate `seo`, the template hides the vendor.** The MDX adapter fills `seo` from frontmatter (ships in the template); a CMS adapter fills the **same** fields behind its S04 service module. Swapping the source touches the adapter, not the metadata code.
6. **`sitemap.ts` / `robots.ts` are generated** from the content contract + route map, not hand-maintained. Set `metadataBase` once in the root layout; map `canonical → alternates.canonical`, `og → openGraph`.
7. **Progressive loading is file-based.** `loading.tsx` per segment (instant Suspense fallback); scoped `<Suspense>` around slow subtrees so the shell streams first; `next/dynamic` for heavy client islands below the fold. Boundaries pair with the error model (ADR-NEXT-S09).

### SEO seam — worked examples

```ts
// app/blog/[slug]/page.tsx — generateMetadata reads the CONTRACT, not a CMS
import { loadPost } from "@/features/blog/server/load-post"   // returns ContentItem (ADR-NEXT-S06)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = await loadPost((await params).slug)
  if (!post) return {}
  const { title, description, ogImage, canonical } = post.seo
  return {
    title, description,
    openGraph: ogImage ? { title, description, images: [ogImage] } : { title, description },
    alternates: canonical ? { canonical } : undefined,
  }
}
```

```ts
// lib/content/mdx-adapter.ts — the MDX adapter fills post.seo from frontmatter (ships)
function toSeo(frontmatter: Frontmatter, slug: string): ContentItem["seo"] {
  return {
    title: frontmatter.seoTitle ?? frontmatter.title,
    description: frontmatter.excerpt,
    ogImage: frontmatter.cover,
    canonical: `/blog/${slug}`,
    jsonLd: articleJsonLd(frontmatter, slug),   // BlogPosting schema
  }
}
// A CMS adapter maps its provider head tags to the same shape. Vendor stays in the adapter.
```

```ts
// app/sitemap.ts — generated from the content contract + route map
import type { MetadataRoute } from "next"
import { loadPosts } from "@/features/blog/server/load-posts"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await loadPosts()
  return [
    { url: "/", priority: 1 },
    ...posts.map((p) => ({ url: `/blog/${p.slug}`, lastModified: p.updatedAt })),
  ]
}
```

## Alternatives considered

**Chosen:**
- **Static-first + ISR-for-CMS + contract-driven SEO** — fast by default; one CMS-agnostic SEO seam; sources swap behind adapters

**Rejected:**
- **All-dynamic SSR** — forfeits static optimization; slow TTFB for content that rarely changes
- **Static export (`output: "export"`)** — no ISR, Server Actions, or on-demand revalidation; CMS content can't refresh
- **SEO welded to the CMS API inside `generateMetadata`** — couples the template to one vendor; defeats the S04 contract; can't swap MDX↔CMS
- **A vendor SEO library (`next-seo`, etc.)** — the App Router Metadata API + a contract field-set is sufficient; no extra dep

## Consequences

**Positive:** fast-by-default rendering; a single SEO seam the whole site reads; CMS-agnostic —
the template ships MDX, a project adds a CMS adapter without touching metadata code; sitemap/robots
stay in sync with content automatically.

**Negative:** every content source needs a small adapter mapping its native fields → `post.seo`;
discipline (and code review) to keep raw vendor SEO calls out of routes. `jsonLd` shape is the
author's responsibility per content type.

## Related

- **Content contract:** [ADR-NEXT-S06](ADR-NEXT-S06-pure-service-modules.md) — `post.seo` is a field-set on the `ContentItem` these service modules return; adapters populate it.
- **Layout:** [ADR-NEXT-S01](ADR-NEXT-S01-repository-structure.md) — routes/layout this posture renders.
- **Boundaries:** [ADR-NEXT-S09](ADR-NEXT-S09-error-handling.md) — `loading.tsx` / `<Suspense>` pair with the error containment layers.
- **Instance:** the consuming project picks the concrete route map, per-route rendering choices, and the CMS adapter that fills `post.seo`.
- **Conventions:** `../conventions.md` (*Rendering posture*, *Data fetching & caching*).

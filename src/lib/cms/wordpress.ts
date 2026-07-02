/**
 * WordPress (headless) adapter (ADR-NEXT-S04) — REST to `wp-json/wp/v2`, mapping
 * WP response shapes → the domain `Post`. Responses are Zod-validated at this
 * seam (schema drift throws a typed error, ADR-NEXT-S09). SEO comes from Rank
 * Math (`rank-math.ts`). Selected by `CMS_CLIENT=wordpress`; reads
 * `WORDPRESS_API_URL`. Copy-paste this file + `rank-math.ts` into a derived
 * project to add a WordPress source — nothing else changes.
 */
import { z } from "zod";
import type { CmsClient, ListParams, ListResult, Post, PostSummary, Seo } from "./cms-client";
import { fetchRankMathHead, parseRankMathHead } from "./rank-math";

const WpPost = z.object({
  id: z.number(),
  slug: z.string(),
  date_gmt: z.string(),
  modified_gmt: z.string().optional(),
  link: z.string().url().optional(),
  title: z.object({ rendered: z.string() }),
  excerpt: z.object({ rendered: z.string() }),
  content: z.object({ rendered: z.string() }),
  _embedded: z
    .object({
      author: z.array(z.object({ name: z.string() })).optional(),
      "wp:featuredmedia": z.array(z.object({ source_url: z.string() })).optional(),
      "wp:term": z.array(z.array(z.object({ name: z.string(), taxonomy: z.string() }))).optional(),
    })
    .optional(),
});
type WpPost = z.infer<typeof WpPost>;

const strip = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/&#8230;|\[…\]|\[&hellip;\]/g, "…").replace(/\s+/g, " ").trim();

export class WordpressClient implements CmsClient {
  constructor(private readonly apiBase: string) {
    if (!apiBase) throw new Error("WordpressClient: WORDPRESS_API_URL is required");
  }

  private endpoint(pathname: string) {
    return `${this.apiBase.replace(/\/$/, "")}/wp-json/wp/v2/${pathname}`;
  }

  private toSummary(p: WpPost): PostSummary {
    const terms = p._embedded?.["wp:term"]?.flat() ?? [];
    return {
      slug: p.slug,
      title: strip(p.title.rendered),
      excerpt: strip(p.excerpt.rendered),
      date: `${p.date_gmt}Z`,
      author: p._embedded?.author?.[0]?.name,
      coverImage: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url,
      categories: terms.filter((t) => t.taxonomy === "category").map((t) => t.name),
    };
  }

  private async seoFor(p: WpPost, summary: PostSummary): Promise<Seo> {
    const fallback: Seo = { title: summary.title, description: summary.excerpt, canonical: `/blog/${p.slug}` };
    if (!p.link) return fallback;
    const rm = parseRankMathHead(await fetchRankMathHead(p.link, this.apiBase));
    return { ...fallback, ...rm, canonical: rm.canonical ?? fallback.canonical };
  }

  async listPosts(params: ListParams = {}): Promise<ListResult<PostSummary>> {
    const q = new URLSearchParams({ _embed: "1", per_page: String(params.perPage ?? 10), page: String(params.page ?? 1) });
    if (params.category) q.set("categories", params.category);
    const res = await fetch(this.endpoint(`posts?${q}`), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`WordPress listPosts failed: ${res.status}`);
    const total = Number(res.headers.get("X-WP-Total") ?? 0);
    const raw = z.array(WpPost).parse(await res.json());
    return { items: raw.map((p) => this.toSummary(p)), total };
  }

  async getPost(slug: string): Promise<Post | null> {
    const res = await fetch(this.endpoint(`posts?_embed=1&slug=${encodeURIComponent(slug)}`), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`WordPress getPost failed: ${res.status}`);
    const p = z.array(WpPost).parse(await res.json())[0];
    if (!p) return null;
    const summary = this.toSummary(p);
    return {
      ...summary,
      bodyFormat: "html",
      body: p.content.rendered,
      seo: await this.seoFor(p, summary),
      updatedAt: `${p.modified_gmt ?? p.date_gmt}Z`,
    };
  }

  async listSlugs(): Promise<string[]> {
    const res = await fetch(this.endpoint("posts?per_page=100&_fields=slug"), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`WordPress listSlugs failed: ${res.status}`);
    return z.array(z.object({ slug: z.string() })).parse(await res.json()).map((p) => p.slug);
  }
}

/**
 * The CMS contract (ADR-NEXT-S04). Routes, features, and components depend on
 * THIS interface + the factory — never on a provider SDK, raw `fetch`, or a
 * provider response shape. Adapters (MDX, WordPress) implement it; the factory
 * (`create-cms-client.ts`) selects one from env. Swapping the source is a
 * localized change: write an adapter, no consumer touched.
 *
 * This file has NO provider dependency — pure types + the interface.
 */

/**
 * SEO field-set carried on every post (ADR-NEXT-S07). Adapters populate it from
 * their native source (MDX frontmatter, WordPress Rank Math). `generateMetadata`,
 * the JSON-LD `<script>`, and `sitemap.ts` read `post.seo` — never a vendor API.
 */
export interface Seo {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
  /** Injected as `<script type="application/ld+json">`. */
  jsonLd?: Record<string, unknown>;
}

export interface PostSummary {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO 8601
  author?: string;
  coverImage?: string;
  categories: string[];
}

export interface Post extends PostSummary {
  /** Body source: `mdx` → compile with `next-mdx-remote`; `html` → sanitized CMS HTML. */
  bodyFormat: "mdx" | "html";
  body: string;
  seo: Seo;
  /** ISO — used by `sitemap.ts` `lastModified`. */
  updatedAt?: string;
}

export interface ListParams {
  page?: number;
  perPage?: number;
  category?: string;
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

/** Every content source (MDX, WordPress, …) implements this one interface. */
export interface CmsClient {
  listPosts(params?: ListParams): Promise<ListResult<PostSummary>>;
  getPost(slug: string): Promise<Post | null>;
  /** Slugs for `generateStaticParams` / `sitemap.ts`. */
  listSlugs(): Promise<string[]>;
}

/**
 * MDX adapter (ADR-NEXT-S04) — the default content source that ships with the
 * template. Reads `content/blog/*.mdx`, maps frontmatter → `Post` + `Seo`.
 * No network; deterministic; the reference implementation of `CmsClient`.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { CmsClient, ListParams, ListResult, Post, PostSummary, Seo } from "./cms-client";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

type Frontmatter = {
  title?: string;
  date?: string | Date; // YAML parses an unquoted date into a Date, not a string
  author?: string;
  excerpt?: string;
  coverImage?: string;
  categories?: string[] | string;
  seoTitle?: string;
  canonical?: string;
};

function toCategories(c: Frontmatter["categories"]): string[] {
  if (!c) return [];
  return Array.isArray(c) ? c : String(c).split(",").map((s) => s.trim()).filter(Boolean);
}

// gray-matter/YAML parses an unquoted `date: 2026-01-01` into a Date (not a string).
// Normalize any date-ish value to an ISO string so `post.date` is always a string.
function toIsoDate(d: string | Date | undefined): string | undefined {
  if (d == null || d === "") return undefined;
  const parsed = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(parsed.getTime()) ? String(d) : parsed.toISOString();
}

function toSeo(fm: Frontmatter, s: PostSummary): Seo {
  return {
    title: fm.seoTitle ?? s.title,
    description: s.excerpt,
    ogImage: s.coverImage,
    canonical: fm.canonical ?? `/blog/${s.slug}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: s.title,
      datePublished: s.date,
      ...(s.author ? { author: { "@type": "Person", name: s.author } } : {}),
    },
  };
}

function parse(slug: string, raw: string): Post {
  const { data, content } = matter(raw);
  const fm = data as Frontmatter;
  const summary: PostSummary = {
    slug,
    title: fm.title ?? slug,
    excerpt: fm.excerpt ?? content.replace(/[#>*_`~-]/g, "").replace(/\s+/g, " ").trim().slice(0, 200),
    date: toIsoDate(fm.date) ?? new Date(0).toISOString(), // epoch default — deterministic
    author: fm.author,
    coverImage: fm.coverImage,
    categories: toCategories(fm.categories),
  };
  return { ...summary, bodyFormat: "mdx", body: content, seo: toSeo(fm, summary), updatedAt: toIsoDate(fm.date) };
}

async function files(): Promise<string[]> {
  try {
    return (await readdir(BLOG_DIR)).filter((f) => /\.mdx?$/.test(f));
  } catch {
    return []; // no content/ yet — empty blog, not a crash
  }
}

export class MdxClient implements CmsClient {
  async listPosts(params: ListParams = {}): Promise<ListResult<PostSummary>> {
    const all: Post[] = [];
    for (const f of await files()) {
      all.push(parse(f.replace(/\.mdx?$/, ""), await readFile(path.join(BLOG_DIR, f), "utf8")));
    }
    let items: PostSummary[] = all.sort((a, b) => (a.date > b.date ? -1 : 1));
    if (params.category) items = items.filter((p) => p.categories.includes(params.category!));
    const total = items.length;
    if (params.page && params.perPage) {
      const start = (params.page - 1) * params.perPage;
      items = items.slice(start, start + params.perPage);
    }
    return { items, total };
  }

  async getPost(slug: string): Promise<Post | null> {
    for (const ext of [".mdx", ".md"]) {
      try {
        return parse(slug, await readFile(path.join(BLOG_DIR, `${slug}${ext}`), "utf8"));
      } catch {
        // try next extension
      }
    }
    return null;
  }

  async listSlugs(): Promise<string[]> {
    return (await files()).map((f) => f.replace(/\.mdx?$/, ""));
  }
}

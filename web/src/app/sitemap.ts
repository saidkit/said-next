import type { MetadataRoute } from "next";
import { loadPosts } from "@/features/blog";
import { serverEnv } from "@/lib/env";

// Generated from the content contract + route map (ADR-NEXT-S07), not hand-maintained.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = serverEnv().SITE_URL.replace(/\/$/, "");
  const posts = await loadPosts();
  return [
    { url: base, priority: 1 },
    { url: `${base}/blog`, priority: 0.8 },
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.date })),
  ];
}

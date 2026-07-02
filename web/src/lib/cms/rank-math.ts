/**
 * Rank Math SEO for the WordPress adapter (ADR-NEXT-S07 §5). Fetches the
 * plugin-rendered `<head>` for a URL and maps it into the `Seo` field-set —
 * the vendor stays inside this file; the rest of the app reads `post.seo`.
 *
 * Rank Math exposes: `/wp-json/rankmath/v1/getHead?url=…` → `{ head: "<title>…" }`.
 */
import type { Seo } from "./cms-client";

export async function fetchRankMathHead(pageUrl: string, apiBase: string): Promise<string> {
  const endpoint = `${apiBase.replace(/\/$/, "")}/wp-json/rankmath/v1/getHead?url=${encodeURIComponent(pageUrl)}`;
  const res = await fetch(endpoint, { next: { revalidate: 3600 } });
  if (!res.ok) return "";
  const data = (await res.json()) as { head?: string };
  return data.head ?? "";
}

/** Pull title / description / canonical / OG image / JSON-LD out of a `<head>` blob. */
export function parseRankMathHead(head: string): Partial<Seo> {
  if (!head) return {};
  const meta = (key: string, attr: "name" | "property" = "name") =>
    new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, "i").exec(head)?.[1];

  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(head)?.[1];
  const canonical = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i.exec(head)?.[1];

  const jsonLdRaw = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i.exec(head)?.[1];
  let jsonLd: Record<string, unknown> | undefined;
  if (jsonLdRaw) {
    try { jsonLd = JSON.parse(jsonLdRaw); } catch { jsonLd = undefined; }
  }

  return {
    title: title?.trim(),
    description: meta("description"),
    ogImage: meta("og:image", "property"),
    canonical,
    jsonLd,
  };
}

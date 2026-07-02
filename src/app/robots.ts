import type { MetadataRoute } from "next";
import { serverEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = serverEnv().SITE_URL.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
  };
}

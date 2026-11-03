/**
 * CMS factory (ADR-NEXT-S06 / S05) — the DI seam. Selects an adapter from env
 * and returns it typed as the `CmsClient` contract. Consumers call THIS, never
 * an adapter constructor. Dynamic `import()` keeps each adapter's deps out of
 * bundles that don't use it (e.g. `zod` + WordPress stay out of MDX-only builds).
 */
import type { CmsClient } from "./cms-client";

export type CmsType = "mdx" | "wordpress";

export async function createCmsClient(
  type: CmsType = (process.env.CMS_CLIENT as CmsType) ?? "mdx",
): Promise<CmsClient> {
  switch (type) {
    case "wordpress": {
      const { WordpressClient } = await import("./wordpress");
      return new WordpressClient(process.env.WORDPRESS_API_URL ?? "");
    }
    case "mdx": {
      const { MdxClient } = await import("./mdx");
      return new MdxClient();
    }
    default:
      throw new Error(`Unknown CMS client: ${type}`);
  }
}

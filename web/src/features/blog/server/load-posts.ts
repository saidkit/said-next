import { cache } from "react";
import { createCmsClient } from "@/lib/cms";

/**
 * Blog data resolution (ADR-NEXT-S03 `server/`). Fetched on the server, deduped
 * per-request with React `cache()`, passed to components as props. Depends on the
 * `CmsClient` contract via the factory — never on a specific adapter.
 */
export const loadPosts = cache(async () => {
  const cms = await createCmsClient();
  const { items } = await cms.listPosts({ perPage: 20 });
  return items;
});

export const loadPost = cache(async (slug: string) => {
  const cms = await createCmsClient();
  return cms.getPost(slug);
});

export const loadSlugs = cache(async () => {
  const cms = await createCmsClient();
  return cms.listSlugs();
});

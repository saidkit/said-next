import "server-only";
import { z } from "zod";

/**
 * Runtime environment (ADR-NEXT-S06). Validated ONCE at boot via
 * `src/instrumentation.ts` — a missing/malformed value crashes startup, not a
 * request. `import "server-only"` hard-fails if this is pulled into a client
 * bundle. Build-time `NEXT_PUBLIC_*` constants are environment-invariant and
 * belong in a separate client-safe module, never here.
 */
const ServerEnv = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    CMS_CLIENT: z.enum(["mdx", "wordpress"]).default("mdx"),
    WORDPRESS_API_URL: z.string().url().optional(),
    SITE_URL: z.string().url().default("http://localhost:3000"),
    REVALIDATE_SECRET: z.string().min(1).optional(),
  })
  .refine((e) => e.CMS_CLIENT !== "wordpress" || Boolean(e.WORDPRESS_API_URL), {
    message: "WORDPRESS_API_URL is required when CMS_CLIENT=wordpress",
    path: ["WORDPRESS_API_URL"],
  });

export type ServerEnv = z.infer<typeof ServerEnv>;

let cached: ServerEnv | undefined;

/** Memoized; first call is `instrumentation.register()` at boot, so a bad config fails startup. */
export function serverEnv(): ServerEnv {
  return (cached ??= ServerEnv.parse(process.env));
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // self-contained Node server, container-deployable (ADR-NEXT-S10)
  // Trace non-JS files read at request time so the standalone build ships them (ADR-NEXT-S10 R5).
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
  compress: true,
  // Critical-CSS inlining (Critters) — trims render-blocking CSS on first paint.
  experimental: {
    optimizeCss: true,
  },
  images: {
    // WebP only. AVIF needs `sharp` for a valid encode — without it the dev
    // optimizer's wasm AVIF is malformed and Safari refuses it (broken image).
    // (Install `sharp` in production to re-enable AVIF.)
    formats: ["image/webp"],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  // Critical-CSS inlining (Critters) — trims render-blocking CSS on first paint.
  experimental: {
    optimizeCss: true,
  },
  images: {
    // WebP only. AVIF needs `sharp` for a valid encode — without it the dev
    // optimizer's wasm AVIF is malformed and Safari refuses it (broken image).
    // WebP from the same encoder is standard VP8 and renders everywhere.
    // (Install `sharp` in production to re-enable AVIF.)
    formats: ["image/webp"],
  },
};

export default nextConfig;

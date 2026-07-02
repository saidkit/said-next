import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Straight apostrophes are intentional in prose copy; the
      // escaped-entity rule is pure noise (text renders identically).
      "react/no-unescaped-entities": "off",
      // A vendored design system drives layout with plain <img> (cover/sticker art sized
      // by CSS); next/image isn't a fit for these decorative fills.
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;

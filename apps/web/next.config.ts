import type { NextConfig } from "next";

import { contentSecurityPolicy } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  async rewrites() {
    const origin = new URL(process.env.API_BASE_URL || "http://127.0.0.1:8000");
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    ) {
      throw new Error("API_BASE_URL must be an HTTP(S) origin without credentials or a path.");
    }
    // A bare path gets its own rule: on Vercel an empty `:path*` becomes a trailing slash,
    // which the API answers with a redirect to its own origin that the browser cannot follow.
    const prefixed = ["trips", "reports", "planning", "reviewer", "routing"].flatMap((name) => [
      { source: `/api/${name}`, destination: `${origin.origin}/${name}` },
      { source: `/api/${name}/:path+`, destination: `${origin.origin}/${name}/:path+` },
    ]);
    return [
      ...prefixed,
      { source: "/api/feedback", destination: `${origin.origin}/feedback` },
      { source: "/api/network/streets", destination: `${origin.origin}/network/streets` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy(process.env.NODE_ENV === "development"),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

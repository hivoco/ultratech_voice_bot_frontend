import type { NextConfig } from "next";

// Public site URL for the canonical link, social cards, robots.txt and sitemap. Fixed into the build
// because link-preview bots (WhatsApp, Facebook, X…) get a fresh server render instead of the static
// page: read at run time, a server without SITE_URL would send them a localhost image URL.
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = process.env.SITE_URL || (vercelHost ? `https://${vercelHost}` : "");
if (process.env.NODE_ENV === "production" && (!siteUrl || /localhost|127\.0\.0\.1/.test(siteUrl))) {
  console.warn("[seo] SITE_URL is not a public URL: social link previews will not show the image.");
}

const nextConfig: NextConfig = {
  env: { SITE_URL: siteUrl || "http://localhost:3000" },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // The floating dev badge sits on top of the composer's camera button.
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The page asks for mic + camera, so it must never be framed (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
          // Browsers ignore this on http, so local development is unaffected.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
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

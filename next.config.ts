import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundles only the packages actually imported into .next/standalone,
  // instead of shipping all of node_modules. Turns a ~700MB deploy into
  // ~80MB, which is what makes the Docker image small enough to rebuild
  // and roll back comfortably on a small VPS.
  output: "standalone",

  // DATA_SOURCE decides which branch lib/media.ts takes when it builds a
  // URL, and four components that call it are "use client". In the
  // browser `process.env.DATA_SOURCE` is undefined, so every branch fell
  // through to the mock one and the admin showed /api/mock-media/... for
  // files actually served from /api/media/... — a URL that 404s if copied
  // out of the media library.
  //
  // Inlined here rather than renamed to NEXT_PUBLIC_DATA_SOURCE: the name
  // is read by the server in lib/queries/index.ts and set in every .env
  // and compose file, so renaming it would mean changing deployment
  // config on two live servers to fix a client-side bug.
  env: {
    DATA_SOURCE: process.env.DATA_SOURCE ?? "",
  },

  images: {
    // Next's default deviceSizes go up to 3840 (4K). On a 4-core VPS that
    // meant a page with 16 images asking sharp for six 4K resizes at once,
    // which took ~15s wall-clock — the images, not the HTML, were the slow
    // part of a page load. Nothing here is displayed above ~1600 CSS px,
    // so the larger entries only ever cost CPU.
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],

    // Optimized variants are immutable once produced (the source path
    // carries a timestamp), so they can be cached for a year instead of
    // Next's 60-second default, which made the work repeat all day.
    minimumCacheTTL: 31536000,

    formats: ["image/webp"],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  async headers() {
    return [
      {
        // Next serves the favicon with `max-age=0, must-revalidate`, so the
        // browser re-requested it on every single page load — a round trip
        // to the server before the tab icon could paint. It changes about
        // never, so it is cached for a day; a rename is how it would be
        // busted if it ever did change.
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;

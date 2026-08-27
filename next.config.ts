import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundles only the packages actually imported into .next/standalone,
  // instead of shipping all of node_modules. Turns a ~700MB deploy into
  // ~80MB, which is what makes the Docker image small enough to rebuild
  // and roll back comfortably on a small VPS.
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;

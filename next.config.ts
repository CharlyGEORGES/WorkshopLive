import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      // Les pages de visionnage ne doivent pas être indexées : le lien fait office de clé.
      source: "/s/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    },
  ],
};

export default nextConfig;

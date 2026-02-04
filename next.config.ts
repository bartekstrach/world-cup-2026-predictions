import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
    dangerouslyAllowSVG: true, // Allow data URLs for base64 previews
    unoptimized: true, // For base64 data URLs
  },
};

export default nextConfig;

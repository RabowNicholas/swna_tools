import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: '/Users/nicholasrabow/Desktop/swna/swna_tools'
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ['sharp'],
};

export default nextConfig;

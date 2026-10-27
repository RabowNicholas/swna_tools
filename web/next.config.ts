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
  async redirects() {
    return [
      // Scan to PDF became Build PDF when it learned to combine PDFs
      { source: "/forms/scan-to-pdf", destination: "/forms/build-pdf", permanent: true },
    ];
  },
};

export default nextConfig;

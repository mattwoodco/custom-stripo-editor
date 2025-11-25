import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  devIndicators: false,
  reactStrictMode: false, // Disable StrictMode to prevent double mounting (causes shadow DOM conflicts with Stripo)
  async rewrites() {
    return [
      {
        source: "/assets/:path*",
        destination: "https://plugins.stripo.email/assets/:path*",
      },
      // Handle missing source map files gracefully (return 204 instead of 404)
      // This prevents 404 errors in logs from third-party scripts like Stripo
      {
        source: "/:path*.map",
        destination: "/api/source-maps/:path*.map",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Content-Type",
            value: "text/css; charset=utf-8",
          },
        ],
      },
      {
        source: "/assets/i18n/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Content-Type",
            value: "application/json; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

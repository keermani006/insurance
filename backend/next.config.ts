import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable x-powered-by header to avoid leaking framework info
  poweredByHeader: false,

  // No public image domains needed (backend only)
  images: {
    unoptimized: true,
  },

  // Strict API body size limit — enforced here AND in route handlers
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-XSS-Protection", value: "0" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'",
          },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;

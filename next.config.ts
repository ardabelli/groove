import type { NextConfig } from "next";

// Proxies /api/* through this Next.js app's own origin to the separate Express backend,
// so the browser only ever talks to one domain. Without this, the session cookie set by
// the backend's origin is a cross-site (third-party) cookie from the frontend's page,
// which Safari always blocks and Chrome increasingly blocks — breaking login for real users.
const BACKEND_ORIGIN = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
      {
        protocol: "https",
        hostname: "**.scdn.co",
      },
    ],
  },
};

export default nextConfig;

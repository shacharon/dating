import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  /**
   * Proxy `/api/*` to dating-api so the browser can call same-origin `/api/...`
   * (session `SameSite=Lax` cookies work). Override target with `API_PROXY_TARGET`.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

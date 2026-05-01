import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const apiProxyTarget =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  /** Avoid picking a parent folder when multiple lockfiles exist (Turbopack workspace root). */
  turbopack: {
    root: projectRoot,
  },
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

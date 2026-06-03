import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const apiProxyTarget =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  /** socket.io handshake must not be 308-redirected between `/socket.io` and `/socket.io/`. */
  skipTrailingSlashRedirect: true,
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
      // Engine path is exactly `/socket.io` (query only) — `:path*` does not match that URL.
      {
        source: "/socket.io",
        destination: `${apiProxyTarget}/socket.io`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${apiProxyTarget}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;

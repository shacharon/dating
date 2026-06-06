import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Prefer 127.0.0.1 over localhost — avoids intermittent IPv6/proxy failures on Windows. */
const apiProxyTarget =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ?? "http://127.0.0.1:3001";

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

const uploadEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN?.trim());

const sentryConfig = process.env.NODE_ENV === 'production' ? withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: !uploadEnabled,
  },
}) : nextConfig;

export default sentryConfig;
